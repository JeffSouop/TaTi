import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/ChatSidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquarePlus, Server, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AuthLoginCard } from "@/components/AuthLoginCard";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Chat" },
      {
        name: "description",
        content: "Interface de chat self-hosted connectée à des serveurs MCP.",
      },
    ],
  }),
});

function Index() {
  const navigate = useNavigate();
  const auth = useAuth();
  const sidebar = useSidebarVisibility();
  const canShowSidebar = !(auth.authRequired && !auth.loading && !auth.authenticated);

  const newChat = async () => {
    try {
      const res = await fetch("/api/conversations/ensure", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.conversationId) {
        throw new Error(data?.error ?? "Impossible de créer une conversation");
      }
      if (data.reused) {
        toast.message("Tu as déjà un chat vide, on l'a rouvert.");
      }
      navigate({ to: "/c/$id", params: { id: data.conversationId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'ouvrir un chat");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {auth.loading ? (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Chargement de la session...</div>
        </main>
      ) : (
      <>
      {canShowSidebar && (
        <ChatSidebar collapsed={!sidebar.visible} onToggleCollapse={sidebar.toggle} />
      )}
      <main className="flex-1 relative overflow-hidden">
        {auth.authRequired && !auth.loading && !auth.authenticated ? (
          <div className="h-full">
            <AuthLoginCard onSuccess={() => void auth.refresh()} />
          </div>
        ) : (
        <>
        {/* Ambient brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-100"
          style={{
            background:
              "radial-gradient(60% 40% at 50% 0%, color-mix(in oklab, var(--brand-violet) 22%, transparent) 0%, transparent 70%), radial-gradient(40% 30% at 80% 100%, color-mix(in oklab, var(--brand-violet-glow) 15%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 h-full flex items-center justify-center p-6">
          <div className="max-w-2xl text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Plateforme MCP open source · v0.1
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Un point d'entrée unique{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  pour vos outils data
                </span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                Interrogez Dagster, OpenMetadata, DBT, PostgreSQL et plus encore
                en langage naturel. Multi-LLM, 100% self-hosted, extensible via le protocole MCP.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={newChat}
                size="lg"
                className="shadow-[var(--shadow-glow)] hover:shadow-[var(--shadow-elegant)] transition-shadow"
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Démarrer une conversation
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left mt-10">
              <FeatureCard
                icon={<Server className="h-4 w-4" />}
                title="MCP natif"
                text="Connecte n'importe quel serveur MCP via stdio ou Streamable HTTP."
              />
              <FeatureCard
                icon={<MessageSquarePlus className="h-4 w-4" />}
                title="Multi-LLM"
                text="Claude, OpenAI, Mistral ou Ollama en local — au choix par session."
              />
              <FeatureCard
                icon={<Settings className="h-4 w-4" />}
                title="Self-hosted"
                text="Docker Compose, vos données ne sortent jamais de votre infra."
              />
            </div>
          </div>
        </div>
        </>
        )}
      </main>
      </>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4 hover:border-primary/40 hover:bg-card/60 transition-colors">
      <div className="flex items-center gap-2 mb-1.5 text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          {icon}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
