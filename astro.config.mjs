// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://aaadarsh1337.github.io",
  trailingSlash: "ignore",
  build: { format: "directory", inlineStylesheets: "never" },
  devToolbar: { enabled: false },
  // Never inline scripts: the CSP only allows same-origin files + the hashed theme snippet.
  vite: { build: { assetsInlineLimit: 0 } },
  // Markdown from the content repos is rendered by src/lib/markdown.ts, not by
  // Astro's own pipeline, so no markdown config is needed here.
});
