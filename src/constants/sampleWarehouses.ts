import { SampleWarehouse } from "../types";

export const SAMPLE_WAREHOUSES: SampleWarehouse[] = [
  {
    id: "SAMPLE-4",
    name: "Meteorite Landings",
    description:
      "An extensive dataset of meteorite falls and finds across the globe in DuckDB table `meteorite`, including detailed information about their mass, composition, classification, and discovery circumstances.",
    schema: "main",
  },
  {
    id: "TRINO-RISK",
    name: "Market Risk",
    description: `A sample database of market risk data for a financial institution particularly risk on individual positions and account rollup data.
      The data is in Trino catalog \`memory\`, schema \`default\` with tables \`risk\` and \`account\`.

      A malloy data model for this warehouse is (this is not loaded by default but must be included in queries)

      \`\`\`malloy
      source: accounts is trino.table('memory.default.account') extend {
          primary_key: mnemonic
      }

      source: risk is trino.table('memory.default.risk') extend {
          join_one: account is accounts on book = account.mnemonic
      }

      source: riskbystrategy is risk -> {
          group_by: account.strategy
          aggregate:
              mtm is sum(mtm),
              mtm_strategy is all(sum(mtm), strategy)
              cr01 is sum(cr01),
              jtd is sum(jtd)
          order_by: strategy
      }
      \`\`\`

      Sample query (including necessary context from above):

      \`\`\`malloy
      source: accounts is trino.table('memory.default.account') extend { primary_key: mnemonic }

      source: risk is trino.table('memory.default.risk') extend { join_one: account is accounts on book = account.mnemonic }

      source: riskbystrategy is risk -> {
        group_by: account.strategy
        aggregate:
          mtm is sum(mtm),
          mtm_strategy is all(sum(mtm), strategy),
          cr01 is sum(cr01),
          jtd is sum(jtd)
        order_by: strategy
      }

      run: riskbystrategy -> {select: *}
      \`\`\`
      `,
    schema: "default",
  },
];
