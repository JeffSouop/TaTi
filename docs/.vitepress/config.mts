import { defineConfig } from "vitepress";

// Déploiement GitHub Pages (projet) : définir VITEPRESS_BASE=/TaTi/ en CI
const base = process.env.VITEPRESS_BASE ?? "/";
const baseTrailing = base.endsWith("/") ? base : `${base}/`;

export default defineConfig({
  title: "TaTi",
  description: "Plateforme open source de copilote IA orientée delivery/ops, connectée via MCP.",
  lang: "fr-FR",
  /** Thème clair par défaut (sans imposer le mode système sombre au premier chargement). */
  appearance: {
    initialValue: "light",
  },
  base,
  lastUpdated: true,
  cleanUrls: true,
  head: [["link", { rel: "icon", href: `${baseTrailing}tati-logo.png`, type: "image/png" }]],
  themeConfig: {
    /** Chemin depuis la racine pub ; VitePress préfixe automatiquement `base` (éviter `/TaTi/` + base doublé). */
    logo: { src: "/tati-logo.png", alt: "TaTi" },
    siteTitle: "TaTi",
    outline: { label: "Sur cette page", level: [2, 3] },
    search: { provider: "local" },
    editLink: {
      pattern: "https://github.com/JeffSouop/TaTi/edit/main/docs/:path",
      text: "Modifier cette page sur GitHub",
    },
    socialLinks: [{ icon: "github", link: "https://github.com/JeffSouop/TaTi" }],
    footer: {
      message: "TaTi — copilote IA delivery/ops • Documentation sous licence du dépôt",
      copyright: `© ${new Date().getFullYear()} Contributeurs TaTi`,
    },
    nav: [
      { text: "Accueil", link: "/" },
      { text: "Guides", link: "/guide/introduction" },
      { text: "Architecture", link: "/guide/architecture" },
      { text: "Déploiement", link: "/guide/deployment" },
      { text: "MCP", link: "/guide/mcp" },
    ],
    sidebar: [
      {
        text: "Bienvenue",
        collapsed: false,
        items: [
          { text: "Introduction", link: "/guide/introduction" },
          { text: "Démarrage rapide", link: "/guide/quick-start" },
          { text: "Architecture", link: "/guide/architecture" },
        ],
      },
      {
        text: "Installation",
        collapsed: false,
        items: [
          { text: "Déploiement", link: "/guide/deployment" },
          { text: "Configuration (.env)", link: "/guide/configuration" },
        ],
      },
      {
        text: "Guides",
        collapsed: false,
        items: [
          { text: "Connecteurs MCP", link: "/guide/mcp" },
          { text: "Sécurité & auth", link: "/guide/security" },
          { text: "Dépannage", link: "/guide/troubleshooting" },
        ],
      },
    ],
  },
});
