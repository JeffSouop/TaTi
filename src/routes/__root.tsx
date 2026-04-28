import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

import appCss from "../styles.css?url";
import tatiLogoUrl from "@/assets/tati-logo.png?url";

// Inline script that runs before React hydration to apply the saved theme
// (or default to dark) and prevent a light-mode flash on first paint.
const themeInitScript = `
(function(){try{var t=localStorage.getItem('tati-theme');if(!t){t='dark';}var c=document.documentElement.classList;if(t==='dark'){c.add('dark');}else{c.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})();
`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0A0A0F" },
      { title: "TaTi — Plateforme MCP open source" },
      {
        name: "description",
        content:
          "TaTi (Talent Artificial Tally Intelligence) — interface MCP open source pour interroger Dagster, OpenMetadata, DBT et vos bases en langage naturel. Self-hosted, multi-LLM.",
      },
      { property: "og:title", content: "TaTi — Plateforme MCP open source" },
      { property: "og:description", content: "Interface MCP self-hosted, multi-LLM (Claude, OpenAI, Mistral, Ollama)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/png",
        href: tatiLogoUrl,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
