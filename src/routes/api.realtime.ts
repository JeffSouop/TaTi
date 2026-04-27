/**
 * Endpoint GET /api/realtime
 *
 * Stream SSE qui pousse un événement à chaque INSERT/UPDATE/DELETE
 * sur les tables suivies (via Postgres LISTEN/NOTIFY + trigger côté DB).
 *
 * Le client appelle :
 *   const es = new EventSource("/api/realtime?tables=conversations,messages");
 *   es.addEventListener("change", (e) => { JSON.parse(e.data) });
 */
import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db.server";

const ALLOWED_TABLES = new Set([
  "app_settings",
  "llm_providers",
  "mcp_servers",
  "conversations",
  "messages",
]);
const CHANNEL = "tati_changes";

export const Route = createFileRoute("/api/realtime")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const tablesParam = url.searchParams.get("tables") ?? "";
        const wanted = new Set(
          tablesParam
            .split(",")
            .map((t) => t.trim())
            .filter((t) => ALLOWED_TABLES.has(t))
        );

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            const send = (event: string, payload: unknown) => {
              const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
              try {
                controller.enqueue(encoder.encode(data));
              } catch {
                /* stream closed */
              }
            };

            // Connexion dédiée pour LISTEN
            const client = await pool.connect();
            const onNotify = (msg: { channel: string; payload?: string }) => {
              if (msg.channel !== CHANNEL || !msg.payload) return;
              try {
                const evt = JSON.parse(msg.payload) as {
                  table: string;
                  event: "INSERT" | "UPDATE" | "DELETE";
                  new?: unknown;
                  old?: unknown;
                };
                if (wanted.size > 0 && !wanted.has(evt.table)) return;
                send("change", evt);
              } catch {
                /* ignore */
              }
            };

            client.on("notification", onNotify);
            await client.query(`LISTEN ${CHANNEL}`);
            send("ready", { tables: [...wanted] });

            // Heartbeat toutes les 25s pour garder la connexion
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`: hb\n\n`));
              } catch {
                /* closed */
              }
            }, 25_000);

            const cleanup = async () => {
              clearInterval(heartbeat);
              client.off("notification", onNotify);
              try {
                await client.query(`UNLISTEN ${CHANNEL}`);
              } catch {
                /* ignore */
              }
              client.release();
              try {
                controller.close();
              } catch {
                /* already closed */
              }
            };

            request.signal.addEventListener("abort", () => {
              void cleanup();
            });
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
