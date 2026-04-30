import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Pencil, Plus, Settings, Trash2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import tatiLogo from "@/assets/tati-logo.png";

interface Conv {
  id: string;
  title: string;
  updated_at: string;
}

export function ChatSidebar({ activeId }: { activeId?: string }) {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [serverCount, setServerCount] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Conv | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    setConvs(data ?? []);
    const { count } = await supabase
      .from("mcp_servers")
      .select("*", { count: "exact", head: true })
      .eq("enabled", true);
    setServerCount(count ?? 0);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("conv-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const newChat = async () => {
    const { data } = await supabase
      .from("conversations")
      .insert({ title: "Nouvelle conversation" })
      .select()
      .single();
    if (data) navigate({ to: "/c/$id", params: { id: data.id } });
  };

  const openDeleteDialog = (conv: Conv, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPendingDelete(conv);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    await supabase.from("conversations").delete().eq("id", id);
    if (activeId === id) navigate({ to: "/" });
    setPendingDelete(null);
  };

  const renameConv = async (c: Conv, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextTitle = prompt("Nouveau nom de la conversation :", c.title);
    if (nextTitle === null) return;
    const title = nextTitle.trim();
    if (!title || title === c.title) return;
    await supabase.from("conversations").update({ title }).eq("id", c.id);
  };

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-screen">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center shrink-0 ring-1 ring-sidebar-border">
              <img src={tatiLogo} alt="TaTi logo" className="h-7 w-7 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">TaTi</div>
              <div className="text-[10px] text-muted-foreground truncate">
                Talent Artificial Tally Intelligence
              </div>
            </div>
          </Link>
          <ThemeToggle />
        </div>
        <Button onClick={newChat} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nouveau chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {convs.length === 0 && (
          <div className="text-xs text-muted-foreground p-3 text-center">Aucune conversation</div>
        )}
        {convs.map((c) => (
          <Link
            key={c.id}
            to="/c/$id"
            params={{ id: c.id }}
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent transition-colors",
              activeId === c.id && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate flex-1">{c.title}</span>
            <button
              onClick={(e) => renameConv(c, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sidebar-accent transition"
              aria-label="Renommer"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => openDeleteDialog(c, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Link>
        ))}
      </div>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <Server className="h-3.5 w-3.5" />
          {serverCount} serveur{serverCount > 1 ? "s" : ""} MCP actif{serverCount > 1 ? "s" : ""}
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est definitive. La conversation
              {pendingDelete ? ` "${pendingDelete.title}"` : ""} sera supprimee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
