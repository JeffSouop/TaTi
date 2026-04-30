import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { KNOWN_MODELS, PROVIDER_KINDS, type LlmProviderKind } from "@/lib/llm/types";

interface ProviderRow {
  id: string;
  kind: string;
  name: string;
  api_key: string | null;
  base_url: string | null;
  default_model: string;
  temperature: number;
  max_tool_iterations: number;
  enabled: boolean;
  is_default: boolean;
}

export function LlmProvidersSettings() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProviderRow | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("llm_providers")
      .select("*")
      .order("created_at", { ascending: true });
    setProviders((data ?? []) as ProviderRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addProvider = async (kind: LlmProviderKind) => {
    const meta = PROVIDER_KINDS.find((p) => p.value === kind)!;
    const defaultModel = KNOWN_MODELS[kind]?.[0]?.value ?? "";
    const { data, error } = await supabase
      .from("llm_providers")
      .insert({
        kind,
        name: meta.label,
        default_model: defaultModel,
        base_url: meta.defaultBaseUrl ?? null,
        is_default: providers.length === 0,
      })
      .select()
      .single();
    if (error) {
      toast.error("Échec : " + error.message);
      return;
    }
    setProviders((prev) => [...prev, data as ProviderRow]);
    setAdding(false);
    toast.success("Provider ajouté");
  };

  const removeProvider = async (id: string) => {
    await supabase.from("llm_providers").delete().eq("id", id);
    setProviders((prev) => prev.filter((p) => p.id !== id));
    toast.success("Provider supprimé");
  };

  const setDefault = async (id: string) => {
    // Unset all, then set the chosen one
    await supabase.from("llm_providers").update({ is_default: false }).neq("id", id);
    await supabase.from("llm_providers").update({ is_default: true }).eq("id", id);
    await load();
    toast.success("Provider par défaut mis à jour");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Configure tes propres providers IA</p>
            <p className="text-muted-foreground text-xs">
              TaTi est agnostique : ajoute autant de providers que tu veux (Claude, GPT, Mistral, Ollama…).
              Tu choisiras lequel utiliser dans chaque conversation. Le provider marqué <Star className="h-3 w-3 inline fill-current" /> est utilisé par défaut.
            </p>
          </div>
        </div>
      </Card>

      {providers.length === 0 && !adding && (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-muted-foreground mb-3">Aucun provider configuré</p>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter ton premier provider
          </Button>
        </Card>
      )}

      {providers.map((p) => (
        <ProviderCard
          key={p.id}
          provider={p}
          onRemove={() => setPendingDelete(p)}
          onSetDefault={() => setDefault(p.id)}
          onUpdate={load}
        />
      ))}

      {adding ? (
        <Card className="p-4 space-y-3">
          <Label>Quel type de provider ?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROVIDER_KINDS.map((k) => (
              <button
                key={k.value}
                onClick={() => addProvider(k.value)}
                className="text-left p-3 rounded-md border border-border hover:border-primary hover:bg-muted/40 transition"
              >
                <div className="font-medium text-sm">{k.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{k.description}</div>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Annuler
          </Button>
        </Card>
      ) : providers.length > 0 ? (
        <Button onClick={() => setAdding(true)} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Ajouter un autre provider
        </Button>
      ) : null}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce provider ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les conversations qui l'utilisent reviendront au provider par defaut.
              {pendingDelete ? ` Provider: "${pendingDelete.name}".` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDelete) return;
                await removeProvider(pendingDelete.id);
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

function ProviderCard({
  provider,
  onRemove,
  onSetDefault,
  onUpdate,
}: {
  provider: ProviderRow;
  onRemove: () => void;
  onSetDefault: () => void;
  onUpdate: () => void;
}) {
  const meta = PROVIDER_KINDS.find((p) => p.value === provider.kind);
  const knownModels = KNOWN_MODELS[provider.kind] ?? [];

  const [name, setName] = useState(provider.name);
  const [apiKey, setApiKey] = useState(provider.api_key ?? "");
  const [baseUrl, setBaseUrl] = useState(provider.base_url ?? "");
  const [model, setModel] = useState(provider.default_model);
  const [customModel, setCustomModel] = useState("");
  const [temperature, setTemperature] = useState(provider.temperature);
  const [maxIter, setMaxIter] = useState(provider.max_tool_iterations);
  const [enabled, setEnabled] = useState(provider.enabled);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const usingCustomModel = !knownModels.some((m) => m.value === model);

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: provider.kind,
          api_key: apiKey || undefined,
          base_url: baseUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          ok: true,
          message: `✓ Connexion OK. ${data.models?.length ?? 0} modèle(s) accessible(s).`,
        });
      } else {
        setTestResult({ ok: false, message: data.error ?? "Échec" });
      }
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const finalModel = customModel.trim() || model;
    const { error } = await supabase
      .from("llm_providers")
      .update({
        name,
        api_key: apiKey || null,
        base_url: baseUrl || null,
        default_model: finalModel,
        temperature,
        max_tool_iterations: maxIter,
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider.id);
    setSaving(false);
    if (error) toast.error("Échec : " + error.message);
    else {
      toast.success("Enregistré");
      onUpdate();
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{name}</h3>
            <Badge variant="secondary" className="text-[10px]">{meta?.label ?? provider.kind}</Badge>
            {provider.is_default && (
              <Badge className="text-[10px] gap-1">
                <Star className="h-2.5 w-2.5 fill-current" /> Par défaut
              </Badge>
            )}
            {!enabled && <Badge variant="outline" className="text-[10px]">Désactivé</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!provider.is_default && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSetDefault} title="Définir par défaut">
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`name-${provider.id}`}>Nom affiché</Label>
        <Input id={`name-${provider.id}`} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {meta?.needsApiKey && (
        <div className="space-y-2">
          <Label htmlFor={`key-${provider.id}`}>Clé API</Label>
          <div className="flex gap-2">
            <Input
              id={`key-${provider.id}`}
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider.kind === "anthropic"
                  ? "sk-ant-…"
                  : provider.kind === "openai"
                    ? "sk-…"
                    : provider.kind === "gemini"
                      ? "AIza… (ou clé Gemini)"
                      : provider.kind === "grok"
                        ? "xai-…"
                        : provider.kind === "deepseek"
                          ? "sk-…"
                          : provider.kind === "cohere"
                            ? "co-…"
                            : provider.kind === "huggingface"
                              ? "hf_…"
                              : provider.kind === "nvidia"
                                ? "nvapi-…"
                                : provider.kind === "perplexity"
                                  ? "pplx-…"
                    : "ta-clé-api"
              }
              autoComplete="off"
            />
            <Button variant="outline" size="icon" type="button" onClick={() => setShowKey((v) => !v)}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            
          </p>
        </div>
      )}

      {(meta?.needsBaseUrl ||
        provider.kind === "openai" ||
        provider.kind === "mistral" ||
        provider.kind === "gemini" ||
        provider.kind === "grok" ||
        provider.kind === "deepseek" ||
        provider.kind === "cohere" ||
        provider.kind === "huggingface" ||
        provider.kind === "nvidia" ||
        provider.kind === "perplexity") && (
        <div className="space-y-2">
          <Label htmlFor={`url-${provider.id}`}>
            {meta?.needsBaseUrl ? "URL de l'endpoint" : "URL personnalisée (optionnel)"}
          </Label>
          <Input
            id={`url-${provider.id}`}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={meta?.defaultBaseUrl ?? "Laisser vide pour l'URL par défaut"}
          />
          {provider.kind === "ollama" && (
            <p className="text-xs text-muted-foreground">
              Si Ollama tourne en local, expose-le via ngrok ou cloudflared (HTTPS public).
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`model-${provider.id}`}>Modèle par défaut</Label>
        <div className="flex gap-2">
          <Select value={usingCustomModel ? "__custom__" : model} onValueChange={(v) => {
            if (v === "__custom__") {
              setCustomModel(model);
              setModel("");
            } else {
              setModel(v);
              setCustomModel("");
            }
          }}>
            <SelectTrigger id={`model-${provider.id}`} className="flex-1">
              <SelectValue placeholder="Choisir un modèle" />
            </SelectTrigger>
            <SelectContent>
              {knownModels.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
              <SelectItem value="__custom__">… autre (saisie manuelle)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(usingCustomModel || customModel) && (
          <Input
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="Nom exact du modèle"
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Température</Label>
            <span className="text-xs text-muted-foreground">{temperature.toFixed(2)}</span>
          </div>
          <Slider
            value={[temperature]}
            min={0}
            max={2}
            step={0.05}
            onValueChange={(v) => setTemperature(v[0])}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`iter-${provider.id}`}>Itérations max d'outils</Label>
          <Input
            id={`iter-${provider.id}`}
            type="number"
            min={1}
            max={30}
            value={maxIter}
            onChange={(e) => setMaxIter(Number(e.target.value) || 10)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={test} variant="outline" size="sm" disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Tester la connexion
        </Button>
        <Button onClick={save} size="sm" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Enregistrer
        </Button>
        {testResult && (
          <div
            className={`text-xs flex items-center gap-1.5 ${
              testResult.ok ? "text-green-600" : "text-destructive"
            }`}
          >
            {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {testResult.message}
          </div>
        )}
      </div>
    </Card>
  );
}
