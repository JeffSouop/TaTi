<script setup lang="ts">
import { computed, ref } from "vue";
import { useData, withBase } from "vitepress";
import { useLocalePath } from "../composables/useLocalePath";
import {
  MCP_CAT_LABELS,
  MCP_FILTER_ARIA,
  mcpLangFromVp,
  type CatKey,
} from "../i18n/mcpUiLocale";

const { lang } = useData();
const { localePath } = useLocalePath();

const mcpUiLang = computed(() => mcpLangFromVp(lang.value));
const filterAriaLabel = computed(() => MCP_FILTER_ARIA[mcpUiLang.value]);

const categories = computed(() => {
  const L = MCP_CAT_LABELS[mcpUiLang.value];
  const keys: CatKey[] = ["all", "data", "collab", "comms", "forge", "cloud", "observe", "google"];
  return keys.map((id) => ({ id, label: L[id] }));
});

/** Fichiers dans `docs/public/icons/brands/` (référence marques / Simple Icons). */
const BRAND_BY_ANCHOR: Record<string, string> = {
  "mcp-openmetadata": "openmetadata.svg",
  "mcp-postgresql": "postgresql.svg",
  "mcp-elasticsearch": "elasticsearch.svg",
  "mcp-pdf": "pdf.svg",
  "mcp-notion": "notion.svg",
  "mcp-filesystem": "filesystem.svg",
  "mcp-slack": "slack.svg",
  "mcp-discord": "discord.svg",
  "mcp-email": "email.svg",
  "mcp-github": "github.svg",
  "mcp-gitlab": "gitlab.svg",
  "mcp-dagster": "dagster.svg",
  "mcp-aws": "aws.svg",
  "mcp-azure": "azure.svg",
  "mcp-gcp": "gcp.svg",
  "mcp-grafana": "grafana.svg",
  "mcp-prometheus": "prometheus.svg",
  "mcp-datadog": "datadog.svg",
  "mcp-google": "google.svg",
  "mcp-moodle": "moodle.svg",
};

type CatId = CatKey;

type Svc = {
  cat: Exclude<CatId, "all">;
  name: string;
  anchor: string;
  /** Ligne courte sous le nom. */
  hint: string;
  /** Détail supplémentaire (aperçu ; la page Guide MCP reste la référence). */
  detail: string;
};

const services: Svc[] = [
  {
    cat: "data",
    name: "OpenMetadata",
    anchor: "mcp-openmetadata",
    hint: "Catalogue, métadonnées",
    detail: "Lignage, glossaires, recherche d’entités ; mutations optionnelles.",
  },
  {
    cat: "data",
    name: "PostgreSQL",
    anchor: "mcp-postgresql",
    hint: "SQL / introspection",
    detail: "Schéma, SELECT analytiques ; lecture seule recommandée.",
  },
  {
    cat: "data",
    name: "Elasticsearch",
    anchor: "mcp-elasticsearch",
    hint: "Recherche & indices",
    detail: "Logs et DSL ; attention aux opérations d’admin sur les indices.",
  },
  {
    cat: "collab",
    name: "PDF",
    anchor: "mcp-pdf",
    hint: "Génération & fichiers",
    detail: "Exports téléchargeables ; URL publique (`MCP_PDF_PUBLIC_BASE_URL`).",
  },
  {
    cat: "collab",
    name: "Notion",
    anchor: "mcp-notion",
    hint: "Pages & bases",
    detail: "Runbooks et suivi ; droits = jeton d’intégration.",
  },
  {
    cat: "collab",
    name: "Filesystem",
    anchor: "mcp-filesystem",
    hint: "Lecture du workspace",
    detail: "Arbre sous `FILESYSTEM_ROOT` uniquement.",
  },
  {
    cat: "comms",
    name: "Slack",
    anchor: "mcp-slack",
    hint: "Bot & canaux",
    detail: "Historique et envoi ; restreindre avec `CHANNEL_IDS`.",
  },
  {
    cat: "comms",
    name: "Discord",
    anchor: "mcp-discord",
    hint: "Serveur & salons",
    detail: "Équivalent Discord ; intents et salons listés.",
  },
  {
    cat: "comms",
    name: "Email (SMTP)",
    anchor: "mcp-email",
    hint: "Envoi contrôlé",
    detail: "SMTP sortant ; destinataires via allowlist.",
  },
  {
    cat: "forge",
    name: "GitHub",
    anchor: "mcp-github",
    hint: "API GitHub",
    detail: "PR, issues, CI ; écritures avec confirmation.",
  },
  {
    cat: "forge",
    name: "GitLab",
    anchor: "mcp-gitlab",
    hint: "API GitLab",
    detail: "MR, pipelines ; instance SaaS ou self-hosted.",
  },
  {
    cat: "forge",
    name: "Dagster",
    anchor: "mcp-dagster",
    hint: "GraphQL Dagster",
    detail: "Runs, assets, partitions ; mutations selon flag.",
  },
  {
    cat: "cloud",
    name: "AWS",
    anchor: "mcp-aws",
    hint: "Ops lecture (principalement)",
    detail: "Describe/list ; IAM minimal pour limiter les risques.",
  },
  {
    cat: "cloud",
    name: "Azure",
    anchor: "mcp-azure",
    hint: "ARM / ressources",
    detail: "Resource groups, VM… privilégier Reader.",
  },
  {
    cat: "cloud",
    name: "GCP",
    anchor: "mcp-gcp",
    hint: "Projet & APIs",
    detail: "Compute, GKE, stockage ; compte de service dédié.",
  },
  {
    cat: "observe",
    name: "Grafana",
    anchor: "mcp-grafana",
    hint: "Serveur MCP officiel",
    detail: "Dashboards, dossiers, alertes.",
  },
  {
    cat: "observe",
    name: "Prometheus",
    anchor: "mcp-prometheus",
    hint: "Requêtes & métriques",
    detail: "PromQL, targets ; attention à la cardinalité.",
  },
  {
    cat: "observe",
    name: "Datadog",
    anchor: "mcp-datadog",
    hint: "Endpoint MCP distant",
    detail: "APM, logs, métriques ; clés en headers.",
  },
  {
    cat: "google",
    name: "Gmail / Agenda",
    anchor: "mcp-google",
    hint: "MCP Google Cloud",
    detail: "OAuth et scopes ; endpoints hébergés Google.",
  },
  {
    cat: "google",
    name: "Moodle",
    anchor: "mcp-moodle",
    hint: "Plugin MCP Moodle",
    detail: "Webservice Moodle ; jeton au moindre privilège.",
  },
];

const selected = ref<CatId>("all");

const brandFailed = ref<Record<string, boolean>>({});
const brandLoaded = ref<Record<string, boolean>>({});

const filtered = computed(() => {
  if (selected.value === "all") return services;
  return services.filter((s) => s.cat === selected.value);
});

function hrefFor(s: Svc) {
  return localePath(`/guide/mcp#${s.anchor}`);
}

function brandIconUrl(s: Svc): string {
  const file = BRAND_BY_ANCHOR[s.anchor];
  return file ? withBase(`/icons/brands/${file}`) : "";
}

function onBrandError(anchor: string) {
  brandFailed.value = { ...brandFailed.value, [anchor]: true };
}

function onBrandLoad(anchor: string) {
  brandLoaded.value = { ...brandLoaded.value, [anchor]: true };
}

function showGlyphFallback(s: Svc): boolean {
  return brandFailed.value[s.anchor] === true || brandLoaded.value[s.anchor] !== true;
}

/** Initiales si l’image est absente ou en erreur de chargement. */
function initials(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned
    .split(/[/|]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[1][0] ?? "";
    return (a + b).toUpperCase();
  }
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function glyphHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 360;
  return h;
}
</script>

<template>
  <div class="mint-int">
    <aside class="mint-int__sidebar" :aria-label="filterAriaLabel">
      <button
        v-for="c in categories"
        :key="c.id"
        type="button"
        class="mint-int__tab"
        :class="{ 'mint-int__tab--active': selected === c.id }"
        @click="selected = c.id"
      >
        {{ c.label }}
      </button>
    </aside>

    <div class="mint-int__grid">
      <a v-for="s in filtered" :key="s.anchor" class="mint-card" :href="hrefFor(s)">
        <div class="mint-card__brand-wrap" aria-hidden="true">
          <img
            v-if="brandIconUrl(s) && !brandFailed[s.anchor]"
            class="mint-card__brand"
            :src="brandIconUrl(s)"
            alt=""
            loading="lazy"
            decoding="async"
            @error="onBrandError(s.anchor)"
            @load="onBrandLoad(s.anchor)"
          />
          <span
            v-show="showGlyphFallback(s)"
            class="mint-card__glyph"
            :style="{ '--glyph-hue': String(glyphHue(s.name)) }"
          >
            {{ initials(s.name) }}
          </span>
        </div>
        <span class="mint-card__name">{{ s.name }}</span>
        <span class="mint-card__hint">{{ s.hint }}</span>
        <span class="mint-card__detail">{{ s.detail }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.mint-int {
  display: grid;
  gap: 1.5rem;
  padding-top: 0.25rem;
}

@media (min-width: 960px) {
  .mint-int {
    grid-template-columns: 200px 1fr;
    align-items: start;
  }
}

.mint-int__sidebar {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.4rem;
}

@media (min-width: 960px) {
  .mint-int__sidebar {
    flex-direction: column;
    flex-wrap: nowrap;
    position: sticky;
    top: calc(var(--vp-nav-height) + 1rem);
  }
}

.mint-int__tab {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition:
    background var(--om-duration) var(--om-ease),
    color var(--om-duration) var(--om-ease),
    border-color var(--om-duration) var(--om-ease),
    transform var(--om-duration) var(--om-ease);
}

.mint-int__tab:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.mint-int__tab--active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: rgba(6, 182, 212, 0.35);
}

.mint-int__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(188px, 1fr));
  gap: 0.85rem;
}

.mint-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.95rem 0.9rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  text-decoration: none;
  color: inherit;
  transition:
    transform var(--om-duration) var(--om-ease),
    border-color var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease);
}

.mint-card:hover {
  transform: translateY(-3px);
  border-color: rgba(6, 182, 212, 0.45);
  box-shadow: var(--om-shadow-card);
}

.mint-card__brand-wrap {
  position: relative;
  width: 2.35rem;
  height: 2.35rem;
  flex-shrink: 0;
}

.mint-card__brand {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 1;
}

.mint-card__glyph {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #fff;
  background: linear-gradient(
    135deg,
    hsl(var(--glyph-hue, 190), 72%, 42%),
    hsl(calc(var(--glyph-hue, 190) + 28), 65%, 36%)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.mint-card__name {
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--vp-c-text-1);
}

.mint-card__hint {
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--vp-c-text-3);
}

.mint-card__detail {
  font-size: 0.68rem;
  line-height: 1.4;
  color: var(--vp-c-text-3);
  opacity: 0.92;
}
</style>
