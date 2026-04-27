import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { KNOWN_MODELS } from "@/lib/llm/types";

interface Provider {
  id: string;
  kind: string;
  name: string;
  default_model: string;
  is_default: boolean;
  enabled: boolean;
}

export function ConversationProviderSelector({ conversationId }: { conversationId: string }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: provs }, { data: conv }] = await Promise.all([
        supabase.from("llm_providers").select("id, kind, name, default_model, is_default, enabled").eq("enabled", true),
        supabase.from("conversations").select("provider_id, model").eq("id", conversationId).single(),
      ]);
      const list = (provs ?? []) as Provider[];
      setProviders(list);
      const defaultProv = list.find((p) => p.is_default) ?? list[0];
      const pid = (conv?.provider_id as string | null) ?? defaultProv?.id ?? "";
      const m = (conv?.model as string | null) ?? defaultProv?.default_model ?? "";
      setProviderId(pid);
      setModel(m);
      setLoading(false);
    })();
  }, [conversationId]);

  const onProviderChange = async (id: string) => {
    setProviderId(id);
    const p = providers.find((x) => x.id === id);
    const newModel = p?.default_model ?? "";
    setModel(newModel);
    await supabase.from("conversations").update({ provider_id: id, model: newModel }).eq("id", conversationId);
  };

  const onModelChange = async (m: string) => {
    setModel(m);
    await supabase.from("conversations").update({ model: m }).eq("id", conversationId);
  };

  if (loading) return null;

  if (providers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Aucun provider IA configuré.
        <Link to="/settings" className="underline">Configurer →</Link>
      </div>
    );
  }

  const currentProv = providers.find((p) => p.id === providerId);
  const knownModels = currentProv ? KNOWN_MODELS[currentProv.kind] ?? [] : [];
  const modelInList = knownModels.some((m) => m.value === model);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={providerId} onValueChange={onProviderChange}>
        <SelectTrigger className="h-8 text-xs w-auto min-w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {providers.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={modelInList ? model : "__custom__"} onValueChange={(v) => v !== "__custom__" && onModelChange(v)}>
        <SelectTrigger className="h-8 text-xs w-auto min-w-[160px]">
          <SelectValue>{model || "Modèle"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {knownModels.map((m) => (
            <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
          ))}
          {!modelInList && model && (
            <SelectItem value="__custom__" className="text-xs">{model} (personnalisé)</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
