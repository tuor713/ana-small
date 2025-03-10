export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCallRequest[];
  tool_call_id?: string;
  name?: string;
  result?: SqlQueryResult; // Add this to store the full result
}

export interface ToolCallRequest {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface RedshiftCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
  name?: string;
  description?: string;
}

export interface UserWarehouse extends RedshiftCredentials {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  openaiApiKey: string;
  systemPrompt: string;
  redshiftCredentials: RedshiftCredentials;
}

export interface SqlQueryResult {
  columns: string[];
  rows: any[];
  error?: string;
  connectionTested?: boolean;
  query?: string;
}

export interface ToolCall {
  type: 'sql';
  query: string;
  result?: SqlQueryResult;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  connectorId: string;
}

export interface JavaScriptExecutionResult {
  output: string;
  error?: string;
  visualizations?: VisualizationResult[];
}

export interface VisualizationResult {
  type: 'chart' | 'plotly';
  data: any;
  options?: any;
  id: string;
}

export interface SampleWarehouse {
  id: string;
  name: string;
  description: string;
  schema: string;
}

export interface SuggestedQuery {
  warehouseId: string;
  content: string;
  description: string;
}