import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db.server";
import { getUserFromRequest, hashPassword, verifyPassword } from "@/lib/auth.server";

type Body = {
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

export const Route = createFileRoute("/api/auth/profile")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const me = await getUserFromRequest(request);
        if (!me) return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }

        const nextEmail = body.email ? String(body.email).trim().toLowerCase() : null;
        const nextFirstName = body.firstName !== undefined ? String(body.firstName).trim() : null;
        const nextLastName = body.lastName !== undefined ? String(body.lastName).trim() : null;
        const nextAvatarUrl = body.avatarUrl !== undefined ? (body.avatarUrl ? String(body.avatarUrl).trim() : null) : undefined;
        const currentPassword = body.currentPassword ? String(body.currentPassword) : null;
        const newPassword = body.newPassword ? String(body.newPassword) : null;

        if (!nextEmail && !newPassword && nextFirstName === null && nextLastName === null && nextAvatarUrl === undefined) {
          return Response.json({ ok: false, error: "Nothing to update" }, { status: 400 });
        }

        if (newPassword && (!currentPassword || newPassword.length < 4)) {
          return Response.json(
            { ok: false, error: "currentPassword requis et newPassword doit avoir au moins 4 caracteres" },
            { status: 400 },
          );
        }

        if (newPassword) {
          const { rows } = await pool.query<{ password_hash: string }>(
            `SELECT password_hash FROM public.users WHERE id = $1 LIMIT 1`,
            [me.id] as never,
          );
          const stored = rows[0]?.password_hash;
          if (!stored || !verifyPassword(currentPassword!, stored)) {
            return Response.json({ ok: false, error: "Mot de passe actuel invalide" }, { status: 401 });
          }
        }

        if (nextEmail) {
          await pool.query(`UPDATE public.users SET email = $2 WHERE id = $1`, [me.id, nextEmail] as never);
        }
        if (nextFirstName !== null) {
          await pool.query(`UPDATE public.users SET first_name = $2 WHERE id = $1`, [me.id, nextFirstName] as never);
        }
        if (nextLastName !== null) {
          await pool.query(`UPDATE public.users SET last_name = $2 WHERE id = $1`, [me.id, nextLastName] as never);
        }
        if (nextAvatarUrl !== undefined) {
          await pool.query(`UPDATE public.users SET avatar_url = $2 WHERE id = $1`, [me.id, nextAvatarUrl] as never);
        }
        if (newPassword) {
          await pool.query(`UPDATE public.users SET password_hash = $2 WHERE id = $1`, [me.id, hashPassword(newPassword)] as never);
        }

        const { rows } = await pool.query(
          `SELECT id, email, first_name, last_name, avatar_url, role, is_active FROM public.users WHERE id = $1 LIMIT 1`,
          [me.id] as never,
        );
        return Response.json({ ok: true, user: rows[0] ?? null });
      },
    },
  },
});
