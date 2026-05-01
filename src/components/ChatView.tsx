import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Markdown } from "@/components/Markdown";
import { ToolCallBubble, type ToolCallDisplay } from "@/components/ToolCallBubble";
import { ConversationProviderSelector } from "@/components/ConversationProviderSelector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, Bot, AlertTriangle, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DbMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_calls: unknown;
  tool_call_id: string | null;
  tool_name: string | null;
  server_name: string | null;
  created_at: string;
}

interface DisplayItem {
  type: "message" | "tool";
  id: string;
  role?: "user" | "assistant";
  content?: string;
  toolCall?: ToolCallDisplay;
  streaming?: boolean;
}

type ToolCallMeta = {
  id: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type ChatSseEvent =
  | { type: "token"; content: string }
  | {
      type: "tool_call_start";
      id: string;
      name: string;
      serverName?: string;
      arguments?: unknown;
    }
  | { type: "tool_call_result"; id: string; result?: unknown; error?: string }
  | { type: "error"; message: string };

export function ChatView({ conversationId }: { conversationId: string }) {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingMsgRef = useRef<{ id: string; text: string } | null>(null);
  const auth = useAuth();

  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    return distanceFromBottom < 140;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Load existing messages
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const msgs = (data ?? []) as DbMessage[];
      setItems(buildItemsFromDb(msgs));
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    if (!showScrollToBottom) {
      scrollToBottom("smooth");
    }
  }, [items]);

  const onScroll = () => {
    setShowScrollToBottom(!isNearBottom());
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    setStreaming(true);

    // Persist user message
    const { data: userMsg } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "user", content: text })
      .select()
      .single();

    // If first message, set conversation title
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("role", "user");
    if (count === 1) {
      await supabase
        .from("conversations")
        .update({ title: text.slice(0, 60) })
        .eq("id", conversationId);
    }

    if (userMsg) {
      setItems((prev) => [
        ...prev,
        { type: "message", id: userMsg.id, role: "user", content: text },
      ]);
    }

    // Prepare streaming assistant placeholder
    const tempId = `temp-${Date.now()}`;
    streamingMsgRef.current = { id: tempId, text: "" };
    setItems((prev) => [
      ...prev,
      { type: "message", id: tempId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              handleEvent(evt);
            } catch {
              /* skip */
            }
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de connexion");
    } finally {
      setStreaming(false);
      streamingMsgRef.current = null;
      // Reload from DB to get final state with proper IDs
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setItems(buildItemsFromDb((data ?? []) as DbMessage[]));
    }
  };

  const handleEvent = (evt: ChatSseEvent) => {
    if (evt.type === "token") {
      const cur = streamingMsgRef.current;
      if (!cur) return;
      cur.text += evt.content;
      setItems((prev) => prev.map((it) => (it.id === cur.id ? { ...it, content: cur.text } : it)));
    } else if (evt.type === "tool_call_start") {
      setItems((prev) => [
        ...prev,
        {
          type: "tool",
          id: evt.id,
          toolCall: {
            id: evt.id,
            name: evt.name,
            serverName: evt.serverName ?? "—",
            arguments: evt.arguments,
            status: "running",
          },
        },
      ]);
      // Reset streaming buffer for next assistant turn
      const newTempId = `temp-${Date.now()}-${Math.random()}`;
      streamingMsgRef.current = { id: newTempId, text: "" };
      setItems((prev) => [
        ...prev,
        { type: "message", id: newTempId, role: "assistant", content: "", streaming: true },
      ]);
    } else if (evt.type === "tool_call_result") {
      setItems((prev) =>
        prev.map((it) =>
          it.type === "tool" && it.toolCall?.id === evt.id
            ? {
                ...it,
                toolCall: {
                  ...it.toolCall!,
                  status: evt.error ? "error" : "done",
                  result: evt.result,
                  error: evt.error,
                },
              }
            : it,
        ),
      );
    } else if (evt.type === "error") {
      setError(evt.message);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-screen flex-1 min-w-0">
      <div className="border-b border-border bg-background/80 backdrop-blur px-4 py-2">
        <div className="max-w-6xl mx-auto">
          <ConversationProviderSelector conversationId={conversationId} />
        </div>
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          {items.length === 0 && (
            <div className="text-center text-muted-foreground py-20">
              <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Pose ta question pour démarrer la conversation.</p>
              <p className="text-xs mt-1">L'IA peut appeler tes serveurs MCP automatiquement.</p>
            </div>
          )}
          {items.map((it) =>
            it.type === "tool" && it.toolCall ? (
              <ToolCallBubble key={it.id} call={it.toolCall} />
            ) : (
              <MessageBubble
                key={it.id}
                role={it.role!}
                content={it.content ?? ""}
                streaming={it.streaming}
                userProfile={
                  auth.user
                    ? {
                        firstName: auth.user.first_name,
                        lastName: auth.user.last_name,
                        email: auth.user.email,
                        avatarUrl: auth.user.avatar_url,
                      }
                    : null
                }
              />
            ),
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}
        </div>
        {showScrollToBottom && (
          <Button
            type="button"
            size="icon"
            className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg"
            onClick={() => scrollToBottom("smooth")}
            aria-label="Aller en bas de la conversation"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto p-3 flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Pose ta question (Entrée pour envoyer, Shift+Entrée pour aller à la ligne)"
            className="min-h-[48px] max-h-40 resize-none"
            disabled={streaming}
          />
          <Button
            onClick={send}
            disabled={streaming || !input.trim()}
            size="icon"
            className="h-12 w-12 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
  userProfile,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  userProfile?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
}) {
  const isUser = role === "user";
  const initials = isUser
    ? (
        `${userProfile?.firstName?.[0] ?? ""}${userProfile?.lastName?.[0] ?? ""}` ||
        `${userProfile?.email?.[0] ?? "U"}`
      ).toUpperCase()
    : "A";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {isUser ? (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={userProfile?.avatarUrl ?? ""} alt="Profil utilisateur" />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium bg-muted text-foreground">
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "rounded-lg px-3 py-2 max-w-[94%]",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted/50 border border-border",
        )}
      >
        {content ? (
          isUser ? (
            <div className="text-sm whitespace-pre-wrap">{content}</div>
          ) : (
            <Markdown>{content}</Markdown>
          )
        ) : streaming ? (
          <div className="flex gap-1 py-1">
            <span
              className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildItemsFromDb(msgs: DbMessage[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  for (const m of msgs) {
    if (m.role === "user") {
      items.push({ type: "message", id: m.id, role: "user", content: m.content });
    } else if (m.role === "assistant") {
      // First, render any tool_calls metadata (will be paired with subsequent tool messages)
      if (m.content) {
        items.push({ type: "message", id: m.id, role: "assistant", content: m.content });
      }
      const tcs = (m.tool_calls ?? []) as ToolCallMeta[];
      for (const tc of tcs) {
        // Find matching tool result
        const toolMsg = msgs.find((x) => x.role === "tool" && x.tool_call_id === tc.id);
        let parsedArgs: unknown = {};
        try {
          parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          parsedArgs = tc.function?.arguments ?? {};
        }
        let parsedResult: unknown = toolMsg?.content ?? "";
        if (toolMsg) {
          try {
            parsedResult = JSON.parse(toolMsg.content);
          } catch {
            /* keep as string */
          }
        }
        items.push({
          type: "tool",
          id: `${m.id}-${tc.id}`,
          toolCall: {
            id: tc.id,
            name: toolMsg?.tool_name ?? tc.function?.name ?? "tool",
            serverName: toolMsg?.server_name ?? "—",
            arguments: parsedArgs,
            result: parsedResult,
            status: toolMsg ? "done" : "running",
          },
        });
      }
    }
    // tool messages are folded into the assistant turn above; skip
  }
  return items;
}
