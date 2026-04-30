import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db.server";
import { getUserFromRequest, isAuthRequired } from "@/lib/auth.server";

type UpsertBody = {
  userId?: string;
  serverId?: string;
  allowed?: boolean;
};

export const Route = createFileRoute("/api/admin/user-access")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthRequired()) return Response.json({ ok: false, error: "Auth is disabled" }, { status: 400 });
        const me = await getUserFromRequest(request);
        if (!me || me.role !== "admin") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        const url = new URL(request.url);
        const userId = url.searchParams.get("userId");
        if (!userId) return Response.json({ ok: false, error: "userId is required" }, { status: 400 });
        const { rows } = await pool.query<{ mcp_server_id: string; allowed: boolean }>(
          `SELECT mcp_server_id, allowed
           FROM public.user_mcp_access
           WHERE user_id = $1`,
          [userId] as never,
        );
        return Response.json({ ok: true, access: rows });
      },
      POST: async ({ request }) => {
        if (!isAuthRequired()) return Response.json({ ok: false, error: "Auth is disabled" }, { status: 400 });
        const me = await getUserFromRequest(request);
        if (!me || me.role !== "admin") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        let body: UpsertBody;
        try {
          body = (await request.json()) as UpsertBody;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }
        const userId = String(body.userId ?? "").trim();
        const serverId = String(body.serverId ?? "").trim();
        const allowed = body.allowed !== false;
        if (!userId || !serverId) {
          return Response.json({ ok: false, error: "userId and serverId are required" }, { status: 400 });
        }
        await pool.query(
          `INSERT INTO public.user_mcp_access (user_id, mcp_server_id, allowed)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, mcp_server_id)
           DO UPDATE SET allowed = EXCLUDED.allowed`,
          [userId, serverId, allowed] as never,
        );
        return Response.json({ ok: true });
      },
    },
  },
});
