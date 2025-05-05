// Tool configuration for the entire application
export const TOOLS_CONFIG = {
  "exec-sql": {
    enabled: true,
    definition: {
      type: "function",
      function: {
        name: "exec-sql",
        description: "Execute a SQL query against a DuckDB or Trino database",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description:
                "The SQL query to execute, without trailing semicolon",
            },
          },
          required: ["code"],
        },
      },
    },
  },
  "exec-js": {
    enabled: true,
    definition: {
      type: "function",
      function: {
        name: "exec-js",
        description:
          "Execute JavaScript code to analyze data and create visualizations",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The JavaScript code to execute",
            },
            data: {
              type: "string",
              description: "JSON string of data to analyze",
            },
          },
          required: ["code"],
        },
      },
    },
  },
  "exec-malloy": {
    enabled: true,
    definition: {
      type: "function",
      function: {
        name: "exec-malloy",
        description: "Execute a Malloy query against the connected warehouse",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The Malloy query to execute",
            },
          },
          required: ["query"],
        },
      },
    },
  },
};