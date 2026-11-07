
export type AIMessageRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;

  complete(options: AICompletionOptions): Promise<string>;
}
