/**
 * Endpoint POST /api/db
 *
 * Reçoit un descripteur d'opération JSON depuis le wrapper navigateur
 * (`@/integrations/supabase/client`) et l'exécute via `pg` côté serveur.
 *
 * Format :
 *   {
 *     table: string,
 *     op: "select" | "insert" | "update" | "delete",
 *     columns?: string,         // pour select
 *     values?: object | object[], // pour insert/update
 *     filters?: { col, op: "eq"|"neq", val }[],
 *     order?: { col, ascending: boolean },
 *     limit?: number,
 *     count?: "exact",
 *     head?: boolean,
 *     returning?: boolean,      // si true, RETURNING * sur insert/update/delete
 *     single?: boolean,
 *   }
 */
import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db.server";
import { getUserFromRequest, isAuthRequired } from "@/lib/auth.server";

interface OpRequest {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  columns?: string;
  values?: Record<string, unknown> | Record<string, unknown>[];
  filters?: { col: string; op: "eq" | "neq"; val: unknown }[];
  order?: { col: string; ascending: boolean };
  limit?: number;
  count?: "exact";
  head?: boolean;
  returning?: boolean;
  single?: boolean;
}

const ALLOWED_TABLES = new Set([
  "app_settings",
  "llm_providers",
  "mcp_servers",
  "conversations",
  "messages",
]);

const USER_SCOPED_TABLES = new Set(["conversations", "messages"]);
const ADMIN_ONLY_TABLES = new Set(["mcp_servers"]);

function whereClause(filters: OpRequest["filters"], startIndex = 1) {
  if (!filters || filters.length === 0) return { sql: "", params: [] as unknown[] };
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;
  for (const f of filters) {
    const opSql = f.op === "eq" ? "=" : "!=";
    parts.push(`"${f.col}" ${opSql} $${i++}`);
    params.push(f.val);
  }
  return { sql: ` WHERE ${parts.join(" AND ")}`, params };
}

export const Route = createFileRoute("/api/db")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: OpRequest;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: { message: "Invalid JSON" } }, { status: 400 });
        }

        if (!body.table || !ALLOWED_TABLES.has(body.table)) {
          return Response.json(
            { error: { message: `Table not allowed: ${body.table}` } },
            { status: 400 },
          );
        }

        const authRequired = isAuthRequired();
        const user = await getUserFromRequest(request);
        if (authRequired && !user) {
          return Response.json({ error: { message: "Authentication required" } }, { status: 401 });
        }
        if (
          authRequired &&
          user &&
          user.role !== "admin" &&
          ((ADMIN_ONLY_TABLES.has(body.table) && body.op !== "select") ||
            (body.table === "llm_providers" && body.op !== "select"))
        ) {
          return Response.json({ error: { message: "Forbidden" } }, { status: 403 });
        }

        const applyUserScope = Boolean(user) && USER_SCOPED_TABLES.has(body.table);
        const scopedFilters = [...(body.filters ?? [])];
        if (applyUserScope) {
          scopedFilters.push({ col: "user_id", op: "eq", val: user!.id });
        }

        try {
          if (body.op === "select") {
            const where = whereClause(scopedFilters);
            let count: number | null = null;
            if (body.count === "exact") {
              const cRes = await pool.query<{ c: string }>(
                `SELECT COUNT(*)::text AS c FROM public."${body.table}"${where.sql}`,
                where.params as never,
              );
              count = Number(cRes.rows[0]?.c ?? 0);
            }
            if (body.head) {
              return Response.json({ data: null, error: null, count });
            }
            const cols = body.columns || "*";
            let sql = `SELECT ${cols} FROM public."${body.table}"${where.sql}`;
            if (body.order) {
              sql += ` ORDER BY "${body.order.col}" ${body.order.ascending ? "ASC" : "DESC"}`;
            }
            if (body.limit !== undefined) sql += ` LIMIT ${body.limit}`;
            const res = await pool.query(sql, where.params as never);
            const data = body.single ? (res.rows[0] ?? null) : res.rows;
            return Response.json({ data, error: null, count });
          }

          if (body.op === "insert") {
            const rowsArr = Array.isArray(body.values) ? body.values : [body.values!];
            if (rowsArr.length === 0) {
              return Response.json(
                { data: null, error: { message: "No rows to insert" } },
                { status: 400 },
              );
            }
            if (applyUserScope) {
              for (const row of rowsArr) {
                row.user_id = user!.id;
              }
            }
            const cols = Object.keys(rowsArr[0]);
            const valuesSql: string[] = [];
            const params: unknown[] = [];
            let i = 1;
            for (const row of rowsArr) {
              const placeholders = cols.map(() => `$${i++}`);
              valuesSql.push(`(${placeholders.join(", ")})`);
              for (const c of cols) params.push(row[c]);
            }
            const returning = body.returning || body.single ? " RETURNING *" : "";
            const sql = `INSERT INTO public."${body.table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${valuesSql.join(", ")}${returning}`;
            const res = await pool.query(sql, params as never);
            const data = body.single ? (res.rows[0] ?? null) : returning ? res.rows : null;
            return Response.json({ data, error: null });
          }

          if (body.op === "update") {
            const v = body.values as Record<string, unknown>;
            const setCols = Object.keys(v);
            if (setCols.length === 0) {
              return Response.json(
                { data: null, error: { message: "No fields to update" } },
                { status: 400 },
              );
            }
            let i = 1;
            const setSql = setCols.map((c) => `"${c}" = $${i++}`).join(", ");
            const params: unknown[] = setCols.map((c) => v[c]);
            const where = whereClause(scopedFilters, i);
            params.push(...where.params);
            const returning = body.returning || body.single ? " RETURNING *" : "";
            const sql = `UPDATE public."${body.table}" SET ${setSql}${where.sql}${returning}`;
            const res = await pool.query(sql, params as never);
            const data = body.single ? (res.rows[0] ?? null) : returning ? res.rows : null;
            return Response.json({ data, error: null });
          }

          if (body.op === "delete") {
            const where = whereClause(scopedFilters);
            const returning = body.returning || body.single ? " RETURNING *" : "";
            const sql = `DELETE FROM public."${body.table}"${where.sql}${returning}`;
            const res = await pool.query(sql, where.params as never);
            const data = body.single ? (res.rows[0] ?? null) : returning ? res.rows : null;
            return Response.json({ data, error: null });
          }

          return Response.json({ error: { message: `Unknown op: ${body.op}` } }, { status: 400 });
        } catch (e) {
          return Response.json(
            { data: null, error: { message: e instanceof Error ? e.message : "DB error" } },
            { status: 500 },
          );
        }
      },
    },
  },
});
