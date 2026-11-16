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
      // Inline style attributes are blocked by style-src 'self'. Move Shiki's
      // var(--astro-code-*) colors onto classes the stylesheet can paint.
      transformers: [
        {
          name: "palette-tokens",
          pre(node) {
            delete node.properties.style;
          },
          span(node) {
            const style = typeof node.properties.style === "string" ? node.properties.style : "";
            const classes = new Set<string>();
            const current = node.properties.class;
            if (typeof current === "string") {
              for (const name of current.split(/\s+/)) if (name) classes.add(name);
            } else if (Array.isArray(current)) {
              for (const name of current) classes.add(String(name));
            }
            for (const match of style.matchAll(/var\(--astro-code-([A-Za-z0-9-]+)\)/g)) {
              const token = match[1];
              if (token) classes.add(`tok-${token}`);
            }
            if (classes.size > 0) node.properties.class = [...classes].join(" ");
            delete node.properties.style;
          },
        },
      ],
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
