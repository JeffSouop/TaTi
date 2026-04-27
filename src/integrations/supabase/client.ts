// =============================================================================
// Wrapper compatible Supabase au-dessus de la route /api/db.
//
// REMPLACE l'ancien `createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)` :
// les composants React continuent d'utiliser `supabase.from(...).select()...`
// sans changement, mais les requêtes passent maintenant par /api/db (Postgres
// local) au lieu de Supabase Cloud.
//
// Couverture (suffisante pour ce projet) :
//   - from(table).select(cols, { count: "exact", head }).eq().neq().order().limit()
//   - .single() / .maybeSingle()
//   - .insert(values).select().single()
//   - .update(values).eq()...
//   - .delete().eq()...
//   - channel(name).on("postgres_changes", { table, event, schema }, cb).subscribe()
//   - removeChannel(channel)
// =============================================================================

const DB_ENDPOINT = "/api/db";
const REALTIME_ENDPOINT = "/api/realtime";

interface Filter {
  col: string;
  op: "eq" | "neq";
  val: unknown;
}

interface QueryState {
  table: string;
  columns: string;
  filters: Filter[];
  order?: { col: string; ascending: boolean };
  limit?: number;
  count?: "exact";
  head?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DbResult<T = any> {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
}

async function postOp(payload: unknown): Promise<DbResult> {
  try {
    const res = await fetch(DB_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as DbResult;
    if (!res.ok && !json.error) {
      return { data: null, error: { message: `HTTP ${res.status}` }, count: null };
    }
    return json;
  } catch (e) {
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : "Network error" },
      count: null,
    };
  }
}

// ---------------------------------------------------------------------------
// SELECT builder
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class SelectBuilder<T = any> implements PromiseLike<DbResult<T[]>> {
  constructor(private state: QueryState) {}

  eq(col: string, val: unknown) {
    this.state.filters.push({ col, op: "eq", val });
    return this;
  }
  neq(col: string, val: unknown) {
    this.state.filters.push({ col, op: "neq", val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.state.order = { col, ascending: opts?.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.state.limit = n;
    return this;
  }

  private async exec(extra: { single?: boolean } = {}): Promise<DbResult> {
    return postOp({
      table: this.state.table,
      op: "select",
      columns: this.state.columns,
      filters: this.state.filters,
      order: this.state.order,
      limit: this.state.limit,
      count: this.state.count,
      head: this.state.head,
      single: extra.single,
    });
  }

  async single(): Promise<DbResult<T>> {
    const r = await this.exec({ single: true });
    if (r.data === null && !r.error) {
      return { data: null, error: { message: "No rows found" }, count: r.count };
    }
    return r as DbResult<T>;
  }

  async maybeSingle(): Promise<DbResult<T>> {
    return (await this.exec({ single: true })) as DbResult<T>;
  }

  then<TResult1 = DbResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled as never, onrejected as never);
  }
}

// ---------------------------------------------------------------------------
// INSERT / UPDATE / DELETE builder
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class ModifyBuilder<T = any> implements PromiseLike<DbResult<T>> {
  private wantSelect = false;
  private filters: Filter[] = [];
  constructor(
    private table: string,
    private op: "insert" | "update" | "delete",
    private values?: Record<string, unknown> | Record<string, unknown>[]
  ) {}

  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }
  neq(col: string, val: unknown) {
    this.filters.push({ col, op: "neq", val });
    return this;
  }
  select(_cols = "*") {
    this.wantSelect = true;
    return this;
  }
  async single(): Promise<DbResult<T>> {
    return (await this.exec({ single: true })) as DbResult<T>;
  }
  async maybeSingle(): Promise<DbResult<T>> {
    return (await this.exec({ single: true })) as DbResult<T>;
  }

  private async exec(extra: { single?: boolean } = {}): Promise<DbResult> {
    return postOp({
      table: this.table,
      op: this.op,
      values: this.values,
      filters: this.filters,
      returning: this.wantSelect,
      single: extra.single,
    });
  }

  then<TResult1 = DbResult<T>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled as never, onrejected as never);
  }
}

// ---------------------------------------------------------------------------
// from(table)
// ---------------------------------------------------------------------------
class TableRef {
  constructor(private table: string) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select<T = any>(columns = "*", opts?: { count?: "exact"; head?: boolean }) {
    return new SelectBuilder<T>({
      table: this.table,
      columns,
      filters: [],
      count: opts?.count,
      head: opts?.head,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert<T = any>(values: Record<string, unknown> | Record<string, unknown>[]) {
    return new ModifyBuilder<T>(this.table, "insert", values);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update<T = any>(values: Record<string, unknown>) {
    return new ModifyBuilder<T>(this.table, "update", values);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete<T = any>() {
    return new ModifyBuilder<T>(this.table, "delete");
  }
}

// ---------------------------------------------------------------------------
// Realtime via SSE -> /api/realtime
// ---------------------------------------------------------------------------
type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
type ChangeCallback = (payload: {
  eventType: ChangeEvent;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
  table: string;
  schema: string;
}) => void;

interface ListenSpec {
  table?: string;
  event?: ChangeEvent;
  schema?: string;
  cb: ChangeCallback;
}

class RealtimeChannel {
  private listeners: ListenSpec[] = [];
  private es?: EventSource;
  constructor(public name: string) {}

  on(_kind: "postgres_changes", filter: { event?: ChangeEvent; schema?: string; table?: string }, cb: ChangeCallback) {
    this.listeners.push({ event: filter.event ?? "*", schema: filter.schema, table: filter.table, cb });
    return this;
  }

  subscribe() {
    if (typeof window === "undefined") return this; // pas de SSE côté SSR
    const tables = [...new Set(this.listeners.map((l) => l.table).filter(Boolean) as string[])];
    const url = `${REALTIME_ENDPOINT}?tables=${encodeURIComponent(tables.join(","))}`;
    this.es = new EventSource(url);
    this.es.addEventListener("change", (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data) as {
          table: string;
          event: "INSERT" | "UPDATE" | "DELETE";
          new?: Record<string, unknown>;
          old?: Record<string, unknown>;
        };
        for (const l of this.listeners) {
          if (l.table && l.table !== payload.table) continue;
          if (l.event && l.event !== "*" && l.event !== payload.event) continue;
          l.cb({
            eventType: payload.event,
            new: payload.new ?? null,
            old: payload.old ?? null,
            table: payload.table,
            schema: "public",
          });
        }
      } catch {
        /* ignore */
      }
    });
    return this;
  }

  unsubscribe() {
    this.es?.close();
    this.es = undefined;
  }
}

// ---------------------------------------------------------------------------
// Façade Supabase-like
// ---------------------------------------------------------------------------
function createDbClient() {
  return {
    from(table: string) {
      return new TableRef(table);
    },
    channel(name: string) {
      return new RealtimeChannel(name);
    },
    removeChannel(ch: RealtimeChannel) {
      ch.unsubscribe();
    },
  };
}

export const supabase = createDbClient();
export type SupabaseClient = ReturnType<typeof createDbClient>;
