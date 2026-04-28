// Anthropic Claude adapter (Messages API, streaming SSE)
import type { LlmAdapter } from "../types";

export function createAnthropicAdapter(opts: { apiKey: string }): LlmAdapter {
  const DEFAULT_KEEP_LAST_NON_SYSTEM = 4;
  const RETRY_KEEP_LAST_NON_SYSTEM = 2;
  const MAX_SYSTEM_CHARS = 1200;
  const MAX_TEXT_CHARS = 1500;
  const MAX_TOOL_RESULT_CHARS = 800;

  function truncateText(value: string, maxChars: number): string {
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars)}\n\n[...contenu tronque automatiquement pour eviter un depassement de quota...]`;
  }

  function normalizeContent(content: unknown, maxChars: number): unknown {
    if (typeof content === "string") return truncateText(content, maxChars);
    try {
      const json = JSON.stringify(content);
      return truncateText(json, maxChars);
    } catch {
      return truncateText(String(content ?? ""), maxChars);
    }
  }

  function normalizeToolInput(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    return input as Record<string, unknown>;
  }

  function toAnthropicMessages(
    messages: Parameters<LlmAdapter["streamChat"]>[0]["messages"],
    keepLastNonSystem: number,
  ) {
    const systemMsgs = messages.filter((m) => m.role === "system");
    const rawSystem = systemMsgs.map((m) => (m as { content: string }).content).join("\n\n");
    const system = rawSystem ? truncateText(rawSystem, MAX_SYSTEM_CHARS) : undefined;

    const base = messages.filter((m) => m.role !== "system").slice(-keepLastNonSystem);

    const aMessages: Array<{ role: "user" | "assistant"; content: unknown }> = [];
    const knownToolUseIds = new Set<string>();
    for (const m of base) {
      if (m.role === "user") {
        aMessages.push({ role: "user", content: normalizeContent(m.content, MAX_TEXT_CHARS) });
      } else if (m.role === "assistant") {
        const blocks: Array<Record<string, unknown>> = [];
        if (m.content) blocks.push({ type: "text", text: normalizeContent(m.content, MAX_TEXT_CHARS) });
        if (m.toolCalls) {
          for (const tc of m.toolCalls) {
            knownToolUseIds.add(tc.id);
            blocks.push({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: normalizeToolInput(tc.arguments),
            });
          }
        }
        aMessages.push({ role: "assistant", content: blocks });
      } else if (m.role === "tool") {
        // Anthropic exige qu'un tool_result référence un tool_use
        // présent dans le message assistant précédent. On ignore les
        // entrées historiques incohérentes pour éviter une erreur 400.
        if (!m.toolCallId || !knownToolUseIds.has(m.toolCallId)) continue;
        // Anthropic represents tool results as user messages with tool_result blocks
        aMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: m.toolCallId,
                content: normalizeContent(m.content, MAX_TOOL_RESULT_CHARS),
            },
          ],
        });
      }
    }
    if (aMessages.length === 0) {
      // Anthropic requires at least one non-system message.
      aMessages.push({
        role: "user",
        content: "Reponds brievement en francais.",
      });
    }

    return { system, aMessages };
  }

  return {
    async *streamChat({ model, messages, tools, temperature, signal }) {
      const aTools =
        tools.length > 0
          ? tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters,
            }))
          : undefined;

      const fullPayload = toAnthropicMessages(messages, DEFAULT_KEEP_LAST_NON_SYSTEM);
      let payload = {
        model,
        max_tokens: 8192,
        temperature,
        system: fullPayload.system,
        messages: fullPayload.aMessages,
        tools: aTools,
        stream: true,
      };

      let res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": opts.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
        signal,
      });

      // Fallback: en cas de rate-limit d'entrée, on retente avec un contexte plus court.
      if (res.status === 429) {
        const reduced = toAnthropicMessages(messages, RETRY_KEEP_LAST_NON_SYSTEM);
        payload = {
          ...payload,
          max_tokens: 2048,
          system: reduced.system,
          messages: reduced.aMessages,
          tools: undefined,
        };
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": opts.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(payload),
          signal,
        });
      }

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        if (res.status === 429) {
          yield {
            type: "error",
            error:
              "Anthropic rate limit atteint (tokens/min). Réessaie dans ~60s, " +
              "ou envoie un message plus court / nouvelle conversation.",
          };
          return;
        }
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
