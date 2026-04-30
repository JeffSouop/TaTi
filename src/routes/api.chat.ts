import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { mcpInitialize, mcpListTools, mcpCallTool } from '@/lib/mcp-client';
import { encodeToolName, decodeToolName, shortServerId } from '@/lib/tool-naming';
import { getAdapter } from '@/lib/llm/factory';
import type { LlmMessage, LlmTool, LlmToolCall, LlmProviderConfig } from '@/lib/llm/types';
import { getUserFromRequest, isAuthRequired } from '@/lib/auth.server';
import { pool } from '@/lib/db.server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ChatRequestBody {
  conversationId: string;
}

type SseEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_call_start'; id: string; name: string; serverName: string; arguments: unknown }
  | { type: 'tool_call_result'; id: string; result: unknown; error?: string }
  | { type: 'message_saved'; id: string; role: 'assistant' | 'tool' }
  | { type: 'error'; message: string }
  | { type: 'done' };

function compactToolsForAnthropic(tools: LlmTool[]): LlmTool[] {
  const MAX_TOOLS = 24;
  const MAX_PER_SERVER = 6;

  const byServer = new Map<string, LlmTool[]>();
  for (const t of tools) {
    const m = /^\[([^\]]+)\]/.exec(t.description ?? '');
    const server = m?.[1] ?? 'unknown';
    const arr = byServer.get(server) ?? [];
    arr.push(t);
    byServer.set(server, arr);
  }

  const selected: LlmTool[] = [];
  const groups = Array.from(byServer.values()).map((arr) => arr.slice(0, MAX_PER_SERVER));

  // Pass 1: guarantee at least one tool per server when possible.
  for (const arr of groups) {
    if (selected.length >= MAX_TOOLS) break;
    if (arr.length > 0) selected.push(arr[0]);
  }

  // Pass 2: round-robin fill remaining slots to stay fair across servers.
  let cursor = 1;
  while (selected.length < MAX_TOOLS) {
    let addedInRound = false;
    for (const arr of groups) {
      if (selected.length >= MAX_TOOLS) break;
      if (cursor < arr.length) {
        selected.push(arr[cursor]);
        addedInRound = true;
      }
    }
    if (!addedInRound) break;
    cursor += 1;
  }

  return selected.map((t) => ({
    name: t.name,
    description: (t.description ?? '').slice(0, 160),
    // Keep schema intentionally minimal to reduce input tokens/minute pressure.
    parameters: { type: 'object', properties: {} },
  }));
}

function sseLine(event: SseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const authRequired = isAuthRequired();
        const user = await getUserFromRequest(request);
        if (authRequired && !user) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let body: ChatRequestBody;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { conversationId } = body;
        if (!conversationId || typeof conversationId !== 'string') {
          return new Response(JSON.stringify({ error: 'conversationId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 1. Load conversation to get its provider/model
        let convQuery = supabaseAdmin
          .from('conversations')
          .select('id, provider_id, model')
          .eq('id', conversationId);
        if (user) convQuery = convQuery.eq('user_id', user.id);
        const { data: conv } = await convQuery.single();

        if (!conv) {
          return new Response(JSON.stringify({ error: 'Conversation not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 2. Resolve provider: explicit on conversation OR default
        let providerId = conv.provider_id as string | null;
        if (!providerId) {
          const defQuery = supabaseAdmin
            .from('llm_providers')
            .select('id')
            .eq('is_default', true)
            .eq('enabled', true);
          const { data: def } = await defQuery.maybeSingle();
          providerId = def?.id ?? null;
        }

        if (!providerId) {
          return new Response(
            JSON.stringify({
              error:
                "Aucun provider IA configuré. Va dans Paramètres → Providers IA et ajoutes-en au moins un (Claude, OpenAI, Mistral ou Ollama).",
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const providerQuery = supabaseAdmin
          .from('llm_providers')
          .select('*')
          .eq('id', providerId);
        const { data: provider } = await providerQuery.single();

        if (!provider || !provider.enabled) {
          return new Response(
            JSON.stringify({ error: 'Provider IA introuvable ou désactivé' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const providerConfig: LlmProviderConfig = {
          id: provider.id,
          kind: provider.kind,
          name: provider.name,
          api_key: provider.api_key,
          base_url: provider.base_url,
          default_model: provider.default_model,
          temperature: provider.temperature,
          max_tool_iterations: provider.max_tool_iterations,
        };

        const model = conv.model || provider.default_model;

        // 3. Load enabled MCP servers
        const { data: servers } = await supabaseAdmin
          .from('mcp_servers')
          .select('*')
          .eq('enabled', true);

        let filteredServers = servers ?? [];
        if (authRequired && user && user.role !== 'admin') {
          const accessRows = await pool.query<{ mcp_server_id: string; allowed: boolean }>(
            `SELECT mcp_server_id, allowed
             FROM public.user_mcp_access
             WHERE user_id = $1`,
            [user.id] as never,
          );
          if (accessRows.rows.length > 0) {
            const allowedSet = new Set(accessRows.rows.filter((r) => r.allowed).map((r) => r.mcp_server_id));
            filteredServers = filteredServers.filter((s) => allowedSet.has(s.id));
          }
        }

        // 4. Load conversation messages
        let msgQuery = supabaseAdmin
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (user) msgQuery = msgQuery.eq('user_id', user.id);
        const { data: dbMessages } = await msgQuery;

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            const send = (e: SseEvent) => controller.enqueue(encoder.encode(sseLine(e)));

            try {
              // 5. Connect to MCP servers + gather tools
              const sessions = new Map<string, { session: Awaited<ReturnType<typeof mcpInitialize>>; serverName: string; serverId: string }>();
              const allTools: LlmTool[] = [];
              const originalToolNameByEncoded = new Map<string, string>();

              for (const srv of filteredServers ?? []) {
                try {
                  const headers = (srv.headers as Record<string, string>) || {};
                  const session = await mcpInitialize({ url: srv.url, headers });
                  const tools = await mcpListTools(session);
                  sessions.set(shortServerId(srv.id), { session, serverName: srv.name, serverId: srv.id });
                  for (const t of tools) {
                    const encoded = encodeToolName(srv.id, t.name);
                    originalToolNameByEncoded.set(encoded, t.name);
                    allTools.push({
                      name: encoded,
                      description: `[${srv.name}] ${t.description ?? t.name}`,
                      parameters: (t.inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
                    });
                  }
                } catch (e) {
                  send({
                    type: 'error',
                    message: `MCP server "${srv.name}" failed to connect: ${e instanceof Error ? e.message : 'unknown'}`,
                  });
                }
              }

              // 6. Build unified message array
              const messages: LlmMessage[] = [];
              messages.push({
                role: 'system',
                content:
                  "You are a helpful AI assistant with access to tools from multiple MCP servers. " +
                  "When the user asks something that requires data, call the appropriate tool. " +
                  "After receiving tool results, summarize them clearly for the user. " +
                  "Always answer in the same language the user used.",
              });
              for (const m of dbMessages ?? []) {
                if (m.role === 'tool') {
                  messages.push({
                    role: 'tool',
                    content: m.content,
                    toolCallId: m.tool_call_id ?? '',
                    toolName: m.tool_name ?? undefined,
                  });
                } else if (m.role === 'assistant') {
                  const tcs = (m.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | null) ?? [];
                  messages.push({
                    role: 'assistant',
                    content: m.content,
                    toolCalls: tcs.map((tc) => ({
                      id: tc.id,
                      name: tc.function?.name ?? '',
                      arguments: (() => {
                        try {
                          return typeof tc.function?.arguments === 'string'
                            ? JSON.parse(tc.function.arguments)
                            : (tc.function?.arguments ?? {});
                        } catch {
                          return {};
                        }
                      })(),
                    })),
                  });
                } else if (m.role === 'user') {
                  messages.push({ role: 'user', content: m.content });
                }
              }

              // 7. Agent loop using the chosen adapter
              const adapter = getAdapter(providerConfig);
              const maxIter = providerConfig.max_tool_iterations;

              for (let iter = 0; iter < maxIter; iter++) {
                let assistantContent = '';
                const assistantToolCalls: LlmToolCall[] = [];
                let streamErrored = false;
                const toolsForCall =
                  providerConfig.kind === 'anthropic' ? compactToolsForAnthropic(allTools) : allTools;

                const generator = adapter.streamChat({
                  model,
                  messages,
                  tools: toolsForCall,
                  temperature: providerConfig.temperature,
                });

                for await (const chunk of generator) {
                  if (chunk.type === 'text' && chunk.text) {
                    assistantContent += chunk.text;
                    send({ type: 'token', content: chunk.text });
                  } else if (chunk.type === 'tool_call' && chunk.toolCall) {
                    assistantToolCalls.push(chunk.toolCall);
                  } else if (chunk.type === 'error') {
                    send({
                      type: 'error',
                      message: `${providerConfig.name} (${providerConfig.kind}) : ${chunk.error}`,
                    });
                    streamErrored = true;
                    break;
                  }
                }

                if (streamErrored) {
                  send({ type: 'done' });
                  controller.close();
                  return;
                }

                // Persist assistant message (in OpenAI-style tool_calls for DB compatibility)
                const dbToolCalls =
                  assistantToolCalls.length > 0
                    ? assistantToolCalls.map((tc) => ({
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
                      }))
                    : null;

                const { data: assistantSaved } = await supabaseAdmin
                  .from('messages')
                  .insert({
                    conversation_id: conversationId,
                    user_id: user?.id ?? null,
                    role: 'assistant',
                    content: assistantContent,
                    tool_calls: dbToolCalls,
                  })
                  .select()
                  .single();
                if (assistantSaved) send({ type: 'message_saved', id: assistantSaved.id, role: 'assistant' });

                messages.push({
                  role: 'assistant',
                  content: assistantContent,
                  toolCalls: assistantToolCalls.length > 0 ? assistantToolCalls : undefined,
                });

                if (assistantToolCalls.length === 0) break;

                // Execute tool calls
                for (const tc of assistantToolCalls) {
                  const decoded = decodeToolName(tc.name);
                  const sessionEntry = decoded ? sessions.get(decoded.serverShortId) : undefined;

                  send({
                    type: 'tool_call_start',
                    id: tc.id,
                    name: decoded?.toolName ?? tc.name,
                    serverName: sessionEntry?.serverName ?? 'unknown',
                    arguments: tc.arguments,
                  });

                  let toolResultText = '';
                  let toolError: string | undefined;
                  if (!sessionEntry || !decoded) {
                    toolError = `Tool "${tc.name}" not found on any connected MCP server`;
                    toolResultText = JSON.stringify({ error: toolError });
                  } else {
                    try {
                      const originalToolName = originalToolNameByEncoded.get(tc.name) ?? decoded.toolName;
                      const result = await mcpCallTool(sessionEntry.session, originalToolName, tc.arguments);
                      toolResultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                    } catch (e) {
                      toolError = e instanceof Error ? e.message : 'Tool execution failed';
                      toolResultText = JSON.stringify({ error: toolError });
                    }
                  }

                  send({
                    type: 'tool_call_result',
                    id: tc.id,
                    result: (() => {
                      try {
                        return JSON.parse(toolResultText);
                      } catch {
                        return toolResultText;
                      }
                    })(),
                    error: toolError,
                  });

                  const { data: toolSaved } = await supabaseAdmin
                    .from('messages')
                    .insert({
                      conversation_id: conversationId,
                      user_id: user?.id ?? null,
                      role: 'tool',
                      content: toolResultText,
                      tool_call_id: tc.id,
                      tool_name: decoded?.toolName ?? tc.name,
                      server_name: sessionEntry?.serverName ?? null,
                    })
                    .select()
                    .single();
                  if (toolSaved) send({ type: 'message_saved', id: toolSaved.id, role: 'tool' });

                  messages.push({
                    role: 'tool',
                    content: toolResultText,
                    toolCallId: tc.id,
                  });
                }
              }

              let convUpdate = supabaseAdmin
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId);
              if (user) convUpdate = convUpdate.eq('user_id', user.id);
              await convUpdate;

              send({ type: 'done' });
              controller.close();
            } catch (e) {
              send({ type: 'error', message: e instanceof Error ? e.message : 'Unknown error' });
              send({ type: 'done' });
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      },
    },
  },
});
