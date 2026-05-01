<script setup lang="ts">
import { onMounted, ref } from "vue";
import { withBase } from "vitepress";
import McpIntegrationsSection from "./McpIntegrationsSection.vue";

const searchKbd = ref("Ctrl K");

onMounted(() => {
  if (typeof navigator !== "undefined" && navigator.platform.includes("Mac")) {
    searchKbd.value = "⌘ K";
  }
});

function openSearch(e?: MouseEvent) {
  e?.preventDefault();
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    }),
  );
}

const logoSrc = withBase("/tati-logo.png");

const chips = [
  { label: "PostgreSQL", href: "/guide/mcp#mcp-postgresql" },
  { label: "Slack", href: "/guide/mcp#mcp-slack" },
  { label: "GitHub", href: "/guide/mcp#mcp-github" },
  { label: "OpenMetadata", href: "/guide/mcp#mcp-openmetadata" },
  { label: "Grafana", href: "/guide/mcp#mcp-grafana" },
  { label: "Auth", href: "/guide/security" },
];

const deploy = [
  {
    tag: "PoC & essai",
    title: "Démarrage rapide",
    desc: "Docker Compose, fichier `.env`, premier `docker compose up` et accès à l’UI. Idéal pour valider les connecteurs.",
    href: "/guide/quick-start",
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
];

/** Étiquettes courtes : pas de numérotation — chaque entrée a son « angle ». */
const guideTiles = [
  {
    badge: "Horizon",
    title: "Introduction",
    href: "/guide/introduction",
    sub: "Vision produit & architecture",
  },
  {
    badge: "Allumage",
    title: "Démarrage rapide",
    href: "/guide/quick-start",
    sub: "Docker Compose & premier lancement",
  },
  {
    badge: "Réglages",
    title: "Configuration",
    href: "/guide/configuration",
    sub: "Variables `.env` expliquées",
  },
  {
    badge: "Ponts",
    title: "Connecteurs MCP",
    href: "/guide/mcp",
    sub: "Ports, URL et sécurité",
  },
  {
    badge: "Circulation",
    title: "Architecture",
    href: "/guide/architecture",
    sub: "Flux requêtes & services",
  },
  {
    badge: "Verrous",
    title: "Sécurité",
    href: "/guide/security",
    sub: "Auth, jetons, garde-fous",
  },
  {
    badge: "Diagnostic",
    title: "Dépannage",
    href: "/guide/troubleshooting",
    sub: "Logs & erreurs fréquentes",
  },
  {
    badge: "Cartographie",
    title: "Index guides",
    href: "/guide/introduction",
    sub: "Vue d’ensemble",
  },
];

const highlights = [
  {
    title: "MCP partout",
    body: "TaTi orchestre des dizaines de ponts MCP : messagerie, bases, cloud, observabilité — une URL par service dans les réglages.",
    href: "/guide/mcp",
    cta: "Référence MCP",
  },
  {
    title: "Auth locale",
    body: "Sessions configurables (`TATI_SESSION_TTL_DAYS`), login activable pour les équipes qui exposent l’instance.",
    href: "/guide/security",
    cta: "Voir la sécurité",
  },
  {
    title: "Compose complet",
    body: "Un `docker-compose.yml` pour Postgres, l’application et les ponts MCP avec ports documentés dans `.env.example`.",
    href: "/guide/quick-start",
    cta: "Démarrage rapide",
  },
  {
    title: "Open source",
    body: "Issues, releases et CI publics sur GitHub — vous pouvez forker, adapter les images et contribuer aux connecteurs.",
    href: "https://github.com/JeffSouop/TaTi/releases",
    cta: "Releases",
    external: true,
  },
];

const quickCols = [
  {
    title: "Installer & lancer",
    links: [
      { l: "Démarrage rapide", h: "/guide/quick-start" },
      { l: "Déploiement (GHCR)", h: "/guide/deployment" },
      { l: "Fichier `.env`", h: "/guide/configuration" },
      { l: "Architecture", h: "/guide/architecture" },
    ],
  },
  {
    title: "Exploitation",
    links: [
      { l: "Liste des connecteurs", h: "/guide/mcp" },
      { l: "Auth & sessions", h: "/guide/security" },
      { l: "Dépannage", h: "/guide/troubleshooting" },
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
];

const exploreCards = [
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
];
</script>

<template>
  <div class="om-root">
    <div class="om-shell">
      <section class="om-hero">
        <div class="om-hero-brand">
          <div class="om-logo-wrap">
            <img
              class="om-logo"
              :src="logoSrc"
              width="96"
              height="96"
              alt="TaTi"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
        <p class="om-eyebrow">Documentation TaTi</p>
        <h1 class="om-title">
          Libérez la
          <span class="om-gradient"> puissance </span>
          <span class="om-title-rest">du copilote delivery &amp; ops</span>
        </h1>
        <p class="om-lead">
          Une plateforme open source qui relie vos outils réels (Slack, Postgres, OpenMetadata,
          clouds, observabilité…) au travers du <strong>Model Context Protocol</strong>. Installez
          avec Docker, configurez les jetons, puis laissez vos équipes chatter avec un contexte
          métier à jour.
        </p>

        <button
          type="button"
          class="om-search"
          aria-label="Rechercher dans la documentation"
          @click="openSearch"
        >
          <span class="om-search-icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" stroke-linecap="round" />
            </svg>
          </span>
          <span class="om-search-placeholder">Rechercher guides, variables, connecteurs…</span>
          <kbd class="om-kbd">{{ searchKbd }}</kbd>
        </button>

        <div class="om-chips" role="list">
          <a
            v-for="c in chips"
            :key="c.label"
            class="om-chip"
            role="listitem"
            :href="withBase(c.href)"
          >
            {{ c.label }}
          </a>
        </div>
      </section>

      <section class="om-section">
        <div class="om-kicker-row">
          <span class="om-pill">Déploiement</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">Comment lancer TaTi ?</span>
        </h2>
        <p class="om-section-desc">
          Choisissez un parcours : essai express avec Compose, montée en charge avec images
          registry, ou bien mise à niveau d’une instance existante.
        </p>
        <div class="om-grid om-grid--4">
          <article v-for="card in deploy" :key="card.title" class="om-card">
            <span class="om-card-tag">{{ card.tag }}</span>
            <h3 class="om-card-title">{{ card.title }}</h3>
            <p class="om-card-desc">{{ card.desc }}</p>
            <a
              class="om-card-link"
              :href="card.external ? card.href : withBase(card.href)"
              :target="card.external ? '_blank' : undefined"
              :rel="card.external ? 'noreferrer' : undefined"
            >
              {{ card.cta }}
              <span aria-hidden="true"> →</span>
            </a>
          </article>
        </div>
      </section>

      <section class="om-section om-section--soft">
        <div class="om-kicker-row">
          <span class="om-pill">Guides</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">Par où commencer la lecture ?</span>
        </h2>
        <p class="om-section-desc">
          Aucun ordre imposé : chaque carte ouvre un volet — naviguez comme dans une carte,
          pas comme dans une liste numérotée.
        </p>
        <div class="om-guide-grid">
          <a v-for="g in guideTiles" :key="g.title" class="om-guide-card" :href="withBase(g.href)">
            <span class="om-guide-badge" aria-hidden="true">{{ g.badge }}</span>
            <span class="om-guide-title">{{ g.title }}</span>
            <span class="om-guide-sub">{{ g.sub }}</span>
          </a>
        </div>
      </section>

      <section class="om-section">
        <div class="om-kicker-row">
          <span class="om-pill">Connecteurs</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">Intégrations MCP</span>
        </h2>
        <div class="om-integrations-grid">
          <McpIntegrationsSection />
        </div>
        <div class="om-center om-center--pad">
          <a class="om-btn-secondary" :href="withBase('/guide/mcp')"
            >Documentation détaillée des connecteurs</a
          >
        </div>
      </section>

      <section class="om-section om-section--soft">
        <div class="om-kicker-row">
          <span class="om-pill">À retenir</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">Pourquoi TaTi ?</span>
        </h2>
        <p class="om-section-desc">Quelques points clés avant de plonger dans les guides longs.</p>
        <div class="om-grid om-grid--2">
          <article v-for="h in highlights" :key="h.title" class="om-highlight-block">
            <h3 class="om-card-title">{{ h.title }}</h3>
            <p class="om-card-desc">{{ h.body }}</p>
            <a
              class="om-card-link"
              :href="h.external ? h.href : withBase(h.href)"
              :target="h.external ? '_blank' : undefined"
              :rel="h.external ? 'noreferrer' : undefined"
            >
              {{ h.cta }} →
            </a>
          </article>
        </div>
      </section>

      <section class="om-section">
        <div class="om-kicker-row">
          <span class="om-pill">Liens rapides</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">Navigation utile</span>
        </h2>
        <div class="om-triple">
          <div v-for="col in quickCols" :key="col.title" class="om-triple-col">
            <h3 class="om-triple-head">{{ col.title }}</h3>
            <ul class="om-triple-list">
              <li v-for="lk in col.links" :key="lk.l">
                <a
                  :href="lk.ext ? lk.h : withBase(lk.h)"
                  :target="lk.ext ? '_blank' : undefined"
                  :rel="lk.ext ? 'noreferrer' : undefined"
                >
                  {{ lk.l }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section class="om-section om-explore">
        <h2 class="om-explore-title">Aller plus loin</h2>
        <p class="om-section-desc">
          Suivez le projet sur GitHub pour les annonces et la roadmap implicite (issues).
        </p>
        <div class="om-explore-grid">
          <a
            v-for="ex in exploreCards"
            :key="ex.title"
            class="om-explore-card"
            :href="ex.href"
            target="_blank"
            rel="noreferrer"
          >
            <strong>{{ ex.title }}</strong>
            <span>{{ ex.desc }}</span>
          </a>
        </div>
      </section>

      <section class="om-footer-strip">
        <div class="om-footer-inner">
          <div><strong>TaTi</strong> — documentation versionnée avec le code.</div>
          <div class="om-footer-links">
            <a href="https://github.com/JeffSouop/TaTi/issues">Issues</a>
            <a href="https://github.com/JeffSouop/TaTi/releases">Releases</a>
            <a href="https://github.com/JeffSouop/TaTi/actions">CI</a>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.om-root {
  padding: 0.5rem 0 3rem;
}

.om-shell {
  max-width: 1120px;
  margin: 0 auto;
}

.om-hero {
  padding: 1.75rem 0 2.25rem;
  text-align: center;
}

.om-hero-brand {
  margin-bottom: 1.35rem;
}

.om-logo-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 16px;
  border-radius: 22px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  box-shadow: var(--om-shadow-card);
  transition:
    border-color var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease),
    transform var(--om-duration) var(--om-ease);
}

.om-logo-wrap:hover {
  border-color: rgba(6, 182, 212, 0.35);
  box-shadow: 0 10px 36px rgba(6, 182, 212, 0.12);
  transform: translateY(-2px);
}

.dark .om-logo-wrap {
  background: rgba(30, 41, 59, 0.65);
}

.om-logo {
  display: block;
  width: 88px;
  height: 88px;
  max-width: min(88px, 28vw);
  max-height: min(88px, 28vw);
  object-fit: contain;
}

.om-eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.om-title {
  margin: 0;
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
}

.om-gradient {
  background: linear-gradient(120deg, #06b6d4 0%, #0e7490 42%, #6366f1 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.om-title-rest {
  display: block;
  margin-top: 0.2em;
}

@media (min-width: 720px) {
  .om-title-rest {
    display: inline;
    margin-left: 0.2em;
  }
}

.om-lead {
  margin: 1.25rem auto 0;
  max-width: 52rem;
  font-size: 1.08rem;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.om-lead strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.om-search {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 2rem auto 0;
  max-width: min(640px, 100%);
  width: 100%;
  box-sizing: border-box;
  padding: 0.7rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--om-shadow-card);
  cursor: pointer;
  font: inherit;
  color: var(--vp-c-text-2);
  transition:
    border-color var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease),
    transform var(--om-duration) var(--om-ease);
}

.om-search:hover {
  border-color: rgba(6, 182, 212, 0.45);
  box-shadow: 0 8px 28px rgba(6, 182, 212, 0.12);
  transform: translateY(-1px);
}

.om-search-icon {
  display: flex;
  color: var(--vp-c-text-3);
}

.om-search-placeholder {
  flex: 1;
  text-align: left;
  font-size: 0.95rem;
}

.om-kbd {
  margin-left: auto;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.om-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.om-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition:
    background var(--om-duration) var(--om-ease),
    border-color var(--om-duration) var(--om-ease),
    transform var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease);
}

.om-chip:hover {
  border-color: rgba(99, 102, 241, 0.45);
  background: rgba(99, 102, 241, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.12);
}

.om-kicker-row {
  display: flex;
  justify-content: center;
  margin-bottom: 0.65rem;
}

.om-pill {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

.om-section {
  margin-top: 3.25rem;
}

.om-section--soft {
  padding: clamp(1.75rem, 4vw, 2.75rem) clamp(1rem, 3vw, 1.75rem);
  border-radius: var(--om-radius-lg);
  background: linear-gradient(180deg, var(--vp-c-bg-soft) 0%, transparent 100%);
  border: 1px solid var(--vp-c-divider);
}

.om-section-head {
  margin: 0;
  text-align: center;
}

.om-integrations-grid {
  margin-top: 1.5rem;
}

.om-section-title-lg {
  font-size: clamp(1.35rem, 2.5vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.om-section-desc {
  margin: 0.75rem auto 0;
  max-width: 46rem;
  text-align: center;
  font-size: 0.98rem;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.om-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1.75rem;
}

.om-grid--4 {
  grid-template-columns: 1fr;
}

.om-grid--2 {
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .om-grid--4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .om-grid--2 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1100px) {
  .om-grid--4 {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 900px) {
  .om-grid--2 {
    grid-template-columns: repeat(2, 1fr);
  }
}

.om-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.35rem 1.35rem 1.2rem;
  border-radius: var(--om-radius-md);
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--om-shadow-card);
  min-height: 100%;
  transition:
    transform var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease),
    border-color var(--om-duration) var(--om-ease);
}

.om-card:hover {
  transform: translateY(-3px);
  border-color: rgba(6, 182, 212, 0.35);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.dark .om-card:hover {
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.om-card-tag {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-brand-1);
  margin-bottom: 0.5rem;
}

.om-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.om-card-desc {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  flex: 1;
}

.om-card-link {
  margin-top: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition:
    color var(--om-duration) var(--om-ease),
    text-decoration-color var(--om-duration) var(--om-ease);
}

.om-card-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.om-guide-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: 1.75rem;
}

@media (min-width: 720px) {
  .om-guide-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.om-guide-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.15rem 0.75rem;
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  text-decoration: none;
  color: inherit;
  transition:
    border-color var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease),
    transform var(--om-duration) var(--om-ease);
}

.om-guide-card:hover {
  border-color: rgba(6, 182, 212, 0.4);
  box-shadow: var(--om-shadow-card);
  transform: translateY(-2px);
}

.om-guide-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.55rem;
  padding: 0.35rem 0.65rem;
  max-width: 100%;
  border-radius: 999px;
  background: linear-gradient(
    135deg,
    rgba(6, 182, 212, 0.18) 0%,
    rgba(99, 102, 241, 0.12) 100%
  );
  border: 1px solid rgba(6, 182, 212, 0.28);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.25;
  color: var(--vp-c-brand-1);
  box-sizing: border-box;
}

.om-guide-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.om-guide-sub {
  margin-top: 0.25rem;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--vp-c-text-3);
}

.om-center {
  display: flex;
  justify-content: center;
}

.om-center--pad {
  margin-top: 1.75rem;
}

.om-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.15rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  transition:
    border-color var(--om-duration) var(--om-ease),
    color var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease),
    transform var(--om-duration) var(--om-ease);
}

.om-btn-secondary:hover {
  border-color: rgba(6, 182, 212, 0.45);
  color: var(--vp-c-brand-1);
  box-shadow: 0 6px 20px rgba(6, 182, 212, 0.12);
  transform: translateY(-1px);
}

.om-highlight-block {
  padding: 1.25rem;
  border-radius: var(--om-radius-md);
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  transition:
    border-color var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease),
    transform var(--om-duration) var(--om-ease);
}

.om-highlight-block:hover {
  border-color: rgba(6, 182, 212, 0.28);
  box-shadow: var(--om-shadow-card);
  transform: translateY(-2px);
}

.om-triple {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 1.75rem;
}

@media (min-width: 800px) {
  .om-triple {
    grid-template-columns: repeat(3, 1fr);
  }
}

.om-triple-head {
  margin: 0 0 0.65rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.om-triple-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.om-triple-list li {
  margin: 0.4rem 0;
}

.om-triple-list a {
  color: var(--vp-c-brand-1);
  font-weight: 500;
  text-decoration: none;
  font-size: 0.92rem;
  transition:
    color var(--om-duration) var(--om-ease),
    text-decoration-color var(--om-duration) var(--om-ease);
}

.om-triple-list a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.om-explore {
  padding: 2rem 0 0;
}

.om-explore-title {
  margin: 0;
  text-align: center;
  font-size: 1.35rem;
  font-weight: 700;
}

.om-explore-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

@media (min-width: 700px) {
  .om-explore-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.om-explore-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition:
    border-color var(--om-duration) var(--om-ease),
    box-shadow var(--om-duration-relaxed) var(--om-ease),
    transform var(--om-duration) var(--om-ease);
}

.om-explore-card:hover {
  border-color: rgba(6, 182, 212, 0.45);
  box-shadow: 0 8px 28px rgba(6, 182, 212, 0.1);
  transform: translateY(-2px);
}

.om-explore-card strong {
  font-size: 1rem;
}

.om-explore-card span {
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}

.om-footer-strip {
  margin-top: 3rem;
  padding: 1.25rem 0;
  border-top: 1px solid var(--vp-c-divider);
}

.om-footer-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

.om-footer-links {
  display: flex;
  gap: 1rem;
}

.om-footer-links a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--om-duration) var(--om-ease);
}

.om-footer-links a:hover {
  color: var(--vp-c-brand-1);
}
</style>
