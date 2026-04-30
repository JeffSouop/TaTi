import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, Server, Wrench, RefreshCw, Database, FileText, Folder, Tags, Globe, Workflow, MessageSquare, Gamepad2, Cloud, Mail, GitBranch, Search, GraduationCap, Notebook, HardDrive, CalendarDays } from "lucide-react";
import { toast } from "sonner";

interface McpServer {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  enabled: boolean;
}

const PRESETS: Array<{ label: string; name: string; url: string; hint: string; icon: ReactNode }> = [
  { label: "PostgreSQL", name: "PostgreSQL", url: "http://mcp-postgres:8002/mcp", hint: "Service docker local mcp-postgres", icon: <Database className="h-3.5 w-3.5 text-sky-700" /> },
  { label: "PDF", name: "PDF Generator", url: "http://mcp-pdf:8003/mcp", hint: "Génération de PDF (service docker local)", icon: <FileText className="h-3.5 w-3.5 text-red-600" /> },
  { label: "Notion", name: "Notion", url: "http://mcp-notion:8004/mcp", hint: "Service officiel Notion MCP", icon: <Notebook className="h-3.5 w-3.5" /> },
  { label: "Slack", name: "Slack", url: "http://mcp-slack:8006/mcp", hint: "Bridge Slack MCP local (messages + channels)", icon: <MessageSquare className="h-3.5 w-3.5 text-fuchsia-600" /> },
  { label: "Discord", name: "Discord", url: "http://mcp-discord:8010/mcp", hint: "Bridge Discord MCP local (messages + channels)", icon: <Gamepad2 className="h-3.5 w-3.5 text-indigo-600" /> },
  { label: "Filesystem", name: "Filesystem", url: "http://mcp-filesystem:8011/mcp", hint: "Bridge fichiers local (liste/lit/ecrit sous FILESYSTEM_ROOT)", icon: <Folder className="h-3.5 w-3.5 text-amber-600" /> },
  { label: "AWS", name: "AWS", url: "http://mcp-aws:8012/mcp", hint: "Bridge AWS ops (EC2, Lambda, ECS/EKS, S3, DynamoDB, CloudWatch, CloudTrail, IAM, Secrets)", icon: <Cloud className="h-3.5 w-3.5 text-orange-500" /> },
  { label: "Azure", name: "Azure", url: "http://mcp-azure:8013/mcp", hint: "Bridge Azure ops (VM, RG, NSG, App Service, Storage, Key Vault, Activity Log)", icon: <Cloud className="h-3.5 w-3.5 text-blue-600" /> },
  { label: "GCP", name: "GCP", url: "http://mcp-gcp:8014/mcp", hint: "Bridge GCP ops (Projects, Compute, GKE, GCS, Logging)", icon: <Cloud className="h-3.5 w-3.5 text-sky-500" /> },
  { label: "Email (SMTP)", name: "Email", url: "http://mcp-email:8015/mcp", hint: "Bridge Email SMTP (envoi de rapports)", icon: <Mail className="h-3.5 w-3.5 text-purple-600" /> },
  { label: "Gmail (Google MCP)", name: "Gmail", url: "https://gmailmcp.googleapis.com/mcp/v1", hint: "Serveur MCP distant officiel Google Workspace (OAuth requis)", icon: <Mail className="h-3.5 w-3.5 text-red-500" /> },
  { label: "Google Calendar MCP", name: "Google Calendar", url: "https://calendarmcp.googleapis.com/mcp/v1", hint: "Serveur MCP distant officiel Google Calendar (OAuth requis)", icon: <CalendarDays className="h-3.5 w-3.5 text-blue-600" /> },
  { label: "GitHub", name: "GitHub", url: "http://mcp-github:8007/mcp", hint: "Bridge local GitHub MCP (issues + PR)", icon: <GitBranch className="h-3.5 w-3.5" /> },
  { label: "GitLab", name: "GitLab", url: "http://mcp-gitlab:8008/mcp", hint: "Bridge local GitLab MCP (projects + issues + MR)", icon: <GitBranch className="h-3.5 w-3.5 text-orange-500" /> },
  { label: "Elasticsearch", name: "Elasticsearch", url: "http://mcp-elasticsearch:8080/mcp", hint: "MCP Elasticsearch (indices, mappings, search, ES|QL)", icon: <Search className="h-3.5 w-3.5 text-teal-600" /> },
  { label: "MySQL", name: "MySQL", url: "https://YOUR-TUNNEL/mysql/mcp", hint: "Sert via mcp-server-mysql", icon: <HardDrive className="h-3.5 w-3.5 text-blue-700" /> },
  { label: "Dagster", name: "Dagster", url: "http://mcp-dagster:8016/mcp", hint: "Bridge local Dagster MCP (GraphQL runs/jobs)", icon: <Workflow className="h-3.5 w-3.5 text-violet-700" /> },
  { label: "Moodle", name: "Moodle", url: "https://YOUR-TUNNEL/moodle/mcp", hint: "Projet open source moodle-mcp", icon: <GraduationCap className="h-3.5 w-3.5 text-orange-600" /> },
  { label: "OpenMetadata", name: "OpenMetadata", url: "https://YOUR-OM-INSTANCE/mcp", hint: "Serveur MCP intégré à OpenMetadata", icon: <Tags className="h-3.5 w-3.5 text-cyan-700" /> },
  { label: "Fetch (universel)", name: "Fetch", url: "https://YOUR-TUNNEL/fetch/mcp", hint: "Pour APIs sans serveur MCP dédié (ex. Hyperplanning)", icon: <Globe className="h-3.5 w-3.5 text-green-700" /> },
];

function getServerIcon(name: string): ReactNode {
  const key = name.trim().toLowerCase();
  const preset = PRESETS.find((p) => p.name.toLowerCase() === key || p.label.toLowerCase() === key);
  if (preset) return preset.icon;

  if (key.includes("postgres")) return <Database className="h-3.5 w-3.5 text-sky-700" />;
  if (key.includes("mysql")) return <HardDrive className="h-3.5 w-3.5 text-blue-700" />;
  if (key.includes("pdf")) return <FileText className="h-3.5 w-3.5 text-red-600" />;
  if (key.includes("notion")) return <Notebook className="h-3.5 w-3.5" />;
  if (key.includes("slack")) return <MessageSquare className="h-3.5 w-3.5 text-fuchsia-600" />;
  if (key.includes("discord")) return <Gamepad2 className="h-3.5 w-3.5 text-indigo-600" />;
  if (key.includes("aws") || key.includes("azure") || key.includes("gcp")) return <Cloud className="h-3.5 w-3.5 text-sky-600" />;
  if (key.includes("github") || key.includes("gitlab")) return <GitBranch className="h-3.5 w-3.5" />;
  if (key.includes("elastic")) return <Search className="h-3.5 w-3.5 text-teal-600" />;
  if (key.includes("filesystem") || key.includes("file")) return <Folder className="h-3.5 w-3.5 text-amber-600" />;
  if (key.includes("email") || key.includes("smtp")) return <Mail className="h-3.5 w-3.5 text-purple-600" />;
  if (key.includes("gmail")) return <Mail className="h-3.5 w-3.5 text-red-500" />;
  if (key.includes("calendar")) return <CalendarDays className="h-3.5 w-3.5 text-blue-600" />;
  if (key.includes("moodle")) return <GraduationCap className="h-3.5 w-3.5 text-orange-600" />;
  if (key.includes("openmetadata")) return <Tags className="h-3.5 w-3.5 text-cyan-700" />;
  if (key.includes("fetch")) return <Globe className="h-3.5 w-3.5 text-green-700" />;

  return <Server className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function McpServersSettings() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<Record<string, Array<{ name: string; description?: string }>>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<McpServer | null>(null);

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
                <span className="inline-flex items-center justify-center">{getServerIcon(s.name)}</span>
                <h3 className="font-medium text-sm">{s.name}</h3>
                {!s.enabled && (
                  <span className="text-[10px] uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                    désactivé
                  </span>
                )}
              </div>
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
              <Button variant="ghost" size="icon" onClick={() => setPendingDelete(s)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce serveur MCP ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le serveur {pendingDelete ? `"${pendingDelete.name}"` : ""} sera retire de la configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDelete) return;
                await remove(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                  className="text-xs border border-border rounded px-2 py-1 hover:bg-muted transition inline-flex items-center gap-1"
                  title={p.hint}
                >
                  <span aria-hidden>{p.icon}</span>
                  <span>{p.label}</span>
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
