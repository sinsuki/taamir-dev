import assert from "node:assert/strict";
import test from "node:test";
import { handleCallback } from "./callback.mjs";

function request({ state = "", code = "code", cookie = "" } = {}) {
  const url = new URL("https://taamir.dev/api/spotify/callback");
  if (state) url.searchParams.set("state", state);
  if (code) url.searchParams.set("code", code);
  return new Request(url, { headers: cookie ? { cookie } : {} });
}

function kv(existing) {
  const puts = [];
  return {
    puts,
    store: {
      async get(key) {
        assert.equal(key, "refresh_token");
        return existing;
      },
      async put(key, value) {
        puts.push([key, value]);
      },
    },
  };
}

test("a missing or mismatched state is 400 and stores nothing", async () => {
  const empty = kv(null);
  const missing = await handleCallback(
    { request: request(), env: { SPOTIFY_KV: empty.store } },
    async () => "new-token",
  );
  assert.equal(missing.status, 400);
  assert.match(await missing.text(), /Not connected/);
  assert.deepEqual(empty.puts, []);

  const mismatched = kv("already");
  const bad = await handleCallback(
    {
      request: request({
        state: "from-spotify",
        cookie: "spotify_state=from-cookie; spotify_verifier=verifier",
      }),
      env: { SPOTIFY_KV: mismatched.store },
    },
    async () => "new-token",
  );
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /Not connected/);
  assert.deepEqual(mismatched.puts, []);
});

test("an existing refresh token is not overwritten", async () => {
  const memory = kv("already");
  let exchanged = false;
  const response = await handleCallback(
    {
      request: request({
        state: "same",
        cookie: "spotify_state=same; spotify_verifier=verifier",
      }),
      env: { SPOTIFY_KV: memory.store },
    },
    async () => {
      exchanged = true;
      return "new-token";
    },
  );
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Already connected/);
  assert.equal(exchanged, false);
  assert.deepEqual(memory.puts, []);
});
