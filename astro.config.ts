import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import { colophon } from "./src/integrations/colophon";

export default defineConfig({
  site: "https://taamir.dev",
  compressHTML: false,
  prefetch: false,
  integrations: [mdx(), colophon()],
  markdown: {
    shikiConfig: {
      theme: "css-variables",
    },
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
      modulePreload: false,
      cssMinify: "lightningcss",
    },
    css: {
      transformer: "lightningcss",
    },
  },
});
