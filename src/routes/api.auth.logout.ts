import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, readSessionTokenFromRequest, revokeSession } from "@/lib/auth.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = readSessionTokenFromRequest(request);
        await revokeSession(token);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": clearSessionCookie(),
          },
        });
      },
    },
  },
});
