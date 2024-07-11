import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";
import purgecss from "astro-purgecss";
import sitemap from "astro-sitemap";
import { rehypePrettyCode } from 'rehype-pretty-code';
import mdx from "@astrojs/mdx";


/** @type {import('rehype-pretty-code').Options} */
const options = {
  // See Options section below.
};


// https://astro.build/config
export default defineConfig({
  site: "https://heeg.io",
  markdown: {
    syntaxHighlight: false,
    rehypePlugins: [
      [rehypePrettyCode, options],
    ],  
  },
  integrations: [UnoCSS(), purgecss(), sitemap(), mdx()],
});
