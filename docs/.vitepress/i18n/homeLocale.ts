/** Textes page d’accueil (`TaTiHome`) — FR / EN / ZH. */
export type HomeLocaleKey = "fr" | "en" | "zh";

export function homeLocaleFromLang(lang: string): HomeLocaleKey {
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("en")) return "en";
  return "fr";
}

export type HomeCopy = {
  eyebrow: string;
  heroBefore: string;
  heroGradient: string;
  heroAfter: string;
  /** HTML statique (contient `<strong>` pour MCP). */
  leadHtml: string;
  searchAria: string;
  searchPlaceholder: string;
  pillDeploy: string;
  deployTitle: string;
  deployDesc: string;
  deployCards: {
    tag: string;
    title: string;
    desc: string;
    href: string;
    cta: string;
    external?: boolean;
  }[];
  pillGuides: string;
  guidesTitle: string;
  guidesDesc: string;
  guideTiles: {
    icon: string;
    title: string;
    sub: string;
    href: string;
  }[];
  pillConnectors: string;
  integrationsTitle: string;
  connectorsDocCta: string;
  pillHighlights: string;
  whyTitle: string;
  whyDesc: string;
  highlights: { title: string; body: string; href: string; cta: string; external?: boolean }[];
  pillQuick: string;
  quickNavTitle: string;
  quickCols: { title: string; links: { l: string; h: string; ext?: boolean }[] }[];
  exploreTitle: string;
  exploreDesc: string;
  exploreCards: { title: string; desc: string; href: string }[];
  footerTagline: string;
  chips: { label: string; href: string }[];
};

const GUIDE_PATHS = {
  intro: "/guide/introduction",
  quick: "/guide/quick-start",
  config: "/guide/configuration",
  mcp: "/guide/mcp",
  arch: "/guide/architecture",
  sec: "/guide/security",
  trouble: "/guide/troubleshooting",
} as const;

export const HOME_LOCALE: Record<HomeLocaleKey, HomeCopy> = {
  fr: {
    eyebrow: "Documentation TaTi",
    heroBefore: "Libérez la",
    heroGradient: "puissance",
    heroAfter: "du copilote delivery & ops",
    leadHtml:
      "Une plateforme open source qui relie vos outils réels (Slack, Postgres, OpenMetadata, clouds, observabilité…) au travers du <strong>Model Context Protocol</strong>. Installez avec Docker, configurez les jetons, puis laissez vos équipes chatter avec un contexte métier à jour.",
    searchAria: "Rechercher dans la documentation",
    searchPlaceholder: "Rechercher guides, variables, connecteurs…",
    pillDeploy: "Déploiement",
    deployTitle: "Comment lancer TaTi ?",
    deployDesc:
      "Choisissez un parcours : essai express avec Compose, montée en charge avec images registry, ou bien mise à niveau d’une instance existante.",
    deployCards: [
      {
        tag: "PoC & essai",
        title: "Démarrage rapide",
        desc: "Docker Compose, fichier `.env`, premier `docker compose up` et accès à l’UI. Idéal pour valider les connecteurs.",
        href: GUIDE_PATHS.quick,
        cta: "Lire le guide",
      },
      {
        tag: "Équipes & prod",
        title: "Déploiement",
        desc: "Images GHCR (`TATI_IMAGE_*`), réseau, ports MCP, sauvegardes Postgres et bonnes pratiques de secrets.",
        href: "/guide/deployment",
        cta: "Guide déploiement",
      },
      {
        tag: "Déjà en place",
        title: "Mise à niveau",
        desc: "Changer de tag d’image, vérifier les nouvelles clés dans `.env.example`, redémarrer proprement les services.",
        href: "/guide/deployment#mise-a-niveau",
        cta: "Procédure",
      },
      {
        tag: "Code & PR",
        title: "Développer TaTi",
        desc: "Cloner le repo, lancer l’app en dev (Vite), exécuter les tests et ouvrir une PR sur GitHub.",
        href: "https://github.com/JeffSouop/TaTi",
        cta: "Dépôt GitHub",
        external: true,
      },
    ],
    pillGuides: "Guides",
    guidesTitle: "Par où commencer la lecture ?",
    guidesDesc:
      "Aucun ordre imposé : chaque carte ouvre un volet — naviguez comme dans une carte, pas comme dans une liste numérotée.",
    guideTiles: [
      {
        icon: "intro",
        title: "Introduction",
        sub: "Vision produit & architecture",
        href: GUIDE_PATHS.intro,
      },
      {
        icon: "quick",
        title: "Démarrage rapide",
        sub: "Docker Compose & premier lancement",
        href: GUIDE_PATHS.quick,
      },
      {
        icon: "config",
        title: "Configuration",
        sub: "Variables `.env` expliquées",
        href: GUIDE_PATHS.config,
      },
      {
        icon: "mcp",
        title: "Connecteurs MCP",
        sub: "Ports, URL et sécurité",
        href: GUIDE_PATHS.mcp,
      },
      {
        icon: "architecture",
        title: "Architecture",
        sub: "Flux requêtes & services",
        href: GUIDE_PATHS.arch,
      },
      {
        icon: "security",
        title: "Sécurité",
        sub: "Auth, jetons, garde-fous",
        href: GUIDE_PATHS.sec,
      },
      {
        icon: "troubleshooting",
        title: "Dépannage",
        sub: "Logs & erreurs fréquentes",
        href: GUIDE_PATHS.trouble,
      },
      { icon: "index", title: "Index guides", sub: "Vue d’ensemble", href: GUIDE_PATHS.intro },
    ],
    pillConnectors: "Connecteurs",
    integrationsTitle: "Intégrations MCP",
    connectorsDocCta: "Documentation détaillée des connecteurs",
    pillHighlights: "À retenir",
    whyTitle: "Pourquoi TaTi ?",
    whyDesc: "Quelques points clés avant de plonger dans les guides longs.",
    highlights: [
      {
        title: "MCP partout",
        body: "TaTi orchestre des dizaines de ponts MCP : messagerie, bases, cloud, observabilité — une URL par service dans les réglages.",
        href: GUIDE_PATHS.mcp,
        cta: "Référence MCP",
      },
      {
        title: "Auth locale",
        body: "Sessions configurables (`TATI_SESSION_TTL_DAYS`), login activable pour les équipes qui exposent l’instance.",
        href: GUIDE_PATHS.sec,
        cta: "Voir la sécurité",
      },
      {
        title: "Compose complet",
        body: "Un `docker-compose.yml` pour Postgres, l’application et les ponts MCP avec ports documentés dans `.env.example`.",
        href: GUIDE_PATHS.quick,
        cta: "Démarrage rapide",
      },
      {
        title: "Open source",
        body: "Issues, releases et CI publics sur GitHub — vous pouvez forker, adapter les images et contribuer aux connecteurs.",
        href: "https://github.com/JeffSouop/TaTi/releases",
        cta: "Releases",
        external: true,
      },
    ],
    pillQuick: "Liens rapides",
    quickNavTitle: "Navigation utile",
    quickCols: [
      {
        title: "Installer & lancer",
        links: [
          { l: "Démarrage rapide", h: GUIDE_PATHS.quick },
          { l: "Déploiement (GHCR)", h: "/guide/deployment" },
          { l: "Fichier `.env`", h: GUIDE_PATHS.config },
          { l: "Architecture", h: GUIDE_PATHS.arch },
        ],
      },
      {
        title: "Exploitation",
        links: [
          { l: "Liste des connecteurs", h: GUIDE_PATHS.mcp },
          { l: "Auth & sessions", h: GUIDE_PATHS.sec },
          { l: "Dépannage", h: GUIDE_PATHS.trouble },
          { l: "CI GitHub Actions", h: "https://github.com/JeffSouop/TaTi/actions", ext: true },
        ],
      },
      {
        title: "Communauté",
        links: [
          { l: "Signaler un bug", h: "https://github.com/JeffSouop/TaTi/issues", ext: true },
          { l: "Code source", h: "https://github.com/JeffSouop/TaTi", ext: true },
          { l: "README projet", h: "https://github.com/JeffSouop/TaTi#readme", ext: true },
        ],
      },
    ],
    exploreTitle: "Aller plus loin",
    exploreDesc: "Suivez le projet sur GitHub pour les annonces et la roadmap implicite (issues).",
    exploreCards: [
      {
        title: "Issues",
        desc: "Demandes de fonctionnalités et bugs — recherchez avant d’ouvrir un doublon.",
        href: "https://github.com/JeffSouop/TaTi/issues",
      },
      {
        title: "Releases",
        desc: "Notes de version et artefacts pour aligner `TATI_IMAGE_TAG`.",
        href: "https://github.com/JeffSouop/TaTi/releases",
      },
      {
        title: "CI",
        desc: "État des pipelines sur la branche principale et les PR.",
        href: "https://github.com/JeffSouop/TaTi/actions",
      },
    ],
    footerTagline: "TaTi — documentation versionnée avec le code.",
    chips: [
      { label: "PostgreSQL", href: `${GUIDE_PATHS.mcp}#mcp-postgresql` },
      { label: "Slack", href: `${GUIDE_PATHS.mcp}#mcp-slack` },
      { label: "GitHub", href: `${GUIDE_PATHS.mcp}#mcp-github` },
      { label: "OpenMetadata", href: `${GUIDE_PATHS.mcp}#mcp-openmetadata` },
      { label: "Grafana", href: `${GUIDE_PATHS.mcp}#mcp-grafana` },
      { label: "Dagster", href: `${GUIDE_PATHS.mcp}#mcp-dagster` },
      { label: "Airflow", href: `${GUIDE_PATHS.mcp}#mcp-airflow` },
      { label: "Auth", href: GUIDE_PATHS.sec },
    ],
  },

  en: {
    eyebrow: "TaTi documentation",
    heroBefore: "Unlock the",
    heroGradient: "power",
    heroAfter: "of the delivery & ops copilot",
    leadHtml:
      "An open-source platform that connects your real tools (Slack, Postgres, OpenMetadata, clouds, observability…) through the <strong>Model Context Protocol</strong>. Install with Docker, configure tokens, and let your teams chat with up-to-date business context.",
    searchAria: "Search documentation",
    searchPlaceholder: "Search guides, env vars, connectors…",
    pillDeploy: "Deployment",
    deployTitle: "How do you run TaTi?",
    deployDesc:
      "Pick a path: quick trial with Compose, scale with registry images, or upgrade an existing instance.",
    deployCards: [
      {
        tag: "PoC & trial",
        title: "Quick start",
        desc: "Docker Compose, `.env`, first `docker compose up` and UI access. Ideal to validate connectors.",
        href: GUIDE_PATHS.quick,
        cta: "Read the guide",
      },
      {
        tag: "Teams & prod",
        title: "Deployment",
        desc: "GHCR images (`TATI_IMAGE_*`), network, MCP ports, Postgres backups and secret hygiene.",
        href: "/guide/deployment",
        cta: "Deployment guide",
      },
      {
        tag: "Already running",
        title: "Upgrade",
        desc: "Change image tag, check new keys in `.env.example`, restart services cleanly.",
        href: "/guide/deployment#upgrade",
        cta: "Procedure",
      },
      {
        tag: "Code & PRs",
        title: "Develop TaTi",
        desc: "Clone the repo, run the app in dev (Vite), run tests and open a PR on GitHub.",
        href: "https://github.com/JeffSouop/TaTi",
        cta: "GitHub repo",
        external: true,
      },
    ],
    pillGuides: "Guides",
    guidesTitle: "Where should you start reading?",
    guidesDesc: "No fixed order: each card opens a topic — browse like a map, not a numbered list.",
    guideTiles: [
      {
        icon: "intro",
        title: "Introduction",
        sub: "Product vision & architecture",
        href: GUIDE_PATHS.intro,
      },
      {
        icon: "quick",
        title: "Quick start",
        sub: "Docker Compose & first launch",
        href: GUIDE_PATHS.quick,
      },
      {
        icon: "config",
        title: "Configuration",
        sub: "`.env` variables explained",
        href: GUIDE_PATHS.config,
      },
      {
        icon: "mcp",
        title: "MCP connectors",
        sub: "Ports, URLs & security",
        href: GUIDE_PATHS.mcp,
      },
      {
        icon: "architecture",
        title: "Architecture",
        sub: "Request flows & services",
        href: GUIDE_PATHS.arch,
      },
      {
        icon: "security",
        title: "Security",
        sub: "Auth, tokens, guardrails",
        href: GUIDE_PATHS.sec,
      },
      {
        icon: "troubleshooting",
        title: "Troubleshooting",
        sub: "Logs & common errors",
        href: GUIDE_PATHS.trouble,
      },
      { icon: "index", title: "Guide index", sub: "Overview", href: GUIDE_PATHS.intro },
    ],
    pillConnectors: "Connectors",
    integrationsTitle: "MCP integrations",
    connectorsDocCta: "Full connector documentation",
    pillHighlights: "Highlights",
    whyTitle: "Why TaTi?",
    whyDesc: "Key points before diving into the long guides.",
    highlights: [
      {
        title: "MCP everywhere",
        body: "TaTi orchestrates dozens of MCP bridges: messaging, databases, cloud, observability — one URL per service in settings.",
        href: GUIDE_PATHS.mcp,
        cta: "MCP reference",
      },
      {
        title: "Local auth",
        body: "Configurable sessions (`TATI_SESSION_TTL_DAYS`), optional login for teams exposing the instance.",
        href: GUIDE_PATHS.sec,
        cta: "Security",
      },
      {
        title: "Full Compose",
        body: "A `docker-compose.yml` for Postgres, the app and MCP bridges with ports documented in `.env.example`.",
        href: GUIDE_PATHS.quick,
        cta: "Quick start",
      },
      {
        title: "Open source",
        body: "Issues, releases and public CI on GitHub — fork, tune images and contribute connectors.",
        href: "https://github.com/JeffSouop/TaTi/releases",
        cta: "Releases",
        external: true,
      },
    ],
    pillQuick: "Quick links",
    quickNavTitle: "Useful navigation",
    quickCols: [
      {
        title: "Install & run",
        links: [
          { l: "Quick start", h: GUIDE_PATHS.quick },
          { l: "Deployment (GHCR)", h: "/guide/deployment" },
          { l: "`.env` file", h: GUIDE_PATHS.config },
          { l: "Architecture", h: GUIDE_PATHS.arch },
        ],
      },
      {
        title: "Operations",
        links: [
          { l: "Connector list", h: GUIDE_PATHS.mcp },
          { l: "Auth & sessions", h: GUIDE_PATHS.sec },
          { l: "Troubleshooting", h: GUIDE_PATHS.trouble },
          { l: "GitHub Actions CI", h: "https://github.com/JeffSouop/TaTi/actions", ext: true },
        ],
      },
      {
        title: "Community",
        links: [
          { l: "Report a bug", h: "https://github.com/JeffSouop/TaTi/issues", ext: true },
          { l: "Source code", h: "https://github.com/JeffSouop/TaTi", ext: true },
          { l: "Project README", h: "https://github.com/JeffSouop/TaTi#readme", ext: true },
        ],
      },
    ],
    exploreTitle: "Go further",
    exploreDesc:
      "Follow the project on GitHub for announcements and the informal roadmap (issues).",
    exploreCards: [
      {
        title: "Issues",
        desc: "Features and bugs — search before opening a duplicate.",
        href: "https://github.com/JeffSouop/TaTi/issues",
      },
      {
        title: "Releases",
        desc: "Release notes and artifacts to align `TATI_IMAGE_TAG`.",
        href: "https://github.com/JeffSouop/TaTi/releases",
      },
      {
        title: "CI",
        desc: "Pipeline status on main and PRs.",
        href: "https://github.com/JeffSouop/TaTi/actions",
      },
    ],
    footerTagline: "TaTi — documentation versioned with the code.",
    chips: [
      { label: "PostgreSQL", href: `${GUIDE_PATHS.mcp}#mcp-postgresql` },
      { label: "Slack", href: `${GUIDE_PATHS.mcp}#mcp-slack` },
      { label: "GitHub", href: `${GUIDE_PATHS.mcp}#mcp-github` },
      { label: "OpenMetadata", href: `${GUIDE_PATHS.mcp}#mcp-openmetadata` },
      { label: "Grafana", href: `${GUIDE_PATHS.mcp}#mcp-grafana` },
      { label: "Dagster", href: `${GUIDE_PATHS.mcp}#mcp-dagster` },
      { label: "Airflow", href: `${GUIDE_PATHS.mcp}#mcp-airflow` },
      { label: "Auth", href: GUIDE_PATHS.sec },
    ],
  },

  zh: {
    eyebrow: "TaTi 文档",
    heroBefore: "释放",
    heroGradient: "力量",
    heroAfter: "交付与运维副驾驶",
    leadHtml:
      "开源平台，通过 <strong>Model Context Protocol</strong> 连接 Slack、Postgres、OpenMetadata、云与可观测性等真实工具。使用 Docker 安装，配置令牌，让团队在对话中获得最新的业务上下文。",
    searchAria: "搜索文档",
    searchPlaceholder: "搜索指南、环境变量、连接器…",
    pillDeploy: "部署",
    deployTitle: "如何运行 TaTi？",
    deployDesc: "选择路径：用 Compose 快速试用、用镜像仓库扩展，或升级现有实例。",
    deployCards: [
      {
        tag: "试用",
        title: "快速开始",
        desc: "Docker Compose、`.env`、首次 `docker compose up` 与访问界面。适合验证连接器。",
        href: GUIDE_PATHS.quick,
        cta: "阅读指南",
      },
      {
        tag: "团队与生产",
        title: "部署",
        desc: "GHCR 镜像（`TATI_IMAGE_*`）、网络、MCP 端口、Postgres 备份与密钥实践。",
        href: "/guide/deployment",
        cta: "部署指南",
      },
      {
        tag: "已在运行",
        title: "升级",
        desc: "更换镜像标签、核对 `.env.example` 中的新键、干净地重启服务。",
        href: "/guide/deployment#upgrade",
        cta: "步骤",
      },
      {
        tag: "代码与 PR",
        title: "开发 TaTi",
        desc: "克隆仓库、在开发模式运行（Vite）、执行测试并在 GitHub 提交 PR。",
        href: "https://github.com/JeffSouop/TaTi",
        cta: "GitHub 仓库",
        external: true,
      },
    ],
    pillGuides: "指南",
    guidesTitle: "从哪里开始读？",
    guidesDesc: "没有固定顺序：每张卡片是一个主题——像看地图一样浏览，而不是按编号列表。",
    guideTiles: [
      { icon: "intro", title: "简介", sub: "产品愿景与架构", href: GUIDE_PATHS.intro },
      {
        icon: "quick",
        title: "快速开始",
        sub: "Docker Compose 与首次启动",
        href: GUIDE_PATHS.quick,
      },
      { icon: "config", title: "配置", sub: "`.env` 变量说明", href: GUIDE_PATHS.config },
      { icon: "mcp", title: "MCP 连接器", sub: "端口、URL 与安全", href: GUIDE_PATHS.mcp },
      { icon: "architecture", title: "架构", sub: "请求流与服务", href: GUIDE_PATHS.arch },
      { icon: "security", title: "安全", sub: "认证、令牌与防护", href: GUIDE_PATHS.sec },
      {
        icon: "troubleshooting",
        title: "故障排查",
        sub: "日志与常见错误",
        href: GUIDE_PATHS.trouble,
      },
      { icon: "index", title: "指南索引", sub: "总览", href: GUIDE_PATHS.intro },
    ],
    pillConnectors: "连接器",
    integrationsTitle: "MCP 集成",
    connectorsDocCta: "连接器完整文档",
    pillHighlights: "要点",
    whyTitle: "为什么选择 TaTi？",
    whyDesc: "深入长文档前先了解几个关键点。",
    highlights: [
      {
        title: "全面的 MCP",
        body: "TaTi 编排大量 MCP 桥：消息、数据库、云、可观测性——在设置中为每个服务填写一个 URL。",
        href: GUIDE_PATHS.mcp,
        cta: "MCP 参考",
      },
      {
        title: "本地认证",
        body: "可配置会话（`TATI_SESSION_TTL_DAYS`），面向对外开放实例的团队可启用登录。",
        href: GUIDE_PATHS.sec,
        cta: "查看安全",
      },
      {
        title: "完整 Compose",
        body: "`docker-compose.yml` 涵盖 Postgres、应用与 MCP 桥，端口见 `.env.example`。",
        href: GUIDE_PATHS.quick,
        cta: "快速开始",
      },
      {
        title: "开源",
        body: "GitHub 上的 Issues、发行版与公开 CI——可 fork、调整镜像并贡献连接器。",
        href: "https://github.com/JeffSouop/TaTi/releases",
        cta: "发行版",
        external: true,
      },
    ],
    pillQuick: "快捷链接",
    quickNavTitle: "实用导航",
    quickCols: [
      {
        title: "安装与运行",
        links: [
          { l: "快速开始", h: GUIDE_PATHS.quick },
          { l: "部署（GHCR）", h: "/guide/deployment" },
          { l: "`.env` 文件", h: GUIDE_PATHS.config },
          { l: "架构", h: GUIDE_PATHS.arch },
        ],
      },
      {
        title: "运维",
        links: [
          { l: "连接器列表", h: GUIDE_PATHS.mcp },
          { l: "认证与会话", h: GUIDE_PATHS.sec },
          { l: "故障排查", h: GUIDE_PATHS.trouble },
          { l: "GitHub Actions CI", h: "https://github.com/JeffSouop/TaTi/actions", ext: true },
        ],
      },
      {
        title: "社区",
        links: [
          { l: "报告问题", h: "https://github.com/JeffSouop/TaTi/issues", ext: true },
          { l: "源代码", h: "https://github.com/JeffSouop/TaTi", ext: true },
          { l: "项目 README", h: "https://github.com/JeffSouop/TaTi#readme", ext: true },
        ],
      },
    ],
    exploreTitle: "延伸阅读",
    exploreDesc: "在 GitHub 关注项目动态与非正式路线图（issues）。",
    exploreCards: [
      {
        title: "Issues",
        desc: "功能请求与缺陷——提交前先搜索避免重复。",
        href: "https://github.com/JeffSouop/TaTi/issues",
      },
      {
        title: "发行版",
        desc: "发行说明与构件，用于对齐 `TATI_IMAGE_TAG`。",
        href: "https://github.com/JeffSouop/TaTi/releases",
      },
      {
        title: "CI",
        desc: "主分支与 PR 的流水线状态。",
        href: "https://github.com/JeffSouop/TaTi/actions",
      },
    ],
    footerTagline: "TaTi — 文档与代码同源版本管理。",
    chips: [
      { label: "PostgreSQL", href: `${GUIDE_PATHS.mcp}#mcp-postgresql` },
      { label: "Slack", href: `${GUIDE_PATHS.mcp}#mcp-slack` },
      { label: "GitHub", href: `${GUIDE_PATHS.mcp}#mcp-github` },
      { label: "OpenMetadata", href: `${GUIDE_PATHS.mcp}#mcp-openmetadata` },
      { label: "Grafana", href: `${GUIDE_PATHS.mcp}#mcp-grafana` },
      { label: "Dagster", href: `${GUIDE_PATHS.mcp}#mcp-dagster` },
      { label: "Airflow", href: `${GUIDE_PATHS.mcp}#mcp-airflow` },
      { label: "认证", href: GUIDE_PATHS.sec },
    ],
  },
};
