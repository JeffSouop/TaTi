// Anthropic Claude adapter (Messages API, streaming SSE)
import type { LlmAdapter } from "../types";

export function createAnthropicAdapter(opts: { apiKey: string }): LlmAdapter {
  return {
    async *streamChat({ model, messages, tools, temperature, signal }) {
      // Extract system message (Anthropic uses a separate `system` field)
      const systemMsgs = messages.filter((m) => m.role === "system");
      const system = systemMsgs.map((m) => (m as { content: string }).content).join("\n\n") || undefined;

      // Convert messages to Anthropic format
      const aMessages: Array<{ role: "user" | "assistant"; content: unknown }> = [];
      for (const m of messages) {
        if (m.role === "system") continue;
        if (m.role === "user") {
          aMessages.push({ role: "user", content: m.content });
        } else if (m.role === "assistant") {
          const blocks: Array<Record<string, unknown>> = [];
          if (m.content) blocks.push({ type: "text", text: m.content });
          if (m.toolCalls) {
            for (const tc of m.toolCalls) {
              blocks.push({
                type: "tool_use",
                id: tc.id,
                name: tc.name,
                input: tc.arguments,
              });
            }
          }
          aMessages.push({ role: "assistant", content: blocks });
        } else if (m.role === "tool") {
          // Anthropic represents tool results as user messages with tool_result blocks
          aMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: m.toolCallId,
                content: m.content,
              },
            ],
          });
        }
      }

      const aTools =
        tools.length > 0
          ? tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters,
            }))
          : undefined;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": opts.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          temperature,
          system,
          messages: aMessages,
          tools: aTools,
          stream: true,
        }),
        signal,
      });

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        yield { type: "error", error: `Anthropic HTTP ${res.status}: ${txt.slice(0, 400)}` };
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      // Track in-progress tool_use blocks
      const blocks = new Map<number, { type: "text" | "tool_use"; id?: string; name?: string; argsBuf: string }>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE format: event lines + data lines, separated by blank line
        let sepIdx: number;
        while ((sepIdx = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, sepIdx);
          buf = buf.slice(sepIdx + 2);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const evt = JSON.parse(data);
              if (evt.type === "content_block_start") {
                const idx = evt.index;
                const block = evt.content_block;
                if (block?.type === "text") {
                  blocks.set(idx, { type: "text", argsBuf: "" });
                } else if (block?.type === "tool_use") {
                  blocks.set(idx, {
                    type: "tool_use",
                    id: block.id,
                    name: block.name,
                    argsBuf: "",
                  });
                }
              } else if (evt.type === "content_block_delta") {
                const idx = evt.index;
                const block = blocks.get(idx);
                if (!block) continue;
                if (evt.delta?.type === "text_delta" && block.type === "text") {
                  yield { type: "text", text: evt.delta.text };
                } else if (evt.delta?.type === "input_json_delta" && block.type === "tool_use") {
                  block.argsBuf += evt.delta.partial_json ?? "";
                }
              } else if (evt.type === "content_block_stop") {
                const idx = evt.index;
                const block = blocks.get(idx);
                if (block?.type === "tool_use" && block.id && block.name) {
                  let args: Record<string, unknown> = {};
                  try {
                    args = block.argsBuf ? JSON.parse(block.argsBuf) : {};
                  } catch {
                    args = {};
                  }
                  yield {
                    type: "tool_call",
                    toolCall: { id: block.id, name: block.name, arguments: args },
                  };
                }
                blocks.delete(idx);
              } else if (evt.type === "message_stop") {
                return;
              } else if (evt.type === "error") {
                yield { type: "error", error: evt.error?.message ?? "Anthropic stream error" };
                return;
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
    },
  };
}
