import { createFileRoute } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/ChatSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LlmProvidersSettings } from "@/components/settings/LlmProvidersSettings";
import { McpServersSettings } from "@/components/settings/McpServersSettings";
import { GettingStarted } from "@/components/settings/GettingStarted";
import { useAuth } from "@/hooks/use-auth";
import { AuthLoginCard } from "@/components/AuthLoginCard";
import { UserManagementSettings } from "@/components/settings/UserManagementSettings";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Paramètres — TaTi" }],
  }),
});

function SettingsPage() {
  const auth = useAuth();
  const isMemberOnly = Boolean(auth.authRequired && auth.user && auth.user.role !== "admin");
  const sidebar = useSidebarVisibility();
  const canShowSidebar = !(auth.authRequired && !auth.loading && !auth.authenticated);
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
      <main className="flex-1 overflow-y-auto relative">
        {auth.authRequired && !auth.loading && !auth.authenticated ? (
          <div className="h-full">
            <AuthLoginCard onSuccess={() => void auth.refresh()} />
          </div>
        ) : (
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-1">Paramètres</h1>
          {isMemberOnly ? (
            <p className="text-sm text-muted-foreground mb-6">
              Gère ici tes informations personnelles.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mb-6">
              Configure tes providers IA (Claude, GPT, Mistral, Ollama…) et tes serveurs MCP.
            </p>
          )}
          {isMemberOnly ? (
            <AccountSettings
              currentProfile={auth.user!}
              onProfileUpdated={() => {
                void auth.refresh();
              }}
            />
          ) : (
          <Tabs defaultValue={!auth.authRequired || auth.user?.role === "admin" ? "providers" : "account"}>
            <TabsList>
              {(!auth.authRequired || auth.user?.role === "admin") && <TabsTrigger value="providers">Providers IA</TabsTrigger>}
              {(!auth.authRequired || auth.user?.role === "admin") && <TabsTrigger value="mcp">Serveurs MCP</TabsTrigger>}
              {auth.authRequired && auth.user && <TabsTrigger value="account">Mon compte</TabsTrigger>}
              {auth.authRequired && auth.user?.role === "admin" && <TabsTrigger value="users">Utilisateurs</TabsTrigger>}
              <TabsTrigger value="guide">Démarrage rapide</TabsTrigger>
            </TabsList>
            {(!auth.authRequired || auth.user?.role === "admin") && (
              <TabsContent value="providers" className="mt-4">
                <LlmProvidersSettings />
              </TabsContent>
            )}
            {(!auth.authRequired || auth.user?.role === "admin") && (
              <TabsContent value="mcp" className="mt-4">
                <McpServersSettings />
              </TabsContent>
            )}
            {auth.authRequired && auth.user && (
              <TabsContent value="account" className="mt-4">
                <AccountSettings
                  currentProfile={auth.user}
                  onProfileUpdated={() => {
                    void auth.refresh();
                  }}
                />
              </TabsContent>
            )}
            {auth.authRequired && auth.user?.role === "admin" && (
              <TabsContent value="users" className="mt-4">
                <UserManagementSettings />
              </TabsContent>
            )}
            <TabsContent value="guide" className="mt-4">
              <GettingStarted />
            </TabsContent>
          </Tabs>
          )}
        </div>
        )}
      </main>
      </>
      )}
    </div>
  );
}
