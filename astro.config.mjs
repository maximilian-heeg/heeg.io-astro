import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro';

// https://astro.build/config
import svelte from "@astrojs/svelte";

// https://astro.build/config
import image from "@astrojs/image";

// https://astro.build/config
export default defineConfig({
  integrations: [
    UnoCSS(), 
    svelte(), 
    image({
        serviceEntryPoint: '@astrojs/image/sharp'
      })]
});