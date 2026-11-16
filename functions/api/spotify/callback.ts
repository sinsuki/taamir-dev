import { clientId, cookie, readCookie, REDIRECT_URI, sameToken } from "../../spotify/oauth.mjs";

interface Env {
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_KV?: {
    put(key: string, value: string): Promise<void>;
  };
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const savedState = readCookie(context.request.headers.get("cookie"), "spotify_state");
  const verifier = readCookie(context.request.headers.get("cookie"), "spotify_verifier");
  const kv = context.env.SPOTIFY_KV;
  if (!kv || !sameToken(savedState, state) || code.length === 0 || verifier.length === 0) {
    return page("Not connected");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId(context.env),
    code_verifier: verifier,
  });
  let refresh = "";
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as { refresh_token?: string };
    if (response.ok && typeof payload.refresh_token === "string") refresh = payload.refresh_token;
  } catch {
    refresh = "";
  }
  if (refresh.length === 0) return page("Not connected");
  await kv.put("refresh_token", refresh);
  return page("Connected");
}

function page(message: "Connected" | "Not connected"): Response {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'",
  });
  headers.append("Set-Cookie", cookie("spotify_state", "", 0));
  headers.append("Set-Cookie", cookie("spotify_verifier", "", 0));
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>${message}</title><p>${message}</p></html>`,
    { headers },
  );
}
