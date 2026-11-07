
import "server-only";

import type {
  AICompletionOptions,
  AIProvider,
} from "@/lib/ai/provider";

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL = "openrouter/free";

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number | string;
  };
}

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";

  async complete(options: AICompletionOptions): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenRouter is not configured. Set OPENROUTER_API_KEY.",
      );
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "CODE ATLAS",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2000,
        provider: {
          data_collection: "deny",
        },
      }),
      cache: "no-store",
    });

    const data = (await response.json()) as OpenRouterResponse;

    if (!response.ok) {
      const message =
        data.error?.message ??
        `OpenRouter request failed with status ${response.status}.`;

      throw new Error(message);
    }

    const content = data.choices?.[0]?.message?.content;

    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }

    if (Array.isArray(content)) {
      const text = content
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("\n")
        .trim();

      if (text) {
        return text;
      }
    }

    throw new Error("OpenRouter returned an empty response.");
  }
}
