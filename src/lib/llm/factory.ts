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
    case "gemini": {
      if (!provider.api_key) throw new Error("Clé API Gemini manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: provider.api_key,
      });
    }
    case "grok": {
      if (!provider.api_key) throw new Error("Clé API xAI manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://api.x.ai/v1",
        apiKey: provider.api_key,
      });
    }
    case "deepseek": {
      if (!provider.api_key) throw new Error("Clé API DeepSeek manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://api.deepseek.com/v1",
        apiKey: provider.api_key,
      });
    }
    case "cohere": {
      if (!provider.api_key) throw new Error("Clé API Cohere manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://api.cohere.ai/compatibility/v1",
        apiKey: provider.api_key,
      });
    }
    case "huggingface": {
      if (!provider.api_key) throw new Error("Clé API Hugging Face manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://router.huggingface.co/v1",
        apiKey: provider.api_key,
      });
    }
    case "nvidia": {
      if (!provider.api_key) throw new Error("Clé API NVIDIA manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://integrate.api.nvidia.com/v1",
        apiKey: provider.api_key,
      });
    }
    case "perplexity": {
      if (!provider.api_key) throw new Error("Clé API Perplexity manquante");
      return createOpenAiAdapter({
        baseUrl: provider.base_url || "https://api.perplexity.ai",
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
