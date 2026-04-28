import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, Server, Wrench, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface McpServer {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  enabled: boolean;
}

const PRESETS: Array<{ label: string; name: string; url: string; hint: string }> = [
  { label: "PostgreSQL", name: "PostgreSQL", url: "http://mcp-postgres:8002/mcp", hint: "Service docker local mcp-postgres" },
  { label: "PDF", name: "PDF Generator", url: "http://mcp-pdf:8003/mcp", hint: "Génération de PDF (service docker local)" },
  { label: "Notion", name: "Notion", url: "http://mcp-notion:8004/mcp", hint: "Service officiel Notion MCP" },
  { label: "Slack", name: "Slack", url: "http://mcp-slack:8006/mcp", hint: "Bridge Slack MCP local (messages + channels)" },
  { label: "MySQL", name: "MySQL", url: "https://YOUR-TUNNEL/mysql/mcp", hint: "Sert via mcp-server-mysql" },
  { label: "Dagster", name: "Dagster", url: "https://YOUR-TUNNEL/dagster/mcp", hint: "Sert via mcp-server-dagster" },
  { label: "Moodle", name: "Moodle", url: "https://YOUR-TUNNEL/moodle/mcp", hint: "Projet open source moodle-mcp" },
  { label: "OpenMetadata", name: "OpenMetadata", url: "https://YOUR-OM-INSTANCE/mcp", hint: "Serveur MCP intégré à OpenMetadata" },
  { label: "Fetch (universel)", name: "Fetch", url: "https://YOUR-TUNNEL/fetch/mcp", hint: "Pour APIs sans serveur MCP dédié (ex. Hyperplanning)" },
];

export function McpServersSettings() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<Record<string, Array<{ name: string; description?: string }>>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const load = async () => {
    const { data } = await supabase.from("mcp_servers").select("*").order("created_at");
    setServers((data ?? []) as McpServer[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: string, enabled: boolean) => {
    await supabase.from("mcp_servers").update({ enabled }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce serveur MCP ?")) return;
    await supabase.from("mcp_servers").delete().eq("id", id);
    load();
  };

  const testServer = async (s: McpServer) => {
    setTesting((t) => ({ ...t, [s.id]: true }));
    try {
      const res = await fetch("/api/test-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: s.url, headers: s.headers }),
      });
      const data = await res.json();
      if (data.ok) {
        setTools((t) => ({ ...t, [s.id]: data.tools }));
        toast.success(`${s.name} : ${data.tools.length} outil(s) trouvé(s)`);
      } else {
        toast.error(`${s.name} : ${data.error}`);
        setTools((t) => ({ ...t, [s.id]: [] }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setTesting((t) => ({ ...t, [s.id]: false }));
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Chaque serveur MCP doit être accessible publiquement (HTTPS). Voir l'onglet "Démarrage rapide".
        </p>
        <AddServerDialog onCreated={load} />
      </div>

      {servers.length === 0 && (
        <Card className="p-8 text-center">
          <Server className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Aucun serveur MCP configuré.</p>
          <AddServerDialog onCreated={load} />
        </Card>
      )}

      {servers.map((s) => (
        <Card key={s.id} className="p-4">
          <div className="flex items-start gap-3">
            <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s.id, v)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-medium text-sm">{s.name}</h3>
                {!s.enabled && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    désactivé
                  </span>
                )}
              </div>
              <code className="text-xs text-muted-foreground break-all">{s.url}</code>

              {tools[s.id] && tools[s.id].length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Outils exposés ({tools[s.id].length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tools[s.id].map((t) => (
                      <span
                        key={t.name}
                        title={t.description}
                        className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                      >
                        <Wrench className="h-2.5 w-2.5" />
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => testServer(s)} disabled={testing[s.id]}>
                {testing[s.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AddServerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const reset = () => {
    setName("");
    setUrl("");
    setHeadersText("");
    setTestResult(null);
  };

  const parseHeaders = (): Record<string, string> => {
    if (!headersText.trim()) return {};
    try {
      return JSON.parse(headersText);
    } catch {
      throw new Error("Headers invalides : JSON attendu (ex. {\"Authorization\": \"Bearer xxx\"})");
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const headers = parseHeaders();
      const res = await fetch("/api/test-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, headers }),
      });
      const data = await res.json();
      setTestResult({
        ok: data.ok,
        message: data.ok ? `✓ Connexion OK. ${data.tools?.length ?? 0} outil(s) trouvé(s).` : data.error,
      });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const headers = parseHeaders();
      const { error } = await supabase.from("mcp_servers").insert({ name, url, headers, enabled: true });
      if (error) throw error;
      toast.success("Serveur ajouté");
      reset();
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setSaving(false);
    }
  };

  const usePreset = (p: (typeof PRESETS)[number]) => {
    setName(p.name);
    setUrl(p.url);
    setTestResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Ajouter un serveur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau serveur MCP</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-1.5 block">Presets</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => usePreset(p)}
                  className="text-xs border border-border rounded px-2 py-1 hover:bg-muted transition"
                  title={p.hint}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="srv-name">Nom</Label>
            <Input id="srv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Postgres prod" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srv-url">URL Streamable HTTP</Label>
            <Input id="srv-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.example.com/postgres" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srv-headers">Headers (JSON, optionnel)</Label>
            <Textarea
              id="srv-headers"
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              placeholder='{"Authorization": "Bearer xxx"}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
          {testResult && (
            <div
              className={`text-xs flex items-start gap-1.5 ${
                testResult.ok ? "text-green-600" : "text-destructive"
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={test} disabled={testing || !url}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tester"}
          </Button>
          <Button onClick={save} disabled={saving || !name || !url}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
