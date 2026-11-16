import { clientId, codeChallenge, cookie, randomToken, REDIRECT_URI, SCOPES } from "../../spotify/oauth.mjs";

interface Env {
  SPOTIFY_CLIENT_ID?: string;
}

export async function onRequest(context: { env: Env }): Promise<Response> {
  const state = randomToken();
  const verifier = randomToken();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId(context.env),
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge_method: "S256",
    code_challenge: await codeChallenge(verifier),
  });
  const headers = new Headers({
    Location: `https://accounts.spotify.com/authorize?${params}`,
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", cookie("spotify_state", state, 600));
  headers.append("Set-Cookie", cookie("spotify_verifier", verifier, 600));
  return new Response(null, { status: 302, headers });
}
