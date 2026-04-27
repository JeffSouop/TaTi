// OpenAI-compatible adapter (works for OpenAI, Mistral, and any OpenAI-compatible API)
import type { LlmAdapter, LlmMessage, LlmStreamChunk, LlmTool, LlmToolCall } from "../types";

export function createOpenAiAdapter(opts: {
  baseUrl: string; // e.g. https://api.openai.com/v1
  apiKey: string;
}): LlmAdapter {
  return {
    async *streamChat({ model, messages, tools, temperature, signal }) {
      const oaiMessages = messages.map((m) => {
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
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            })),
          };
        }
        return { role: m.role, content: m.content };
      });

      const oaiTools =
        tools.length > 0
          ? tools.map((t) => ({
              type: "function" as const,
              function: { name: t.name, description: t.description, parameters: t.parameters },
            }))
          : undefined;

      const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: oaiMessages,
          tools: oaiTools,
          temperature,
          stream: true,
        }),
        signal,
      });

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        yield { type: "error", error: `HTTP ${res.status}: ${txt.slice(0, 400)}` };
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      // Accumulate tool_calls across chunks (OpenAI streams them in pieces)
      const toolBuf = new Map<number, { id: string; name: string; args: string }>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nlIdx).trim();
          buf = buf.slice(nlIdx + 1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            for (const [, tc] of toolBuf) {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = tc.args ? JSON.parse(tc.args) : {};
              } catch {
                parsed = {};
              }
              yield {
                type: "tool_call",
                toolCall: { id: tc.id, name: tc.name, arguments: parsed },
              };
            }
            return;
          }
          try {
            const obj = JSON.parse(data);
            const delta = obj.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: "text", text: delta.content };
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                let entry = toolBuf.get(idx);
                if (!entry) {
                  entry = { id: tc.id ?? `call_${idx}_${Date.now()}`, name: "", args: "" };
                  toolBuf.set(idx, entry);
                }
                if (tc.id) entry.id = tc.id;
                if (tc.function?.name) entry.name += tc.function.name;
                if (tc.function?.arguments) entry.args += tc.function.arguments;
              }
            }
            const finish = obj.choices?.[0]?.finish_reason;
            if (finish === "tool_calls" || finish === "stop") {
              // wait for [DONE]
            }
          } catch {
            // skip malformed line
          }
        }
      }

      // Flush any remaining tool calls if stream ended without [DONE]
      for (const [, tc] of toolBuf) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = tc.args ? JSON.parse(tc.args) : {};
        } catch {
          parsed = {};
        }
        yield {
          type: "tool_call",
          toolCall: { id: tc.id, name: tc.name, arguments: parsed },
        };
      }
    },
  };
}

// Helpers exposed for testing/listing
export type { LlmMessage, LlmStreamChunk, LlmTool, LlmToolCall };
