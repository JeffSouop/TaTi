/**
 * Pool Postgres unique (server-only).
 *
 * Remplace l'usage de Supabase. Lecture/écriture directes via `pg`.
 * NE JAMAIS importer ce fichier dans du code client : le bundler le bloque
 * pour les fichiers `.server.*`.
 */
import { Pool, type QueryResult, type QueryResultRow } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function makePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL n'est pas défini. Ajoute-le dans .env (cf. .env.example).");
  }
  return new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

// Réutilise le pool entre les hot-reloads en dev.
export const pool: Pool = globalThis.__pgPool ?? (globalThis.__pgPool = makePool());

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never);
}

/**
 * Helper "admin" qui mime l'API Supabase côté serveur.
 * Utilisable depuis les server functions / server routes pour éviter un
 * roundtrip HTTP local.
 */
export const dbAdmin = {
  from(table: string) {
    return new ServerQueryBuilder(table);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface Filter {
  col: string;
  op: "eq" | "neq";
  val: unknown;
}

class ServerQueryBuilder {
  private filters: Filter[] = [];
  private orderBy?: { col: string; ascending: boolean };
  private limitN?: number;
  private selectCols = "*";
  private countMode: "exact" | null = null;
  private headOnly = false;

  constructor(private table: string) {}

  select(cols = "*", opts?: { count?: "exact"; head?: boolean }) {
    this.selectCols = cols;
    if (opts?.count === "exact") this.countMode = "exact";
    if (opts?.head) this.headOnly = true;
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  order(col: string, opts: { ascending: boolean }) {
    this.orderBy = { col, ascending: opts.ascending };
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private whereSql(startIndex = 1): { sql: string; params: unknown[] } {
    if (this.filters.length === 0) return { sql: "", params: [] };
    const parts: string[] = [];
    const params: unknown[] = [];
    let i = startIndex;
    for (const f of this.filters) {
      const opSql = f.op === "eq" ? "=" : "!=";
      parts.push(`"${f.col}" ${opSql} $${i++}`);
      params.push(f.val);
    }
    return { sql: ` WHERE ${parts.join(" AND ")}`, params };
  }

  async run(): Promise<{ data: Any; error: { message: string } | null; count: number | null }> {
    return this.runSelect();
  }

  // --- terminal: SELECT ----------------------------------------------------
  private async runSelect(): Promise<{
    data: Any;
    error: { message: string } | null;
    count: number | null;
  }> {
    try {
      const { sql: whereSql, params } = this.whereSql();
      let count: number | null = null;
      if (this.countMode === "exact") {
        const cRes = await pool.query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM public."${this.table}"${whereSql}`,
          params as never,
        );
        count = Number(cRes.rows[0]?.c ?? 0);
      }
      if (this.headOnly) return { data: null, error: null, count };

      let sql = `SELECT ${this.selectCols} FROM public."${this.table}"${whereSql}`;
      if (this.orderBy) {
        sql += ` ORDER BY "${this.orderBy.col}" ${this.orderBy.ascending ? "ASC" : "DESC"}`;
      }
      if (this.limitN !== undefined) sql += ` LIMIT ${this.limitN}`;
      const res = await pool.query(sql, params as never);
      return { data: res.rows, error: null, count };
    } catch (e) {
      return {
        data: null,
        error: { message: e instanceof Error ? e.message : "DB error" },
        count: null,
      };
    }
  }

  async single(): Promise<{ data: Any; error: { message: string } | null; count: number | null }> {
    const r = await this.runSelect();
    if (r.error) return r;
    const rows = (r.data as unknown[]) ?? [];
    if (rows.length === 0)
      return { data: null, error: { message: "No rows found" }, count: r.count };
    return { data: rows[0], error: null, count: r.count };
  }

  async maybeSingle(): Promise<{
    data: Any;
    error: { message: string } | null;
    count: number | null;
  }> {
    const r = await this.runSelect();
    if (r.error) return r;
    const rows = (r.data as unknown[]) ?? [];
    return { data: rows[0] ?? null, error: null, count: r.count };
  }

  // Permet d'awaiter directement (sans .single()) — équivalent .select() final.
  then<TResult1 = Any, TResult2 = never>(
    onfulfilled?: (value: {
      data: Any;
      error: { message: string } | null;
      count: number | null;
    }) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>,
  ): Promise<TResult1 | TResult2> {
    return this.runSelect().then(onfulfilled, onrejected);
  }

  // --- INSERT --------------------------------------------------------------
  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    return new InsertOrModify(this.table, "insert", { values });
  }

  // --- UPDATE --------------------------------------------------------------
  update(values: Record<string, unknown>) {
    return new InsertOrModify(this.table, "update", { values, filters: this.filters });
  }

  // --- DELETE --------------------------------------------------------------
  delete() {
    return new InsertOrModify(this.table, "delete", { filters: this.filters });
  }
}

interface ModifyArgs {
  values?: Record<string, unknown> | Record<string, unknown>[];
  filters?: Filter[];
}

class InsertOrModify {
  private wantSelect = false;
  private wantSingle = false;
  constructor(
    private table: string,
    private op: "insert" | "update" | "delete",
    private args: ModifyArgs,
  ) {}

  select(_cols = "*") {
    this.wantSelect = true;
    return this;
  }

  async single(): Promise<{ data: Any; error: { message: string } | null }> {
    this.wantSingle = true;
    return this.run();
  }

  // eq/neq pour update/delete
  eq(col: string, val: unknown) {
    this.args.filters = [...(this.args.filters ?? []), { col, op: "eq", val }];
    return this;
  }

  neq(col: string, val: unknown) {
    this.args.filters = [...(this.args.filters ?? []), { col, op: "neq", val }];
    return this;
  }

  then<TResult1 = Any, TResult2 = never>(
    onfulfilled?: (value: {
      data: Any;
      error: { message: string } | null;
    }) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private buildWhere(startIndex: number) {
    const filters = this.args.filters ?? [];
    if (filters.length === 0) return { sql: "", params: [] as unknown[] };
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

  async run(): Promise<{ data: Any; error: { message: string } | null }> {
    try {
      let sql = "";
      let params: unknown[] = [];
      const returning = this.wantSelect || this.wantSingle ? " RETURNING *" : "";

      if (this.op === "insert") {
        const rowsArr = Array.isArray(this.args.values) ? this.args.values : [this.args.values!];
        if (rowsArr.length === 0) return { data: null, error: { message: "No rows to insert" } };
        const cols = Object.keys(rowsArr[0]);
        const valuesSql: string[] = [];
        let i = 1;
        for (const row of rowsArr) {
          const placeholders = cols.map(() => `$${i++}`);
          valuesSql.push(`(${placeholders.join(", ")})`);
          for (const c of cols) params.push(row[c]);
        }
        sql = `INSERT INTO public."${this.table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${valuesSql.join(", ")}${returning}`;
      } else if (this.op === "update") {
        const v = this.args.values as Record<string, unknown>;
        const setCols = Object.keys(v);
        if (setCols.length === 0) return { data: null, error: { message: "No fields to update" } };
        let i = 1;
        const setSql = setCols.map((c) => `"${c}" = $${i++}`).join(", ");
        params = setCols.map((c) => v[c]);
        const where = this.buildWhere(i);
        params.push(...where.params);
        sql = `UPDATE public."${this.table}" SET ${setSql}${where.sql}${returning}`;
      } else {
        // delete
        const where = this.buildWhere(1);
        params = where.params;
        sql = `DELETE FROM public."${this.table}"${where.sql}${returning}`;
      }

      const res = await pool.query(sql, params as never);
      if (this.wantSingle) {
        return { data: res.rows[0] ?? null, error: null };
      }
      if (this.wantSelect) {
        return { data: res.rows, error: null };
      }
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : "DB error" } };
    }
  }
}
