import { RedshiftCredentials, SqlQueryResult } from '../types';
import { executeQuery } from './api';

const MAX_CONTENT_LENGTH = 25000;
const TRIM_MESSAGE = '\n\n[Content has been trimmed due to length]';

function trimSqlResult(result: SqlQueryResult): SqlQueryResult {
  if (!result.error && result.rows && Array.isArray(result.rows)) {
    // Convert the result to a string representation to check length
    const resultString = result.rows.map(row => 
      (result.columns || []).map(col => row[col]?.toString() || 'null').join('|')
    ).join('\n');

    if (resultString.length > MAX_CONTENT_LENGTH) {
      // Calculate how many rows we can keep while staying under the limit
      let totalLength = 0;
      let rowsToKeep = 0;
      const rows = result.rows.slice();

      for (const row of rows) {
        const rowString = (result.columns || []).map(col => row[col]?.toString() || 'null').join('|') + '\n';
        if (totalLength + rowString.length > MAX_CONTENT_LENGTH) {
          break;
        }
        totalLength += rowString.length;
        rowsToKeep++;
      }

      return {
        columns: result.columns || [],
        rows: result.rows.slice(0, rowsToKeep),
        error: `Query returned ${result.rows.length} rows, showing first ${rowsToKeep} rows${TRIM_MESSAGE}`
      };
    }
  }
  return {
    columns: result.columns || [],
    rows: result.rows || [],
    error: result.error
  };
}

export async function executeSqlQuery(
  credentials: RedshiftCredentials | { id: string } | null,
  query: string,
  signal?: AbortSignal
): Promise<SqlQueryResult> {
  const result = await executeQuery(query, credentials, signal);
  return trimSqlResult(result);
}

export async function testRedshiftConnection(
  credentials: RedshiftCredentials,
  signal?: AbortSignal
): Promise<SqlQueryResult> {
  try {
    const query = `
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema = '${credentials.schema || 'public'}'
ORDER BY table_name;
    `;
    
    const result = await executeQuery(query, credentials, signal);
    return trimSqlResult(result);
  } catch (error) {
    console.error('Connection test failed:', error);
    
    return {
      columns: [],
      rows: [],
      error: error instanceof Error 
        ? error.message 
        : 'Connection test failed. Please check your credentials.'
    };
  }
}