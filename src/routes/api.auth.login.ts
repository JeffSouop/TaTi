import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db.server";
import {
  buildSessionCookie,
  createSession,
  getUserFromRequest,
  hashPassword,
  isAuthRequired,
  verifyPassword,
} from "@/lib/auth.server";

type LoginBody = {
  email?: string;
  password?: string;
};

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: LoginBody;
        try {
          body = (await request.json()) as LoginBody;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }

        const email = String(body.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(body.password ?? "");
        if (!email || !password) {
          return Response.json(
            { ok: false, error: "email and password are required" },
            { status: 400 },
          );
        }

        if (isAuthRequired()) {
          const c = await pool.query<{ c: string }>("SELECT COUNT(*)::text AS c FROM public.users");
          if (Number(c.rows[0]?.c ?? 0) === 0) {
            await pool.query(
              `INSERT INTO public.users (email, password_hash, first_name, last_name, role, is_active)
               VALUES ($1, $2, $3, $4, 'admin', true)`,
              ["admin@tati.com", hashPassword("admin"), "Admin", "TaTi"] as never,
            );
          }
        }

        const { rows } = await pool.query<{
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          role: "admin" | "member";
          is_active: boolean;
          password_hash: string;
        }>(
          `SELECT id, email, first_name, last_name, avatar_url, role, is_active, password_hash
           FROM public.users
           WHERE email = $1
           LIMIT 1`,
          [email] as never,
        );
        const user = rows[0];
        if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
          return Response.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
        }

        const { token, expiresAt } = await createSession(user.id);
        return new Response(
          JSON.stringify({
            ok: true,
            user: {
              id: user.id,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              avatar_url: user.avatar_url,
              role: user.role,
              is_active: user.is_active,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": buildSessionCookie(token, expiresAt),
            },
          },
        );
      },
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        return Response.json({ ok: true, authenticated: Boolean(user), user });
      },
    },
  },
});
