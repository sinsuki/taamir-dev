import { defineConfig } from "astro/config";
import { colophon } from "./src/integrations/colophon";

export default defineConfig({
  site: "https://taamir.dev",
  compressHTML: false,
  prefetch: false,
  integrations: [colophon()],
  vite: {
    build: {
      assetsInlineLimit: 0,
      modulePreload: false,
    },
  },
});
