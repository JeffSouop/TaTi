import { createFileRoute } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatView } from "@/components/ChatView";
import { useAuth } from "@/hooks/use-auth";
import { AuthLoginCard } from "@/components/AuthLoginCard";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

export const Route = createFileRoute("/c/$id")({
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const auth = useAuth();
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
            <ChatSidebar
              activeId={id}
              collapsed={!sidebar.visible}
              onToggleCollapse={sidebar.toggle}
            />
          )}
          <main className="flex-1 relative">
            {auth.authRequired && !auth.loading && !auth.authenticated ? (
              <div className="h-full">
                <AuthLoginCard onSuccess={() => void auth.refresh()} />
              </div>
            ) : (
              <ChatView conversationId={id} key={id} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
