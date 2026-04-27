import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolCallParams, JsonRpcResponse } from './rtp.types';

@Injectable()
export class RtpService {
  private readonly logger = new Logger(RtpService.name);
  private readonly tools = new Map<string, { definition: ToolDefinition; handler: Function }>();

  registerTool(definition: ToolDefinition, handler: Function) {
    this.tools.set(definition.name, { definition, handler });
    this.logger.log(`Registered tool: ${definition.name}`);
  }

  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  async callTool(params: ToolCallParams, id: string | number): Promise<JsonRpcResponse> {
    const tool = this.tools.get(params.name);
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Tool not found: ${params.name}`,
        },
      };
    }

    try {
      this.logger.log(`Executing tool: ${params.name} with params: ${JSON.stringify(params.arguments)}`);
      const result = await tool.handler(params.arguments);
      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    } catch (error) {
      this.logger.error(`Error executing tool ${params.name}:`, error.stack);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error.message || 'Internal error during tool execution',
        },
      };
    }
  }
}
