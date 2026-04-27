// Ollama adapter (native /api/chat with NDJSON streaming)
import type { LlmAdapter } from "../types";

export function createOllamaAdapter(opts: { baseUrl: string }): LlmAdapter {
  return {
    async *streamChat({ model, messages, tools, temperature, signal }) {
      const oMessages = messages.map((m) => {
        if (m.role === "tool") {
          return {
            role: "tool" as const,
            content: m.content,
            tool_call_id: m.toolCallId,
          };
        }
        if (m.role === "assistant") {
          return {
            role: "assistant" as const,
            content: m.content,
            tool_calls: m.toolCalls?.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            })),
          };
        }
        return { role: m.role, content: m.content };
      });

      const oTools =
        tools.length > 0
          ? tools.map((t) => ({
              type: "function" as const,
              function: { name: t.name, description: t.description, parameters: t.parameters },
            }))
          : undefined;

      const url = `${opts.baseUrl.replace(/\/$/, "")}/api/chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Skip ngrok free-tier browser warning if applicable
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          model,
          messages: oMessages,
          tools: oTools,
          stream: true,
          options: { temperature },
        }),
        signal,
      });

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        yield { type: "error", error: `Ollama HTTP ${res.status}: ${txt.slice(0, 400)}` };
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          try {
            const obj = JSON.parse(line);
            const msg = obj.message;
            if (msg?.content) {
              yield { type: "text", text: msg.content };
            }
            if (msg?.tool_calls && Array.isArray(msg.tool_calls)) {
              for (const tc of msg.tool_calls) {
                const args =
                  typeof tc.function?.arguments === "string"
                    ? (() => {
                        try {
                          return JSON.parse(tc.function.arguments);
                        } catch {
                          return {};
                        }
                      })()
                    : (tc.function?.arguments ?? {});
                yield {
                  type: "tool_call",
                  toolCall: {
                    id: tc.id ?? `call_${Math.random().toString(36).slice(2, 10)}`,
                    name: tc.function?.name ?? "",
                    arguments: args,
                  },
                };
              }
            }
            if (obj.done) return;
          } catch {
            // skip malformed
          }
        }
      }
    },
  };
}
