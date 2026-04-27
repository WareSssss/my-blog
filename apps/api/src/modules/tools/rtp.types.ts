/**
 * RTP (Real-time Tool Protocol) Types
 * Based on JSON-RPC 2.0
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: JsonRpcError;
  id: string | number | null;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCallParams {
  name: string;
  arguments: Record<string, any>;
}
