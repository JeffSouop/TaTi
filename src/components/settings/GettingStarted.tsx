import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      <pre className="bg-muted text-foreground rounded-md p-3 text-xs font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        onClick={copy}
        className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export function GettingStarted() {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="font-semibold mb-2">1. Choisir un moteur IA open source (pas seulement Ollama)</h2>
        <p className="text-sm text-muted-foreground mb-3">
          TaTi peut se connecter a n'importe quelle API LLM compatible OpenAI. Tu peux utiliser Ollama,
          LM Studio, vLLM, TGI, OpenRouter (modeles OSS), etc.
        </p>
        <p className="text-xs font-medium mb-1.5 mt-3">Option A — Ollama (le plus simple en local)</p>
        <CodeBlock
          code={`# Installer Ollama (macOS / Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Télécharger un modèle qui supporte les outils
ollama pull llama3.1
# ou
ollama pull qwen2.5

# Lancer le serveur (par défaut sur :11434)
ollama serve`}
        />
        <p className="text-xs font-medium mb-1.5 mt-3">Option B — LM Studio (UI desktop)</p>
        <CodeBlock
          code={`# Dans LM Studio:
# 1) Télécharge un modèle instruct (ex: Llama/Qwen/Mistral)
# 2) Active "Local Server" (OpenAI compatible)
# 3) Port par défaut: 1234
# Endpoint: http://localhost:1234/v1`}
        />
        <p className="text-xs font-medium mb-1.5 mt-3">Option C — vLLM ou TGI (serveur GPU)</p>
        <CodeBlock
          code={`# Exemple vLLM (OpenAI compatible)
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --port 8000

# Endpoint: http://localhost:8000/v1`}
        />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">2. Exposer ton moteur IA via un tunnel HTTPS</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Cette app tourne dans le cloud — elle ne peut pas joindre <code className="text-xs bg-muted px-1 rounded">localhost</code>.
          Choisis ngrok (rapide) ou cloudflared (gratuit, pas de session limitée). Remplace le port selon ton moteur:
          Ollama <code className="text-xs bg-muted px-1 rounded">11434</code>, LM Studio <code className="text-xs bg-muted px-1 rounded">1234</code>,
          vLLM/TGI <code className="text-xs bg-muted px-1 rounded">8000</code>.
        </p>
        <p className="text-xs font-medium mb-1.5 mt-3">Option A — ngrok</p>
        <CodeBlock
          code={`# Exemple Ollama
ngrok http 11434
# Exemple LM Studio
# ngrok http 1234
# Exemple vLLM/TGI
# ngrok http 8000
# Copie l'URL https://xxxx.ngrok-free.app et colle-la dans l'onglet "Endpoint IA"`}
        />
        <p className="text-xs font-medium mb-1.5 mt-3">Option B — Cloudflare Tunnel (gratuit, illimité)</p>
        <CodeBlock
          code={`# Exemple Ollama
cloudflared tunnel --url http://localhost:11434
# Exemple LM Studio
# cloudflared tunnel --url http://localhost:1234
# Exemple vLLM/TGI
# cloudflared tunnel --url http://localhost:8000
# Copie l'URL https://xxx.trycloudflare.com et colle-la dans "Endpoint IA"`}
        />
        <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900 rounded p-2.5">
          ⚠️ Sécurité : exposer Ollama sans auth est risqué. Si tu mets ce tunnel en permanence, ajoute un
          reverse proxy (Caddy/Nginx) avec Basic Auth ou un Bearer token.
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">3. Lancer tes serveurs MCP</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Voici un <code className="text-xs bg-muted px-1 rounded">docker-compose.yml</code> minimal qui
          expose 4 serveurs MCP via un même tunnel Cloudflare.
        </p>
        <CodeBlock
          code={`# docker-compose.yml
services:
  mcp-postgres:
    image: ghcr.io/modelcontextprotocol/server-postgres:latest
    environment:
      POSTGRES_URL: postgres://user:pass@host:5432/dbname
      MCP_TRANSPORT: streamable-http
      PORT: 8001
    ports: ["8001:8001"]

  mcp-dagster:
    image: dagster/mcp-server-dagster:latest
    environment:
      DAGSTER_URL: http://dagster-webserver:3000
      MCP_TRANSPORT: streamable-http
      PORT: 8002
    ports: ["8002:8002"]

  mcp-moodle:
    image: ghcr.io/your-org/moodle-mcp:latest
    environment:
      MOODLE_URL: https://moodle.exemple.fr
      MOODLE_TOKEN: \${MOODLE_TOKEN}
      MCP_TRANSPORT: streamable-http
      PORT: 8003
    ports: ["8003:8003"]

  mcp-fetch:
    image: ghcr.io/modelcontextprotocol/server-fetch:latest
    environment:
      MCP_TRANSPORT: streamable-http
      PORT: 8004
    ports: ["8004:8004"]

  caddy:
    image: caddy:latest
    ports: ["8080:80"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile`}
        />
        <p className="text-xs font-medium mb-1.5 mt-4">Caddyfile (reverse proxy multi-MCP)</p>
        <CodeBlock
          code={`:80 {
  handle_path /postgres/* { reverse_proxy mcp-postgres:8001 }
  handle_path /dagster/*  { reverse_proxy mcp-dagster:8002 }
  handle_path /moodle/*   { reverse_proxy mcp-moodle:8003 }
  handle_path /fetch/*    { reverse_proxy mcp-fetch:8004 }
}`}
        />
        <p className="text-xs font-medium mb-1.5 mt-4">Puis expose l'ensemble avec un tunnel</p>
        <CodeBlock code={`cloudflared tunnel --url http://localhost:8080`} />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">4. Ajouter les serveurs dans cette app</h2>
        <p className="text-sm text-muted-foreground">
          Dans l'onglet <strong>Serveurs MCP</strong>, clique sur "Ajouter un serveur" et utilise les{" "}
          <strong>presets</strong>. Remplace <code className="text-xs bg-muted px-1 rounded">YOUR-TUNNEL</code>{" "}
          par ton URL (ex. <code className="text-xs bg-muted px-1 rounded">https://abc.trycloudflare.com</code>).
          Le bouton "Tester" vérifie la connexion et liste les outils exposés par chaque serveur.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">5. Limites assumees</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Chaque appel passe par le cloud → ton tunnel → ta machine. Compte 200-500 ms de latence supplémentaire.</li>
          <li>Si ton PC s'éteint ou ton tunnel coupe, le chat ne marche plus — c'est inhérent au self-hosted via tunnel.</li>
          <li>Cette V1 n'a pas d'authentification. Reste sur un usage personnel ou ajoute du Basic Auth via Caddy/Cloudflare Access.</li>
          <li>Tous les modèles ne supportent pas les outils. Préfère <code className="bg-muted px-1 rounded">llama3.1</code>, <code className="bg-muted px-1 rounded">qwen2.5</code>, <code className="bg-muted px-1 rounded">mistral</code> avec mode instruct/function-calling.</li>
        </ul>
      </Card>
    </div>
  );
}
