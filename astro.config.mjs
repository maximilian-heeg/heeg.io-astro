import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

// https://astro.build/config
import image from "@astrojs/image";

// https://astro.build/config
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
import purgecss from "astro-purgecss";

// https://astro.build/config
export default defineConfig({
  site: "https://heeg.io",
  integrations: [
    UnoCSS(),
    image({
      serviceEntryPoint: "@astrojs/image/sharp",
    }),
    sitemap(),
    purgecss(),
  ],
});
