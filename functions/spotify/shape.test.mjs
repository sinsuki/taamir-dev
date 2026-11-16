import assert from "node:assert/strict";
import test from "node:test";
import { nextRefreshToken, shapePlayback } from "./shape.mjs";

const now = Date.parse("2026-11-16T12:00:00Z");

const track = {
  name: "Rain",
  artists: [{ name: "Ada" }, { name: "Bea" }],
  album: {
    name: "Field",
    images: [
      { url: "https://i.scdn.co/image/large", width: 640 },
      { url: "https://i.scdn.co/image/small", width: 64 },
    ],
  },
  external_urls: { spotify: "https://open.spotify.com/track/abc" },
  duration_ms: 180000,
  preview_url: "https://example.invalid/preview",
};

test("a playing track keeps only the public fields", () => {
  const shaped = shapePlayback({
    current: {
      is_playing: true,
      currently_playing_type: "track",
      progress_ms: 12000,
      timestamp: 1_700_000_000_000,
      device: { name: "Kitchen speaker", type: "Speaker" },
      context: { type: "playlist", href: "https://api.spotify.com/v1/playlists/secret" },
      item: track,
    },
    recent: null,
    now,
  });
  assert.deepEqual(shaped, {
    state: "playing",
    title: "Rain",
    artist: "Ada, Bea",
    album: "Field",
    url: "https://open.spotify.com/track/abc",
    art: "https://i.scdn.co/image/small",
    playedAgoMinutes: null,
  });
  const encoded = JSON.stringify(shaped);
  assert.equal(encoded.includes("Kitchen"), false);
  assert.equal(encoded.includes("playlist"), false);
  assert.equal(encoded.includes("progress_ms"), false);
  assert.equal(encoded.includes("timestamp"), false);
  assert.equal(encoded.includes("duration_ms"), false);
});

test("nothing playing falls back to the latest track inside a week", () => {
  const shaped = shapePlayback({
    current: { is_playing: false, item: track, device: { name: "Phone" } },
    recent: {
      items: [
        {
          played_at: "2026-11-16T10:00:00Z",
          context: { type: "album" },
          track,
        },
      ],
    },
    now,
  });
  assert.equal(shaped.state, "recent");
  assert.equal(shaped.playedAgoMinutes, 120);
  assert.equal(JSON.stringify(shaped).includes("played_at"), false);
  assert.equal(JSON.stringify(shaped).includes("album"), true);
});

test("a recent track older than seven days is off", () => {
  const shaped = shapePlayback({
    current: null,
    recent: {
      items: [{ played_at: "2026-11-01T12:00:00Z", track }],
    },
    now,
  });
  assert.deepEqual(shaped, { state: "off" });
});

test("a podcast and an empty payload are off", () => {
  assert.deepEqual(
    shapePlayback({
      current: { is_playing: true, currently_playing_type: "episode", item: { name: "Show" } },
      recent: { items: [] },
      now,
    }),
    { state: "off" },
  );
  assert.deepEqual(shapePlayback({}), { state: "off" });
});

test("a rotated refresh token replaces the stored one", () => {
  assert.equal(nextRefreshToken("old", { refresh_token: "new" }), "new");
  assert.equal(nextRefreshToken("old", { access_token: "only" }), "old");
  assert.equal(nextRefreshToken("old", null), "old");
});
