/** Public now-playing payload. Device, context, and timestamps never leave this module. */

const WEEK_MINUTES = 7 * 24 * 60;
const PUBLIC_KEYS = ["state", "title", "artist", "album", "url", "art", "playedAgoMinutes"];

export function shapePlayback({ current, recent, now }) {
  const playing = shapeCurrent(current);
  if (playing) return playing;
  return shapeRecent(recent, now);
}

export function nextRefreshToken(previous, payload) {
  const next = payload && typeof payload.refresh_token === "string" ? payload.refresh_token : "";
  return next.length > 0 ? next : previous;
}

function shapeCurrent(body) {
  if (!body || typeof body !== "object" || body.is_playing !== true) return null;
  if (body.currently_playing_type && body.currently_playing_type !== "track") return null;
  return trackFields("playing", body.item, null);
}

function shapeRecent(body, now) {
  const entry = body && Array.isArray(body.items) ? body.items[0] : null;
  if (!entry || !entry.track) return off();
  const playedAt = Date.parse(entry.played_at);
  if (!Number.isFinite(playedAt) || !Number.isFinite(now)) return off();
  const minutes = Math.max(0, Math.round((now - playedAt) / 60000));
  if (minutes > WEEK_MINUTES) return off();
  return trackFields("recent", entry.track, minutes);
}

function trackFields(state, track, playedAgoMinutes) {
  if (!track || typeof track.name !== "string" || track.name.length === 0) return off();
  const artists = Array.isArray(track.artists) ? track.artists : [];
  const artist = artists
    .map((person) => (person && typeof person.name === "string" ? person.name : ""))
    .filter(Boolean)
    .join(", ");
  const album = track.album && typeof track.album.name === "string" ? track.album.name : "";
  const url =
    track.external_urls && typeof track.external_urls.spotify === "string"
      ? track.external_urls.spotify
      : "";
  const images = track.album && Array.isArray(track.album.images) ? track.album.images : [];
  const shaped = {
    state,
    title: track.name,
    artist,
    album,
    url,
    art: pickArt(images),
    playedAgoMinutes,
  };
  for (const key of Object.keys(shaped)) {
    if (!PUBLIC_KEYS.includes(key)) delete shaped[key];
  }
  return shaped;
}

function pickArt(images) {
  const urls = images.filter((image) => image && typeof image.url === "string");
  if (urls.length === 0) return "";
  const ranked = [...urls].sort((a, b) => (a.width || 0) - (b.width || 0));
  const fit = ranked.find((image) => (image.width || 0) >= 64);
  return (fit || ranked[0]).url;
}

function off() {
  return { state: "off" };
}
