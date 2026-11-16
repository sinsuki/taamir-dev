# taamir.dev

Personal site for Taamir Khan. Astro builds a static site into `dist/` for Cloudflare Pages.

## Build

Node.js 22 or newer.

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

Create a KV namespace and bind it as `SPOTIFY_KV`. The refresh token is stored under the key `refresh_token`. There is no client secret. Set `SPOTIFY_CLIENT_ID` to `90467d70b7ac4d80bf3ed272b25861a4` (already in `wrangler.toml`). Set `NOW_PLAYING_ENABLED` to `false` to force `{"state":"off"}`.

Open `https://taamir.dev/api/spotify/login` once. Spotify returns to `https://taamir.dev/api/spotify/callback`, which stores the refresh token and shows Connected. The page does not include the token.

When `/api/now-playing` returns `{"state":"off"}`, the strip hides.

## Play

`shelfItems` in `src/content/site.ts` is the shelf. An empty list leaves the section off the page.
