import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  is_active: boolean;
};

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setAuthenticated(Boolean(data?.authenticated));
      setAuthRequired(Boolean(data?.authRequired));
      setUser(data?.user ?? null);
    } catch {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { loading, authenticated, authRequired, user, refresh };
}
