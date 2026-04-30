import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  is_active: boolean;
  created_at: string;
};

type McpServerRow = {
  id: string;
  name: string;
  enabled: boolean;
};

export function UserManagementSettings() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [servers, setServers] = useState<McpServerRow[]>([]);
  const [accessByUser, setAccessByUser] = useState<Record<string, Set<string>>>({});
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [serviceUser, setServiceUser] = useState<UserRow | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Chargement impossible");
      setUsers(data.users ?? []);
      const mcpRes = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "mcp_servers",
          op: "select",
          columns: "id, name, enabled",
          filters: [{ col: "enabled", op: "eq", val: true }],
        }),
      });
      const mcpData = await mcpRes.json();
      if (mcpRes.ok && !mcpData?.error) setServers((mcpData.data ?? []) as McpServerRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createUser = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          avatarUrl: avatarUrl || null,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Creation impossible");
      toast.success("Utilisateur cree");
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setAvatarUrl("");
      setRole("member");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Creation impossible");
    } finally {
      setSaving(false);
    }
  };

  const loadAccess = async (userId: string) => {
    const res = await fetch(`/api/admin/user-access?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    if (!res.ok || !data?.ok) return;
    const allowed = new Set<string>(
      (data.access ?? [])
        .filter((x: { allowed: boolean }) => x.allowed)
        .map((x: { mcp_server_id: string }) => x.mcp_server_id),
    );
    setAccessByUser((prev) => ({ ...prev, [userId]: allowed }));
  };

  const openServices = async (u: UserRow) => {
    setServiceUser(u);
    setServiceSheetOpen(true);
    await loadAccess(u.id);
  };

  const toggleAccess = async (userId: string, serverId: string, next: boolean) => {
    try {
      const res = await fetch("/api/admin/user-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, serverId, allowed: next }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Maj acces impossible");
      setAccessByUser((prev) => {
        const cur = new Set(prev[userId] ?? []);
        if (next) cur.add(serverId);
        else cur.delete(serverId);
        return { ...prev, [userId]: cur };
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Maj acces impossible");
    }
  };

  const setAllAccess = async (userId: string, allowed: boolean) => {
    const targetServers = servers.filter((s) =>
      s.name.toLowerCase().includes(serviceSearch.trim().toLowerCase()),
    );
    try {
      await Promise.all(
        targetServers.map((s) =>
          fetch("/api/admin/user-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, serverId: s.id, allowed }),
          }),
        ),
      );
      setAccessByUser((prev) => {
        const cur = new Set(prev[userId] ?? []);
        for (const s of targetServers) {
          if (allowed) cur.add(s.id);
          else cur.delete(s.id);
        }
        return { ...prev, [userId]: cur };
      });
      toast.success(
        allowed
          ? "Tous les services filtrés sont autorisés"
          : "Tous les services filtrés sont bloqués",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mise à jour en masse impossible");
    }
  };

  const updateUser = async (id: string, patch: Partial<UserRow>) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Mise a jour impossible");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mise a jour impossible");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Suppression impossible");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("Utilisateur supprime");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible");
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Ajouter un utilisateur</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@exemple.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mot de passe</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">member</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Prenom</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prenom"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Photo (URL)</Label>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
        <Button onClick={createUser} disabled={saving || !email || !password}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creer"}
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Utilisateurs</h3>
        <div className="space-y-1.5">
          <Label htmlFor="user-search">Recherche utilisateur</Label>
          <Input
            id="user-search"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Ex: jeff, marketing, admin@..."
          />
        </div>
        <div className="space-y-2">
          {users
            .filter((u) => {
              const q = userSearch.trim().toLowerCase();
              if (!q) return true;
              const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim().toLowerCase();
              return (
                u.email.toLowerCase().includes(q) ||
                fullName.includes(q) ||
                `${u.first_name ?? ""}`.toLowerCase().includes(q) ||
                `${u.last_name ?? ""}`.toLowerCase().includes(q)
              );
            })
            .map((u) => (
              <div
                key={u.id}
                className="border border-border rounded-md p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  <div className="text-xs text-muted-foreground">id: {u.id}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Select
                    value={u.role}
                    onValueChange={(v) => void updateUser(u.id, { role: v as "admin" | "member" })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">member</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Actif</span>
                    <Switch
                      checked={u.is_active}
                      onCheckedChange={(v) => void updateUser(u.id, { is_active: v })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => void deleteUser(u.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => void openServices(u)}>
                  Services
                </Button>
              </div>
            ))}
          {users.length === 0 && (
            <div className="text-sm text-muted-foreground">Aucun utilisateur</div>
          )}
          {users.length > 0 &&
            users.filter((u) => {
              const q = userSearch.trim().toLowerCase();
              if (!q) return true;
              const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim().toLowerCase();
              return (
                u.email.toLowerCase().includes(q) ||
                fullName.includes(q) ||
                `${u.first_name ?? ""}`.toLowerCase().includes(q) ||
                `${u.last_name ?? ""}`.toLowerCase().includes(q)
              );
            }).length === 0 && (
              <div className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</div>
            )}
        </div>
      </Card>

      <Sheet open={serviceSheetOpen} onOpenChange={setServiceSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Services disponibles -{" "}
              {serviceUser
                ? [serviceUser.first_name, serviceUser.last_name].filter(Boolean).join(" ") ||
                  serviceUser.email
                : ""}
            </SheetTitle>
            <SheetDescription>
              Si aucun service n'est coché, tous les services MCP sont autorisés pour cet
              utilisateur.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="service-search">Recherche service</Label>
              <Input
                id="service-search"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Ex: github, slack, openmetadata..."
              />
            </div>
            {serviceUser && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setAllAccess(serviceUser.id, true)}
                >
                  Tout autoriser (filtre)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setAllAccess(serviceUser.id, false)}
                >
                  Tout bloquer (filtre)
                </Button>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {serviceUser &&
              servers
                .filter((s) => s.name.toLowerCase().includes(serviceSearch.trim().toLowerCase()))
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border border-border rounded-md px-3 py-2"
                  >
                    <span className="text-sm">{s.name}</span>
                    <Switch
                      checked={Boolean(accessByUser[serviceUser.id]?.has(s.id))}
                      onCheckedChange={(v) => void toggleAccess(serviceUser.id, s.id, v)}
                    />
                  </div>
                ))}
            {serviceUser &&
              servers.filter((s) =>
                s.name.toLowerCase().includes(serviceSearch.trim().toLowerCase()),
              ).length === 0 && (
                <div className="text-sm text-muted-foreground">Aucun service trouvé.</div>
              )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
