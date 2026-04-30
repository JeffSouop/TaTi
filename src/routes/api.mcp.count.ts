import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db.server";
import { getUserFromRequest, isAuthRequired } from "@/lib/auth.server";

export const Route = createFileRoute("/api/mcp/count")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authRequired = isAuthRequired();
        const user = await getUserFromRequest(request);
        if (authRequired && !user) {
          return Response.json({ ok: true, count: 0 });
        }

        const enabled = await pool.query<{ id: string }>(
          `SELECT id FROM public.mcp_servers WHERE enabled = true`,
        );
        const enabledIds = enabled.rows.map((r) => r.id);
        if (enabledIds.length === 0) return Response.json({ ok: true, count: 0 });

        if (!authRequired || !user || user.role === "admin") {
          return Response.json({ ok: true, count: enabledIds.length });
        }

        const access = await pool.query<{ mcp_server_id: string; allowed: boolean }>(
          `SELECT mcp_server_id, allowed
           FROM public.user_mcp_access
           WHERE user_id = $1`,
          [user.id] as never,
        );

        if (access.rows.length === 0) {
          return Response.json({ ok: true, count: enabledIds.length });
        }

        const allowedSet = new Set(
          access.rows.filter((r) => r.allowed).map((r) => r.mcp_server_id),
        );
        const count = enabledIds.filter((id) => allowedSet.has(id)).length;
        return Response.json({ ok: true, count });
      },
    },
  },
});
