import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db.server";
import { getUserFromRequest, hashPassword, isAuthRequired } from "@/lib/auth.server";

type CreateUserBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  role?: "admin" | "member";
};

type UpdateUserBody = {
  id?: string;
  role?: "admin" | "member";
  is_active?: boolean;
};

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthRequired()) return Response.json({ ok: false, error: "Auth is disabled" }, { status: 400 });
        const me = await getUserFromRequest(request);
        if (!me || me.role !== "admin") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        const { rows } = await pool.query(
          `SELECT id, email, first_name, last_name, avatar_url, role, is_active, created_at
           FROM public.users
           ORDER BY created_at ASC`,
        );
        return Response.json({ ok: true, users: rows });
      },
      POST: async ({ request }) => {
        if (!isAuthRequired()) return Response.json({ ok: false, error: "Auth is disabled" }, { status: 400 });
        const me = await getUserFromRequest(request);
        if (!me || me.role !== "admin") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        let body: CreateUserBody;
        try {
          body = (await request.json()) as CreateUserBody;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        const firstName = String(body.firstName ?? "").trim();
        const lastName = String(body.lastName ?? "").trim();
        const avatarUrl = body.avatarUrl ? String(body.avatarUrl).trim() : null;
        const role = body.role === "admin" ? "admin" : "member";
        if (!email || !password) {
          return Response.json({ ok: false, error: "email and password are required" }, { status: 400 });
        }
        const { rows } = await pool.query(
          `INSERT INTO public.users (email, password_hash, first_name, last_name, avatar_url, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           RETURNING id, email, first_name, last_name, avatar_url, role, is_active, created_at`,
          [email, hashPassword(password), firstName, lastName, avatarUrl, role] as never,
        );
        return Response.json({ ok: true, user: rows[0] });
      },
      PATCH: async ({ request }) => {
        if (!isAuthRequired()) return Response.json({ ok: false, error: "Auth is disabled" }, { status: 400 });
        const me = await getUserFromRequest(request);
        if (!me || me.role !== "admin") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        let body: UpdateUserBody;
        try {
          body = (await request.json()) as UpdateUserBody;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }
        const id = String(body.id ?? "").trim();
        if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });

        if (id === me.id && body.role) {
          return Response.json({ ok: false, error: "Un admin ne peut pas modifier son propre role" }, { status: 400 });
        }
        if (id === me.id && body.is_active === false) {
          return Response.json({ ok: false, error: "Un admin ne peut pas desactiver son propre compte" }, { status: 400 });
        }

        if (body.role) {
          await pool.query(`UPDATE public.users SET role = $2 WHERE id = $1`, [id, body.role] as never);
        }
        if (typeof body.is_active === "boolean") {
          await pool.query(`UPDATE public.users SET is_active = $2 WHERE id = $1`, [id, body.is_active] as never);
        }
        const { rows } = await pool.query(
          `SELECT id, email, first_name, last_name, avatar_url, role, is_active, created_at FROM public.users WHERE id = $1 LIMIT 1`,
          [id] as never,
        );
        return Response.json({ ok: true, user: rows[0] ?? null });
      },
      DELETE: async ({ request }) => {
        if (!isAuthRequired()) return Response.json({ ok: false, error: "Auth is disabled" }, { status: 400 });
        const me = await getUserFromRequest(request);
        if (!me || me.role !== "admin") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });
        if (id === me.id) return Response.json({ ok: false, error: "Cannot delete current admin" }, { status: 400 });
        await pool.query(`DELETE FROM public.user_sessions WHERE user_id = $1`, [id] as never);
        await pool.query(`DELETE FROM public.users WHERE id = $1`, [id] as never);
        return Response.json({ ok: true });
      },
    },
  },
});
