import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";
import purgecss from "astro-purgecss";
import sitemap from "astro-sitemap";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  site: "https://heeg.io",
  integrations: [UnoCSS(), purgecss(), sitemap(), mdx()]
});