import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db.server";
import { getUserFromRequest, isAuthRequired } from "@/lib/auth.server";

export const Route = createFileRoute("/api/conversations/ensure")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authRequired = isAuthRequired();
        const user = await getUserFromRequest(request);
        if (authRequired && !user) {
          return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
        }

        try {
          const scopeSql = user ? `c.user_id = $1` : `c.user_id IS NULL`;
          const scopeParams = user ? [user.id] : [];

          const existing = await pool.query<{ id: string }>(
            `SELECT c.id
             FROM public.conversations c
             WHERE ${scopeSql}
               AND NOT EXISTS (
                 SELECT 1
                 FROM public.messages m
                 WHERE m.conversation_id = c.id
             )
             ORDER BY c.updated_at DESC
             LIMIT 1`,
            scopeParams as never,
          );

          if (existing.rows[0]?.id) {
            return Response.json({ ok: true, conversationId: existing.rows[0].id, reused: true });
          }

          const inserted = await pool.query<{ id: string }>(
            `INSERT INTO public.conversations (title, user_id)
             VALUES ('Nouvelle conversation', $1)
             RETURNING id`,
            [user?.id ?? null] as never,
          );

          return Response.json({
            ok: true,
            conversationId: inserted.rows[0]?.id ?? null,
            reused: false,
          });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : "Failed to ensure conversation" },
            { status: 500 },
          );
        }
      },
    },
  },
});
