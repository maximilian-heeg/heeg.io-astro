import {
    defineConfig,
    presetAttributify,
    presetTypography,
    presetUno,
    presetIcons,
    transformerDirectives,
  } from "unocss";
  


  export default defineConfig({
    presets: [
      presetAttributify(),
      presetUno(),
      presetTypography(),
      presetIcons(),
    ],
    rules: [["content-dot", { content: '"\\B7"' }]],
    theme: {
      colors: {
        heeg: {
          light: "#dce2e8",
          active: "#ab6d59",
          dark: "#184C80",
        },
      },
      fontFamily: {
        sans: '"Open Sans"',
        mono: '"Fira Code", monospace',
      },
      boxShadow: {
        'navigation': '0 2px 5px 2px rgba(0, 0, 0, 0.3)',
      }
    },
    transformers: [
      transformerDirectives(),
    ],
  });