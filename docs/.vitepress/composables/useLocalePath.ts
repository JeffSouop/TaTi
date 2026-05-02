import { computed } from "vue";
import { useData, withBase } from "vitepress";

/** Préfixe de chemin pour une locale VitePress (`/` = français racine). */
export function useLocalePath() {
  const { lang } = useData();
  const prefix = computed(() => {
    if (lang.value === "en-US") return "/en";
    if (lang.value === "zh-CN") return "/zh";
    return "";
  });

  /** Chemins internes du site (`/guide/...`, `/guide/mcp#anchor`). Les assets (`/tati-logo.png`) restent sans locale. */
  function localePath(path: string): string {
    const hashIdx = path.indexOf("#");
    const pathname = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
    const hash = hashIdx >= 0 ? path.slice(hashIdx) : "";
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return withBase(`${prefix.value}${normalized}${hash}`);
  }

  return { localePath, lang };
}
