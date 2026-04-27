import { createFileRoute } from '@tanstack/react-router';
import { mcpInitialize, mcpListTools } from '@/lib/mcp-client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const Route = createFileRoute('/api/test-mcp')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const { url, headers } = (await request.json()) as {
            url?: string;
            headers?: Record<string, string>;
          };
          if (!url) {
            return new Response(JSON.stringify({ ok: false, error: 'URL required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const session = await mcpInitialize({ url, headers: headers ?? {} });
          const tools = await mcpListTools(session);
          return new Response(
            JSON.stringify({
              ok: true,
              tools: tools.map((t) => ({ name: t.name, description: t.description })),
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } catch (e) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : 'MCP connection failed',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
