import { createFileRoute } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatView } from "@/components/ChatView";

export const Route = createFileRoute("/c/$id")({
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar activeId={id} />
      <ChatView conversationId={id} key={id} />
    </div>
  );
}
