// Minimal Streamable-HTTP MCP client (server-side)
// Implements: initialize, tools/list, tools/call

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpServerInfo {
  serverId: string;
  serverName: string;
  url: string;
  headers: Record<string, string>;
}

let nextId = 1;

async function rpc<T = unknown>(
  url: string,
  headers: Record<string, string>,
  method: string,
  params?: unknown,
  sessionId?: string,
): Promise<{ result: T; sessionId?: string }> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...headers,
  };
  if (sessionId) reqHeaders['Mcp-Session-Id'] = sessionId;

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: nextId++,
    method,
    params,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: reqHeaders,
    body,
  });

  const newSessionId = res.headers.get('mcp-session-id') ?? sessionId;

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MCP ${method} failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  let payload: any;
  if (contentType.includes('text/event-stream')) {
    // Read SSE, find the first data: line with our response
    const text = await res.text();
    const dataLines = text
      .split('\n')
      .filter((l) => l.startsWith('data: '))
      .map((l) => l.slice(6).trim())
      .filter(Boolean);
    for (const d of dataLines) {
      try {
        const parsed = JSON.parse(d);
        if (parsed.jsonrpc === '2.0' && 'id' in parsed) {
          payload = parsed;
          break;
        }
      } catch {
        /* skip */
      }
    }
    if (!payload) throw new Error(`MCP ${method}: no JSON-RPC response in SSE stream`);
  } else {
    payload = await res.json();
  }

  if (payload.error) {
    throw new Error(`MCP ${method} error: ${payload.error.message ?? JSON.stringify(payload.error)}`);
  }
  return { result: payload.result as T, sessionId: newSessionId ?? undefined };
}

export interface McpSession {
  url: string;
  headers: Record<string, string>;
  sessionId?: string;
}

export async function mcpInitialize(server: { url: string; headers: Record<string, string> }): Promise<McpSession> {
  const { sessionId } = await rpc(server.url, server.headers, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'lovable-mcp-chat', version: '1.0.0' },
  });
  // Some servers want a "notifications/initialized" notification
  try {
    await fetch(server.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
        ...server.headers,
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
  } catch {
    /* best effort */
  }
  return { url: server.url, headers: server.headers, sessionId };
}

export async function mcpListTools(session: McpSession): Promise<McpTool[]> {
  const { result } = await rpc<{ tools: McpTool[] }>(
    session.url,
    session.headers,
    'tools/list',
    {},
    session.sessionId,
  );
  return result.tools ?? [];
}

export async function mcpCallTool(
  session: McpSession,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { result } = await rpc<unknown>(
    session.url,
    session.headers,
    'tools/call',
    { name, arguments: args },
    session.sessionId,
  );
  return result;
}
