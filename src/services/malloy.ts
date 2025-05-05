import { SingleConnectionRuntime } from "@malloydata/malloy";
import type { StructDef } from "@malloydata/malloy";
import { TrinoPrestoConnection, BaseRunner } from "@malloydata/db-trino";
import { executeQuery } from "./api";
import { nanoid } from "nanoid";

class RemoteTrinoRunner implements BaseRunner {
  async runSQL(
    sql: string,
    limit: number | undefined,
    _abortSignal?: AbortSignal,
  ): Promise<{
    rows: unknown[][];
    columns: { name: string; type: string; error?: string }[];
    error?: string;
    profilingUrl?: string;
  }> {
    console.log("RemoteTrinoRunner.runSQL", sql);
    const result = await executeQuery(sql, { id: "TRINO-RISK" });
    console.log("RemoteTrinoRunner.runSQL", result);

    if (result.error) {
      return {
        rows: [],
        columns: [],
        error: JSON.stringify(result.error),
      };
    }
    const columns = [];
    for (let i = 0; i < result.columns.length; i++) {
      columns.push({
        name: result.columns[i],
        type: result.types[i],
      });
    }

    const outputRows: unknown[][] = [];
    for (const row of result.rows) {
      if (!limit || outputRows.length < limit) {
        const outputrow = [];
        for (const col of columns) {
          outputrow.push(row[col.name]);
        }
        outputRows.push(outputrow as unknown[]);
      }
    }

    return { rows: outputRows, columns };
  }
}

export class RemoteTrinoConnection extends TrinoPrestoConnection {
  constructor(arg: string) {
    super(arg, new RemoteTrinoRunner(), {});
  }

  override get dialectName(): string {
    return "trino";
  }

  protected async fillStructDefForSqlBlockSchema(
    sql: string,
    structDef: StructDef,
  ): Promise<void> {
    const tmpQueryName = `myMalloyQuery${nanoid().replace(/-/g, "")}`;
    await this.executeAndWait(`PREPARE ${tmpQueryName} FROM ${sql}`);
    await this.loadSchemaForSqlBlock(
      `DESCRIBE OUTPUT ${tmpQueryName}`,
      structDef,
      `query ${sql.substring(0, 50)}`,
    );
  }
}

export async function runMalloyQuery(query: string): Promise<any> {
  console.log("Running Malloy query", query);
  const connection = new RemoteTrinoConnection("trino");
  const runtime = new SingleConnectionRuntime({ connection: connection });
  const res = runtime.loadQuery(query);
  const result = await res.run();
  console.log("Malloy result", result);
  return result;
}
