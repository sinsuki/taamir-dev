# taamir.dev

Personal site for Taamir Khan. Astro builds a static site into `dist/` for Cloudflare Pages.

## Build

Node.js 22. `.node-version` pins that for Cloudflare Pages.

```sh
npm install
npm run build
```

The build also checks the rendered pages and the Spotify JSON shape. Preview the result with `npm run preview`.

## Fonts

Fraunces, Schibsted Grotesk, and Martian Mono are SIL OFL and self-hosted in `src/fonts/`. The home page preloads Fraunces only. Licenses are the `*-OFL.txt` files next to the fonts.

## How to write a post

Add one file, `src/content/posts/YYYY-MM-DD-slug.md` or `.mdx`.

```yaml
---
title:
date: 2026-11-16
summary:
tags: [tech]
draft: false
---
```

`summary` is at most 160 characters. `tags` is any of `tech`, `life`, `notes`, `work`. `draft: true` shows up in `astro dev` and is omitted from the production build. The index, RSS feed, and sitemap update on the next build.

MDX can import `Callout`, `Sidenote`, `Figure`, and `Embed` from `src/components/mdx/`.

## Spotify

The on-air strip calls `GET /api/now-playing`. `src/pages/api/now-playing.ts` is the static fallback and answers `{"state":"off"}`. On Cloudflare Pages, `functions/api/now-playing.ts` handles that URL instead.

`wrangler.toml` is the Pages config. `SPOTIFY_CLIENT_ID` is `90467d70b7ac4d80bf3ed272b25861a4`. The KV binding `SPOTIFY_KV` is only under `env.production` (`f18709df6f6340c3a018710d035c021f`), so a preview deployment has no KV namespace. There is no client secret. Set `NOW_PLAYING_ENABLED` to `false` to force `{"state":"off"}`.

The refresh token is stored under the key `refresh_token`. Open `https://taamir.dev/api/spotify/login` once. Spotify returns to `https://taamir.dev/api/spotify/callback`, which stores the token and shows Connected. The page does not include the token. If `refresh_token` is already in KV, the callback shows Already connected and does not replace it. To reconnect, delete that key by hand, then run login again. A missing or mismatched `state` returns 400.

When `/api/now-playing` returns `{"state":"off"}`, the strip hides.

## Play

`shelfItems` in `src/content/site.ts` is the shelf. An empty list leaves the section off the page.
