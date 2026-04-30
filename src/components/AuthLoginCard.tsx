import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import tatiLogo from "@/assets/tati-logo.png";

const DATA_SLIDES = [
  {
    title: "Qualité des données",
    subtitle: "Supervise tes pipelines, anomalies et indicateurs en temps réel.",
    image:
      "https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
  {
    title: "Pilotage analytique",
    subtitle: "Transforme la donnée brute en décisions opérationnelles.",
    image:
      "https://images.pexels.com/photos/590020/pexels-photo-590020.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
  {
    title: "Ops et observabilité",
    subtitle: "Centralise logs, incidents et actions depuis une seule interface.",
    image:
      "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
];

export function AuthLoginCard({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlide((prev) => (prev + 1) % DATA_SLIDES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Connexion impossible");
        return;
      }
      onSuccess();
      // Recharge immédiat pour reconstruire tout l'état applicatif (historique, sidebar, settings)
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[390px_1fr] bg-background">
      <div className="h-full border-r border-border/70 p-6 flex flex-col">
        <div className="flex flex-col items-center text-center gap-4 pt-4">
          <div className="h-36 w-36 rounded-full bg-white ring-1 ring-border flex items-center justify-center shadow-sm">
            <img src={tatiLogo} alt="TaTi" className="h-28 w-28 object-contain" />
          </div>
          <h2 className="text-lg font-semibold">Connexion</h2>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            TaTi centralise tes outils data, ops et delivery dans une interface unique avec
            connecteurs MCP.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-xs space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemple.com"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Mot de passe</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <Button onClick={login} disabled={loading || !email || !password} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative overflow-hidden">
        {DATA_SLIDES.map((s, i) => (
          <div
            key={s.title}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: i === slide ? 1 : 0,
              backgroundImage: `linear-gradient(120deg, rgba(20,20,35,0.55), rgba(20,20,35,0.2)), url("${s.image}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-14 px-8 text-center">
          <h3 className="text-3xl font-semibold text-white drop-shadow">
            {DATA_SLIDES[slide].title}
          </h3>
          <p className="text-sm text-white/90 mt-2 max-w-xl">{DATA_SLIDES[slide].subtitle}</p>
          <div className="flex items-center gap-2 mt-6">
            {DATA_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2.5 rounded-full transition-all ${i === slide ? "w-6 bg-primary" : "w-2.5 bg-white/60"}`}
                aria-label={`Aller au slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
