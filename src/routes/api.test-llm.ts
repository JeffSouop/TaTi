// Test connectivity for any LLM provider kind (anthropic, openai-compatible, ollama)
import { createFileRoute } from '@tanstack/react-router';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface TestRequest {
  kind: string;
  api_key?: string;
  base_url?: string;
}

export const Route = createFileRoute('/api/test-llm')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        let body: TestRequest;
        try {
          body = (await request.json()) as TestRequest;
        } catch {
          return json({ ok: false, error: 'Invalid JSON' }, 400);
        }

        const { kind, api_key, base_url } = body;
        if (!kind) return json({ ok: false, error: 'kind required' }, 400);

        try {
          if (kind === 'ollama') {
            if (!base_url) return json({ ok: false, error: 'base_url required' });
            const cleaned = base_url.replace(/\/$/, '');
            const res = await fetch(`${cleaned}/api/tags`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'ngrok-skip-browser-warning': 'true',
              },
              signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) return json({ ok: false, error: `Ollama returned ${res.status}` });
            const data = (await res.json()) as { models?: Array<{ name: string }> };
            return json({ ok: true, models: (data.models ?? []).map((m) => m.name) });
          }

          if (kind === 'anthropic') {
            if (!api_key) return json({ ok: false, error: 'api_key required' });
            const res = await fetch('https://api.anthropic.com/v1/models', {
              method: 'GET',
              headers: {
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01',
              },
              signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) {
              const txt = await res.text().catch(() => '');
              return json({ ok: false, error: `Anthropic ${res.status}: ${txt.slice(0, 200)}` });
            }
            const data = (await res.json()) as { data?: Array<{ id: string }> };
            return json({ ok: true, models: (data.data ?? []).map((m) => m.id) });
          }

          if (kind === 'openai' || kind === 'mistral' || kind === 'gemini' || kind === 'grok' || kind === 'deepseek' || kind === 'cohere' || kind === 'huggingface' || kind === 'nvidia' || kind === 'perplexity') {
            if (!api_key) return json({ ok: false, error: 'api_key required' });
            const defaultUrlByKind: Record<string, string> = {
              openai: 'https://api.openai.com/v1',
              mistral: 'https://api.mistral.ai/v1',
              gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
              grok: 'https://api.x.ai/v1',
              deepseek: 'https://api.deepseek.com/v1',
              cohere: 'https://api.cohere.ai/compatibility/v1',
              huggingface: 'https://router.huggingface.co/v1',
              nvidia: 'https://integrate.api.nvidia.com/v1',
              perplexity: 'https://api.perplexity.ai',
            };
            const url = base_url?.replace(/\/$/, '') || defaultUrlByKind[kind] || 'https://api.openai.com/v1';
            const res = await fetch(`${url}/models`, {
              method: 'GET',
              headers: { Authorization: `Bearer ${api_key}` },
              signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) {
              const txt = await res.text().catch(() => '');
              return json({ ok: false, error: `${kind} ${res.status}: ${txt.slice(0, 200)}` });
            }
            const data = (await res.json()) as { data?: Array<{ id: string }> };
            return json({ ok: true, models: (data.data ?? []).map((m) => m.id) });
          }

          return json({ ok: false, error: `Provider inconnu : ${kind}` });
        } catch (e) {
          return json({
            ok: false,
            error: e instanceof Error ? e.message : 'Connection failed',
          });
        }
      },
    },
  },
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
