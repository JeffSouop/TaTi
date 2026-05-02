<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import McpIntegrationsSection from "./McpIntegrationsSection.vue";
import { useLocalePath } from "../composables/useLocalePath";
import { HOME_LOCALE, homeLocaleFromLang } from "../i18n/homeLocale";

const searchKbd = ref("Ctrl K");

const { localePath, lang } = useLocalePath();

const t = computed(() => HOME_LOCALE[homeLocaleFromLang(lang.value)]);

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
        <p class="om-eyebrow">{{ t.eyebrow }}</p>
        <h1 class="om-title">
          {{ t.heroBefore }}
          <span class="om-gradient"> {{ t.heroGradient }} </span>
          <span class="om-title-rest">{{ t.heroAfter }}</span>
        </h1>
        <p class="om-lead" v-html="t.leadHtml"></p>

        <button type="button" class="om-search" :aria-label="t.searchAria" @click="openSearch">
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
          <span class="om-search-placeholder">{{ t.searchPlaceholder }}</span>
          <kbd class="om-kbd">{{ searchKbd }}</kbd>
        </button>

        <div class="om-chips" role="list">
          <a
            v-for="c in t.chips"
            :key="c.label"
            class="om-chip"
            role="listitem"
            :href="localePath(c.href)"
          >
            {{ c.label }}
          </a>
        </div>
      </section>

      <section class="om-section">
        <div class="om-kicker-row">
          <span class="om-pill">{{ t.pillDeploy }}</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">{{ t.deployTitle }}</span>
        </h2>
        <p class="om-section-desc">{{ t.deployDesc }}</p>
        <div class="om-grid om-grid--4">
          <article v-for="card in t.deployCards" :key="card.title" class="om-card">
            <span class="om-card-tag">{{ card.tag }}</span>
            <h3 class="om-card-title">{{ card.title }}</h3>
            <p class="om-card-desc">{{ card.desc }}</p>
            <a
              class="om-card-link"
              :href="card.external ? card.href : localePath(card.href)"
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
          <span class="om-pill">{{ t.pillGuides }}</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">{{ t.guidesTitle }}</span>
        </h2>
        <p class="om-section-desc">{{ t.guidesDesc }}</p>
        <div class="om-guide-grid">
          <a v-for="g in t.guideTiles" :key="g.title" class="om-guide-card" :href="localePath(g.href)">
            <span class="om-guide-icon-wrap" aria-hidden="true">
              <img
                class="om-guide-icon-img"
                :src="withBase(`/home/guide-icons/${g.icon}.svg`)"
                width="40"
                height="40"
                alt=""
                decoding="async"
                loading="lazy"
              />
            </span>
            <span class="om-guide-title">{{ g.title }}</span>
            <span class="om-guide-sub">{{ g.sub }}</span>
          </a>
        </div>
      </section>

      <section class="om-section">
        <div class="om-kicker-row">
          <span class="om-pill">{{ t.pillConnectors }}</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">{{ t.integrationsTitle }}</span>
        </h2>
        <div class="om-integrations-grid">
          <McpIntegrationsSection />
        </div>
        <div class="om-center om-center--pad">
          <a class="om-btn-secondary" :href="localePath('/guide/mcp')">{{ t.connectorsDocCta }}</a>
        </div>
      </section>

      <section class="om-section om-section--soft">
        <div class="om-kicker-row">
          <span class="om-pill">{{ t.pillHighlights }}</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">{{ t.whyTitle }}</span>
        </h2>
        <p class="om-section-desc">{{ t.whyDesc }}</p>
        <div class="om-grid om-grid--2">
          <article v-for="h in t.highlights" :key="h.title" class="om-highlight-block">
            <h3 class="om-card-title">{{ h.title }}</h3>
            <p class="om-card-desc">{{ h.body }}</p>
            <a
              class="om-card-link"
              :href="h.external ? h.href : localePath(h.href)"
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
          <span class="om-pill">{{ t.pillQuick }}</span>
        </div>
        <h2 class="om-section-head">
          <span class="om-section-title-lg">{{ t.quickNavTitle }}</span>
        </h2>
        <div class="om-triple">
          <div v-for="col in t.quickCols" :key="col.title" class="om-triple-col">
            <h3 class="om-triple-head">{{ col.title }}</h3>
            <ul class="om-triple-list">
              <li v-for="lk in col.links" :key="lk.l">
                <a
                  :href="lk.ext ? lk.h : localePath(lk.h)"
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
        <h2 class="om-explore-title">{{ t.exploreTitle }}</h2>
        <p class="om-section-desc">{{ t.exploreDesc }}</p>
        <div class="om-explore-grid">
          <a
            v-for="ex in t.exploreCards"
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
          <div>{{ t.footerTagline }}</div>
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

.om-guide-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.55rem;
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  background: linear-gradient(
    145deg,
    rgba(6, 182, 212, 0.14) 0%,
    rgba(99, 102, 241, 0.1) 100%
  );
  border: 1px solid rgba(6, 182, 212, 0.22);
  box-sizing: border-box;
}

.dark .om-guide-icon-wrap {
  background: rgba(30, 41, 59, 0.5);
  border-color: rgba(6, 182, 212, 0.22);
}

.om-guide-icon-img {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: contain;
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
