/** Libellés filtres intégrations MCP (page d’accueil). */
export type McpLang = "fr" | "en" | "zh";

export function mcpLangFromVp(lang: string): McpLang {
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("en")) return "en";
  return "fr";
}

export const MCP_FILTER_ARIA: Record<McpLang, string> = {
  fr: "Filtrer par catégorie",
  en: "Filter by category",
  zh: "按类别筛选",
};

export type CatKey = "all" | "data" | "collab" | "comms" | "forge" | "cloud" | "observe" | "google";

export const MCP_CAT_LABELS: Record<McpLang, Record<CatKey, string>> = {
  fr: {
    all: "Tous",
    data: "Données & catalogue",
    collab: "Docs & fichiers",
    comms: "Messagerie",
    forge: "Forge & pipelines",
    cloud: "Cloud",
    observe: "Observabilité",
    google: "Google & autres",
  },
  en: {
    all: "All",
    data: "Data & catalog",
    collab: "Docs & files",
    comms: "Messaging",
    forge: "Forge & pipelines",
    cloud: "Cloud",
    observe: "Observability",
    google: "Google & more",
  },
  zh: {
    all: "全部",
    data: "数据与目录",
    collab: "文档与文件",
    comms: "消息",
    forge: "代码与流水线",
    cloud: "云",
    observe: "可观测性",
    google: "Google 及其他",
  },
};
