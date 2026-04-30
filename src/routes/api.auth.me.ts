import { createFileRoute } from "@tanstack/react-router";
import { getUserFromRequest, isAuthRequired } from "@/lib/auth.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user && isAuthRequired()) {
          return Response.json(
            { ok: false, authenticated: false, authRequired: true },
            { status: 401 },
          );
        }
        return Response.json({
          ok: true,
          authenticated: Boolean(user),
          user,
          authRequired: isAuthRequired(),
        });
      },
    },
  },
});
