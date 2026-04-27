// Types unifiés pour tous les providers LLM
// Chaque adapter convertit ce format vers/depuis son API native.

export type LlmProviderKind = "anthropic" | "openai" | "mistral" | "ollama";

export interface LlmProviderConfig {
  id: string;
  kind: LlmProviderKind | string; // string pour permettre des kinds futurs
  name: string;
  api_key: string | null;
  base_url: string | null;
  default_model: string;
  temperature: number;
  max_tool_iterations: number;
}

export interface LlmTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type LlmMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: LlmToolCall[] }
  | { role: "tool"; content: string; toolCallId: string; toolName?: string };

export interface LlmStreamChunk {
  type: "text" | "tool_call" | "done" | "error";
  text?: string;
  toolCall?: LlmToolCall;
  error?: string;
}

export interface LlmAdapter {
  /**
   * Stream a chat completion. Yields chunks: text deltas + tool calls.
   * The adapter is responsible for translating tools and messages
   * to/from its provider-specific format.
   */
  streamChat(args: {
    model: string;
    messages: LlmMessage[];
    tools: LlmTool[];
    temperature: number;
    signal?: AbortSignal;
  }): AsyncGenerator<LlmStreamChunk>;
}

// Catalogue de modèles connus par provider (mise à jour manuelle)
export const KNOWN_MODELS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5 (recommandé)" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-haiku-4-20250514", label: "Claude Haiku 4 (rapide)" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  openai: [
    { value: "gpt-5", label: "GPT-5 (recommandé)" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano (rapide)" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  mistral: [
    { value: "mistral-large-latest", label: "Mistral Large (recommandé)" },
    { value: "mistral-medium-latest", label: "Mistral Medium" },
    { value: "mistral-small-latest", label: "Mistral Small (rapide)" },
    { value: "open-mistral-nemo", label: "Open Mistral Nemo" },
    { value: "codestral-latest", label: "Codestral" },
  ],
  ollama: [
    { value: "llama3.1", label: "Llama 3.1 (function calling)" },
    { value: "llama3.2", label: "Llama 3.2" },
    { value: "qwen2.5", label: "Qwen 2.5 (function calling)" },
    { value: "mistral", label: "Mistral 7B" },
    { value: "codellama", label: "Code Llama" },
  ],
};

export const PROVIDER_KINDS: Array<{
  value: LlmProviderKind;
  label: string;
  needsApiKey: boolean;
  needsBaseUrl: boolean;
  defaultBaseUrl?: string;
  description: string;
}> = [
  {
    value: "anthropic",
    label: "Anthropic (Claude)",
    needsApiKey: true,
    needsBaseUrl: false,
    description: "API Claude — clé sk-ant-… depuis console.anthropic.com",
  },
  {
    value: "openai",
    label: "OpenAI (GPT)",
    needsApiKey: true,
    needsBaseUrl: false,
    description: "API OpenAI — clé sk-… depuis platform.openai.com",
  },
  {
    value: "mistral",
    label: "Mistral",
    needsApiKey: true,
    needsBaseUrl: false,
    description: "API Mistral — clé depuis console.mistral.ai",
  },
  {
    value: "ollama",
    label: "Ollama (local / self-hosted)",
    needsApiKey: false,
    needsBaseUrl: true,
    defaultBaseUrl: "http://localhost:11434",
    description: "Endpoint Ollama public (HTTPS via ngrok/cloudflared si depuis le cloud)",
  },
];
