/**
 * Abstract base class for all AI providers.
 * Using an abstract class (not interface) so NestJS @Inject can reference it at runtime.
 * The Executive Loop never knows which provider is behind.
 */
export abstract class IAiProvider {
  abstract chat(messages: AiMessage[], options?: AiOptions): Promise<AiResponse>;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface AiOptions {
  tools?: AiTool[];
  temperature?: number;
  maxTokens?: number;
}

export interface AiTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface AiResponse {
  content?: string;
  toolCalls?: AiToolCall[];
  provider: string;
  model: string;
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

