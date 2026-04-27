// Factory: returns the right adapter based on provider config
import type { LlmAdapter, LlmProviderConfig } from "./types";
import { createOpenAiAdapter } from "./adapters/openai";
import { createAnthropicAdapter } from "./adapters/anthropic";
import { createOllamaAdapter } from "./adapters/ollama";

export function getAdapter(provider: LlmProviderConfig): LlmAdapter {
  switch (provider.kind) {
    case "anthropic": {
      if (!provider.api_key) throw new Error("Clé API Anthropic manquante");
      return createAnthropicAdapter({ apiKey: provider.api_key });
    }
    case "openai": {
      if (!provider.api_key) throw new Error("Clé API OpenAI manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://api.openai.com/v1",
        apiKey: provider.api_key,
      });
    }
    case "mistral": {
      if (!provider.api_key) throw new Error("Clé API Mistral manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://api.mistral.ai/v1",
        apiKey: provider.api_key,
      });
    }
    case "ollama": {
      if (!provider.base_url) throw new Error("URL Ollama manquante");
      return createOllamaAdapter({ baseUrl: provider.base_url });
    }
    default:
      throw new Error(`Provider inconnu : ${provider.kind}`);
  }
}
