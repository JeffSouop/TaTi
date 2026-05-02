import { defineConfig } from "vitepress";

// Déploiement GitHub Pages (projet) : définir VITEPRESS_BASE=/TaTi/ en CI
const base = process.env.VITEPRESS_BASE ?? "/";
const baseTrailing = base.endsWith("/") ? base : `${base}/`;

const headIcon = [
  ["link", { rel: "icon", href: `${baseTrailing}tati-logo.png`, type: "image/png" }],
];

export default defineConfig({
  base,
  lastUpdated: true,
  cleanUrls: true,
  appearance: {
    initialValue: "light",
  },
  locales: {
    root: {
      label: "Français",
      lang: "fr-FR",
      title: "TaTi",
      description:
        "Plateforme open source de copilote IA orientée delivery/ops, connectée via MCP.",
      head: headIcon,
      themeConfig: {
        logo: { src: "/tati-logo.png", alt: "TaTi" },
        siteTitle: "TaTi",
        outline: { label: "Sur cette page", level: [2, 3] },
        search: {
          provider: "local",
        },
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
    },
    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      title: "TaTi",
      description: "Open-source delivery & ops copilot platform connected via MCP.",
      head: headIcon,
      themeConfig: {
        logo: { src: "/tati-logo.png", alt: "TaTi" },
        siteTitle: "TaTi",
        outline: { label: "On this page", level: [2, 3] },
        search: {
          provider: "local",
        },
        editLink: {
          pattern: "https://github.com/JeffSouop/TaTi/edit/main/docs/:path",
          text: "Edit this page on GitHub",
        },
        socialLinks: [{ icon: "github", link: "https://github.com/JeffSouop/TaTi" }],
        footer: {
          message: "TaTi — delivery/ops copilot • Documentation under repository license",
          copyright: `© ${new Date().getFullYear()} TaTi contributors`,
        },
        nav: [
          { text: "Home", link: "/en/" },
          { text: "Guides", link: "/en/guide/introduction" },
          { text: "Architecture", link: "/en/guide/architecture" },
          { text: "Deployment", link: "/en/guide/deployment" },
          { text: "MCP", link: "/en/guide/mcp" },
        ],
        sidebar: [
          {
            text: "Welcome",
            collapsed: false,
            items: [
              { text: "Introduction", link: "/en/guide/introduction" },
              { text: "Quick start", link: "/en/guide/quick-start" },
              { text: "Architecture", link: "/en/guide/architecture" },
            ],
          },
          {
            text: "Installation",
            collapsed: false,
            items: [
              { text: "Deployment", link: "/en/guide/deployment" },
              { text: "Configuration (.env)", link: "/en/guide/configuration" },
            ],
          },
          {
            text: "Guides",
            collapsed: false,
            items: [
              { text: "MCP connectors", link: "/en/guide/mcp" },
              { text: "Security & auth", link: "/en/guide/security" },
              { text: "Troubleshooting", link: "/en/guide/troubleshooting" },
            ],
          },
        ],
      },
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      link: "/zh/",
      title: "TaTi",
      description: "面向交付与运维的开源 AI 副驾驶平台，通过 MCP 连接工具链。",
      head: headIcon,
      themeConfig: {
        logo: { src: "/tati-logo.png", alt: "TaTi" },
        siteTitle: "TaTi",
        outline: { label: "本页目录", level: [2, 3] },
        search: {
          provider: "local",
        },
        editLink: {
          pattern: "https://github.com/JeffSouop/TaTi/edit/main/docs/:path",
          text: "在 GitHub 上编辑此页",
        },
        socialLinks: [{ icon: "github", link: "https://github.com/JeffSouop/TaTi" }],
        footer: {
          message: "TaTi — 交付/运维副驾驶 • 文档遵循仓库许可",
          copyright: `© ${new Date().getFullYear()} TaTi 贡献者`,
        },
        nav: [
          { text: "首页", link: "/zh/" },
          { text: "指南", link: "/zh/guide/introduction" },
          { text: "架构", link: "/zh/guide/architecture" },
          { text: "部署", link: "/zh/guide/deployment" },
          { text: "MCP", link: "/zh/guide/mcp" },
        ],
        sidebar: [
          {
            text: "欢迎",
            collapsed: false,
            items: [
              { text: "简介", link: "/zh/guide/introduction" },
              { text: "快速开始", link: "/zh/guide/quick-start" },
              { text: "架构", link: "/zh/guide/architecture" },
            ],
          },
          {
            text: "安装",
            collapsed: false,
            items: [
              { text: "部署", link: "/zh/guide/deployment" },
              { text: "配置（.env）", link: "/zh/guide/configuration" },
            ],
          },
          {
            text: "指南",
            collapsed: false,
            items: [
              { text: "MCP 连接器", link: "/zh/guide/mcp" },
              { text: "安全与认证", link: "/zh/guide/security" },
              { text: "故障排查", link: "/zh/guide/troubleshooting" },
            ],
          },
        ],
      },
    },
  },
});
