import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Pencil, Plus, Settings, Trash2, Server, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Conv {
  id: string;
  title: string;
  updated_at: string;
}

export function ChatSidebar({
  activeId,
  collapsed = false,
  onToggleCollapse,
}: {
  activeId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [serverCount, setServerCount] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Conv | null>(null);
  const navigate = useNavigate();
  const auth = useAuth();

  const load = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    setConvs(data ?? []);
    try {
      const res = await fetch("/api/mcp/count");
      const json = await res.json();
      setServerCount(Number(json?.count ?? 0));
    } catch {
      setServerCount(0);
    }
  };

  useEffect(() => {
    if (auth.authRequired && !auth.authenticated) {
      setConvs([]);
      setServerCount(0);
      return;
    }
    load();
    const channel = supabase
      .channel("conv-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [auth.authRequired, auth.authenticated]);

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

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    // Recharge immédiat pour vider l'état courant et recharger les données anonymes/auth
    window.location.assign("/");
  };

  const displayName =
    auth.user && `${auth.user.first_name ?? ""} ${auth.user.last_name ?? ""}`.trim()
      ? `${auth.user.first_name ?? ""} ${auth.user.last_name ?? ""}`.trim()
      : auth.user?.email ?? "";

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-screen transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className={cn("flex items-center min-w-0", collapsed ? "justify-center w-full" : "gap-2")}>
            <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center shrink-0 ring-1 ring-sidebar-border">
              <img src={tatiLogo} alt="TaTi logo" className="h-7 w-7 object-contain" />
            </div>
            {!collapsed && <div className="min-w-0">
              <div className="text-sm font-semibold truncate">TaTi</div>
              <div className="text-[10px] text-muted-foreground truncate">
                Talent Artificial Tally Intelligence
              </div>
            </div>}
          </Link>
          {!collapsed && (
            <div className="flex items-center gap-1">
              {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="h-8 w-8 rounded-md hover:bg-sidebar-accent inline-flex items-center justify-center"
                title="Réduire la barre latérale"
                aria-label="Réduire la barre latérale"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
              )}
              <ThemeToggle />
            </div>
          )}
        </div>
        {collapsed ? (
          <div className="flex justify-center">
            <Button onClick={newChat} size="icon" className="h-9 w-9" title="Nouveau chat" aria-label="Nouveau chat">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button onClick={newChat} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nouveau chat
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {convs.length === 0 && (
          !collapsed ? <div className="text-xs text-muted-foreground p-3 text-center">Aucune conversation</div> : null
        )}
        {convs.map((c) => (
          <Link
            key={c.id}
            to="/c/$id"
            params={{ id: c.id }}
            className={cn(
              "group flex items-center px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent transition-colors",
              collapsed ? "justify-center" : "gap-2",
              activeId === c.id && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
            title={collapsed ? c.title : undefined}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {!collapsed && <span className="truncate flex-1">{c.title}</span>}
            {!collapsed && <button
              onClick={(e) => renameConv(c, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sidebar-accent transition"
              aria-label="Renommer"
            >
              <Pencil className="h-3 w-3" />
            </button>}
            {!collapsed && <button
              onClick={(e) => openDeleteDialog(c, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </button>}
          </Link>
        ))}
      </div>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {auth.authRequired && auth.user && !collapsed && (
          <div className="px-2 py-1 flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6">
              <AvatarImage src={auth.user.avatar_url ?? ""} alt={displayName} />
              <AvatarFallback className="text-[10px]">
                {(auth.user.first_name?.[0] ?? auth.user.email[0] ?? "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-[11px] text-muted-foreground truncate">{displayName}</div>
          </div>
        )}
        <div
          className={cn(
            "px-2 py-1.5 text-xs text-muted-foreground",
            collapsed ? "flex justify-center" : "flex items-center gap-2",
          )}
          title={collapsed ? `${serverCount} serveur${serverCount > 1 ? "s" : ""} MCP actif${serverCount > 1 ? "s" : ""}` : undefined}
        >
          <Server className="h-3.5 w-3.5" />
          {!collapsed && `${serverCount} serveur${serverCount > 1 ? "s" : ""} MCP actif${serverCount > 1 ? "s" : ""}`}
        </div>
        <Link
          to="/settings"
          className={cn(
            "px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent transition-colors",
            collapsed ? "flex justify-center" : "flex items-center gap-2",
          )}
          title={collapsed ? "Paramètres" : undefined}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && "Paramètres"}
        </Link>
        {auth.authRequired && auth.user && (
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className={cn(
              "w-full px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent transition-colors text-muted-foreground",
              collapsed ? "flex justify-center" : "text-left",
            )}
            title={collapsed ? "Déconnexion" : undefined}
          >
            {collapsed ? <LogOut className="h-4 w-4" /> : "Déconnexion"}
          </button>
        )}
        {collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent transition-colors text-muted-foreground flex justify-center"
            title="Agrandir la barre latérale"
            aria-label="Agrandir la barre latérale"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
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

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
            <AlertDialogDescription>
              Veux-tu vraiment te déconnecter de cette session ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void logout()}>Déconnexion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
