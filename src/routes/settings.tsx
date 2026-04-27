import { createFileRoute } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/ChatSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LlmProvidersSettings } from "@/components/settings/LlmProvidersSettings";
import { McpServersSettings } from "@/components/settings/McpServersSettings";
import { GettingStarted } from "@/components/settings/GettingStarted";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Paramètres — TaTi" }],
  }),
});

function SettingsPage() {
  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-1">Paramètres</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Configure tes providers IA (Claude, GPT, Mistral, Ollama…) et tes serveurs MCP.
          </p>
          <Tabs defaultValue="providers">
            <TabsList>
              <TabsTrigger value="providers">Providers IA</TabsTrigger>
              <TabsTrigger value="mcp">Serveurs MCP</TabsTrigger>
              <TabsTrigger value="guide">Démarrage rapide</TabsTrigger>
            </TabsList>
            <TabsContent value="providers" className="mt-4">
              <LlmProvidersSettings />
            </TabsContent>
            <TabsContent value="mcp" className="mt-4">
              <McpServersSettings />
            </TabsContent>
            <TabsContent value="guide" className="mt-4">
              <GettingStarted />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
