import { clientId, cookie, readCookie, REDIRECT_URI, sameToken } from "./oauth.mjs";

export async function handleCallback(context, exchange = exchangeCode) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const savedState = readCookie(context.request.headers.get("cookie"), "spotify_state");
  const verifier = readCookie(context.request.headers.get("cookie"), "spotify_verifier");
  if (!sameToken(savedState, state) || code.length === 0 || verifier.length === 0) {
    return page("Not connected", 400);
  }
  const kv = context.env.SPOTIFY_KV;
  if (!kv) return page("Not connected", 200);
  const existing = await kv.get("refresh_token");
  if (existing) return page("Already connected", 200);
  const refresh = await exchange({ code, verifier, clientId: clientId(context.env) });
  if (!refresh) return page("Not connected", 200);
  await kv.put("refresh_token", refresh);
  return page("Connected", 200);
}

export async function exchangeCode({ code, verifier, clientId: id }) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: id,
      code_verifier: verifier,
    }),
  });
  const payload = await response.json();
  return response.ok && typeof payload.refresh_token === "string" ? payload.refresh_token : "";
}

export function onRequest(context) {
  return handleCallback(context);
}

function page(message, status) {
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
    { status, headers },
  );
}
