import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import TaTiHome from "../components/TaTiHome.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("TaTiHome", TaTiHome);
  },
} satisfies Theme;
