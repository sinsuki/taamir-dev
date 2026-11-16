export const PUBLIC_CLIENT_ID = "90467d70b7ac4d80bf3ed272b25861a4";
export const REDIRECT_URI = "https://taamir.dev/api/spotify/callback";
export const SCOPES = "user-read-currently-playing user-read-recently-played";

export function clientId(env) {
  const configured = env && env.SPOTIFY_CLIENT_ID;
  return typeof configured === "string" && configured.length > 0 ? configured : PUBLIC_CLIENT_ID;
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function codeChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function cookie(name, value, maxAge) {
  return [
    `${name}=${value}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/api/spotify",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

export function readCookie(header, name) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

export function sameToken(left, right) {
  if (left.length === 0 || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
