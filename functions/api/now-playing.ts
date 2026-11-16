import { nextRefreshToken, shapePlayback } from "../spotify/shape.mjs";
import { clientId } from "../spotify/oauth.mjs";

interface Env {
  SPOTIFY_CLIENT_ID?: string;
  NOW_PLAYING_ENABLED?: string;
  SPOTIFY_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}

const CACHE_SECONDS = 60;

export async function onRequest(context: {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
}): Promise<Response> {
  try {
    if (context.env.NOW_PLAYING_ENABLED === "false") return json({ state: "off" });
    const hit = await readCache(context.request);
    if (hit) return hit;
    const payload = await load(context.env);
    const response = json(payload);
    context.waitUntil(writeCache(context.request, response));
    return response;
  } catch {
    return json({ state: "off" });
  }
}

async function load(env: Env): Promise<ReturnType<typeof shapePlayback>> {
  const kv = env.SPOTIFY_KV;
  const stored = kv ? await kv.get("refresh_token") : null;
  if (!kv || !stored) return { state: "off" };
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored,
      client_id: clientId(env),
    }),
  });
  if (!tokenResponse.ok) return { state: "off" };
  const token = (await tokenResponse.json()) as { access_token?: string; refresh_token?: string };
  if (typeof token.access_token !== "string" || token.access_token.length === 0) return { state: "off" };
  await kv.put("refresh_token", nextRefreshToken(stored, token));
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const currentResponse = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers });
  const current = currentResponse.status === 204 || !currentResponse.ok ? null : await currentResponse.json();
  const playingTrack =
    current &&
    current.is_playing === true &&
    (current.currently_playing_type == null || current.currently_playing_type === "track");
  let recent = null;
  if (!playingTrack) {
    const recentResponse = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
      headers,
    });
    recent = recentResponse.ok ? await recentResponse.json() : null;
  }
  return shapePlayback({ current, recent, now: Date.now() });
}

function json(payload: { state: string }): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    },
  });
}

async function readCache(request: Request): Promise<Response | null> {
  const cache = defaultCache();
  if (!cache) return null;
  const hit = await cache.match(cacheKey(request));
  return hit ?? null;
}

async function writeCache(request: Request, response: Response): Promise<void> {
  const cache = defaultCache();
  if (!cache) return;
  await cache.put(cacheKey(request), response.clone());
}

function cacheKey(request: Request): Request {
  const url = new URL(request.url);
  return new Request(`${url.origin}/api/now-playing`, { method: "GET" });
}

function defaultCache(): Cache | null {
  const store = (globalThis as { caches?: { default?: Cache } }).caches;
  return store && store.default ? store.default : null;
}
