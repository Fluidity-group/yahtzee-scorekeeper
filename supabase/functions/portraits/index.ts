// src/profile/portrait-contract.js
var PORTRAIT_STYLES = Object.freeze([
  { id: "box-art", name: "Painted box art", description: "Warm paint and vintage printed texture.", prompt: "Hand-painted 1988 budget PC casino box illustration: opaque gouache/acrylic brushwork, rough printed edges, flat graphic shapes, offbeat character acting, dusty coral/teal/ochre/navy, visible paper grain. Fully painted, never photographic." },
  { id: "noir-comic", name: "Noir comic / halftone", description: "Bold ink, graphic shadows and newsprint.", prompt: "1980s noir comic portrait, heavy black ink contours, angular shadow blocks, visible halftone dots, cheap newsprint grain, limited black/cream/coral spot color, expressive illustration. No smooth airbrush." },
  { id: "neon-airbrush", name: "Neon airbrush", description: "Smooth retro paint with neon highlights.", prompt: "1987 hand-airbrushed arcade cabinet portrait, controlled painted gradients, restrained magenta/cyan rim light, deep indigo, peach midtones, hard stencil accents and analog grain. Illustrated retro art, no glossy 3D rendering or bloom haze." },
  { id: "retro-pixel", name: "Retro pixel portrait", description: "Crisp 16-bit character art and a limited palette.", prompt: "1992 16-bit character-selection portrait, hand-placed 128x128 pixel-art appearance cleanly nearest-neighbor upscaled, 24-color palette, clustered shading, stepped contours and ordered dithering. Crisp square pixels, no antialiasing or smooth gradients." }
]);
var PORTRAIT_PRESETS = ["character-1", "character-2", "character-3", "character-4"];
var PORTRAIT_MAX_BYTES = 5 * 1024 * 1024;
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var PortraitError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
function portraitStyle(id) {
  const style = PORTRAIT_STYLES.find((s) => s.id === id);
  if (!style) throw new PortraitError("Choose one of the four portrait styles.");
  return style;
}
function imageType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  throw new PortraitError("Choose a valid JPEG, PNG or WebP photo.");
}
function validatePortraitImage(bytes, mime) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 12 || bytes.length > PORTRAIT_MAX_BYTES) throw new PortraitError("Choose a photo up to 5 MB.");
  if (imageType(bytes) !== mime) throw new PortraitError("The image does not match its file type.");
  return bytes;
}
function portraitPrompt(style) {
  return `Create ONE fully illustrated player avatar for YAHTZ, an original retro casino videogame. Use the supplied photograph only as an identity reference. Preserve the person's recognizable facial structure, apparent age, skin tone, hair shape, expression and distinctive features; keep glasses or other visible identity features. Do not beautify into a different person, change gender presentation, or add sunglasses hiding the face. Chest-up square portrait, whole hair silhouette inside a 10 percent safe margin, eyes clear and face strongly separated from background. STYLE: ${portraitStyle(style).prompt} BACKGROUND: simplified original Miami evening sunset, two graphic palm silhouettes, low detail. No text, logos, watermark, frames or collage. One subject; fully illustrated rather than a filtered photograph.`;
}

// server/portraits/handler.js
var headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store" };
async function boundedBody(request) {
  if (!request.body) return "";
  const reader = request.body.getReader(), decoder = new TextDecoder();
  let total = 0, text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 72e5) {
        await reader.cancel();
        throw new PortraitError("Choose a photo up to 5 MB.", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
function portraitHandler({ authenticate, store, images, generate, clips, cleanupTimeoutMs = 1e3 }) {
  const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
  const validId = (id) => {
    if (!UUID.test(id || "")) throw new PortraitError("Invalid portrait request.");
    return id;
  };
  async function cleanupOwner(actor) {
    const controller = new AbortController();
    let timer;
    const work = (async () => {
      for (const task of await store.call("cleanup", actor, {}, { signal: controller.signal })) {
        controller.signal.throwIfAborted();
        await images.remove(task.paths, { signal: controller.signal });
        controller.signal.throwIfAborted();
        await store.call("cleanup-complete", actor, { id: task.id, paths: task.paths }, { signal: controller.signal });
      }
    })();
    try {
      await Promise.race([work, new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Cleanup deferred"));
        }, cleanupTimeoutMs);
      })]);
    } finally {
      clearTimeout(timer);
    }
  }
  async function profileView(profile) {
    const view = { ownerId: profile.owner_id, avatarId: profile.job_id || null, revision: profile.revision, kind: profile.kind, preset: profile.preset, style: profile.style, hasOriginal: !!profile.original_path };
    if (profile.image_path) try {
      view.url = await images.sign(profile.image_path);
      view.imageStatus = "ready";
    } catch {
      view.imageStatus = "unavailable";
    }
    return view;
  }
  async function jobView(job) {
    return { id: job.id, status: job.status, style: job.style, error: job.status === "failed" ? "This draft expired, failed or was replaced. Reopen Your avatar or generate a new draft." : null, ...job.status === "ready" || job.status === "confirmed" ? { url: await images.sign(job.image_path) } : {} };
  }
  return async (request) => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({ error: "Use POST." }, 405);
    try {
      const actor = await authenticate(request);
      if (!actor) throw new PortraitError("Sign in to save your avatar across phones.", 401);
      const length = Number(request.headers.get("Content-Length"));
      if (length > 72e5) throw new PortraitError("Choose a photo up to 5 MB.", 413);
      const raw = await boundedBody(request);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new PortraitError("Invalid portrait request.");
      }
      if (!body || Array.isArray(body) || typeof body !== "object") throw new PortraitError("Invalid portrait request.");
      if (!["profile", "status", "peers", "animation"].includes(body.operation)) try {
        await cleanupOwner(actor);
      } catch {
      }
      if (body.operation === "profile") return reply({ profile: await profileView(await store.call("profile", actor, {})) });
      if (body.operation === "animation") {
        if (!clips) throw new PortraitError("Avatar animations are not configured yet.", 503);
        return reply({ animation: await clips.read(actor, body) });
      }
      if (body.operation === "peers") {
        if (!/^[A-Z2-9]{8}$/.test(body.code || "")) throw new PortraitError("Choose your current table.");
        const profiles = await store.call("peers", actor, { code: body.code });
        return reply({ profiles: await Promise.all(profiles.map(profileView)) });
      }
      if (body.operation === "generate") {
        const id = validId(body.id);
        portraitStyle(body.style);
        if (typeof body.photo !== "string" || body.photo.length > 7e6 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.photo)) throw new PortraitError("Choose a valid photo up to 5 MB.");
        let bytes;
        try {
          bytes = Uint8Array.from(atob(body.photo), (c) => c.charCodeAt(0));
        } catch {
          throw new PortraitError("Invalid image.");
        }
        validatePortraitImage(bytes, body.mime);
        const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((v) => v.toString(16).padStart(2, "0")).join("");
        const reservation = await store.call("reserve", actor, { id, style: body.style, fingerprint: digest });
        if (!reservation.fresh) return reply({ job: await jobView(reservation.job) });
        let job;
        try {
          await images.put(reservation.job.original_path, bytes, body.mime);
          const generated = await generate({ bytes, mime: body.mime, style: body.style });
          validatePortraitImage(generated.bytes, generated.mime);
          await images.put(reservation.job.image_path, generated.bytes, generated.mime);
          job = await store.call("complete", actor, { id, usage: generated.usage });
        } catch (error) {
          await store.call("fail", actor, { id }).catch(() => {
          });
          throw error;
        }
        return reply({ job: await jobView(job) });
      }
      if (body.operation === "status") return reply({ job: await jobView(await store.call("status", actor, { id: validId(body.id) })) });
      if (body.operation === "confirm") {
        const id = validId(body.id);
        if (typeof body.retainOriginal !== "boolean" || !Number.isInteger(body.revision) || body.revision < 0) throw new PortraitError("Review the portrait and photo-retention choice.");
        const job = await store.call("status", actor, { id });
        if (job.status === "failed") throw new PortraitError("This draft expired or was replaced. Reopen Your avatar before confirming.", 409);
        if (!["ready", "confirmed"].includes(job.status)) throw new PortraitError("Wait for a finished portrait before confirming.");
        const result = await store.call("confirm", actor, { id, revision: body.revision, retainOriginal: body.retainOriginal });
        let cleanupPending = false;
        try {
          await images.remove(result.cleanup || []);
          await store.call("cleanup-complete", actor, { id, paths: result.cleanup || [] });
          await cleanupOwner(actor);
        } catch {
          cleanupPending = true;
        }
        return reply({ profile: await profileView(result.profile), cleanupPending });
      }
      if (body.operation === "preset") {
        if (!PORTRAIT_PRESETS.includes(body.preset) || !Number.isInteger(body.revision) || body.revision < 0) throw new PortraitError("Choose one of the preset avatars.");
        const result = await store.call("preset", actor, { preset: body.preset, revision: body.revision });
        await images.remove(result.cleanup || []).catch(() => {
        });
        return reply({ profile: await profileView(result.profile) });
      }
      if (body.operation === "original") {
        const p = await store.call("profile", actor, {});
        return reply({ url: p.original_path ? await images.sign(p.original_path) : null });
      }
      if (body.operation === "delete-original") {
        const p = await store.call("profile", actor, {});
        if (p.original_path) await images.remove([p.original_path]);
        return reply({ profile: await profileView(await store.call("delete-original", actor, { revision: p.revision })) });
      }
      throw new PortraitError("Unknown portrait action.");
    } catch (error) {
      return reply({ error: error instanceof PortraitError ? error.message : "The portrait result could not be checked. Reopen Your avatar before trying again." }, error instanceof PortraitError ? error.status : 500);
    }
  };
}

// server/rooms/supabase-adapter.js
var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var row = (room) => ({ id: room.id, code: room.code, host_id: room.hostId, member_ids: room.members.map((m) => m.userId), revision: room.revision, state: room, created_at: room.createdAt });
function createSupabaseRoomAdapter({ url, key, fetchImplementation = (...args) => fetch(...args), now = () => Date.now(), commentaryScopeId = null }) {
  async function db(path, options = {}) {
    try {
      const response = await fetchImplementation(`${url}/rest/v1/clubhouse_rooms${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" } });
      if (response.status === 409 && ["POST", "PATCH"].includes(options.method)) return null;
      if (!response.ok) throw new Error();
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error();
      return rows;
    } catch {
      throw new Error("Database request failed");
    }
  }
  const store = {
    async commentaryAvailable() {
      if (!uuid.test(commentaryScopeId || "")) return false;
      try {
        const response = await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_commentary_atomic_available`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" });
        if (response.status === 404) return false;
        if (!response.ok) throw Error();
        const available = await response.json();
        if (typeof available !== "boolean") throw Error();
        return available;
      } catch {
        throw new Error("Database request failed");
      }
    },
    async competitionAvailable() {
      try {
        const response = await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_competition_v2_available`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" });
        if (response.status === 404) return false;
        if (!response.ok) throw Error();
        const available = await response.json();
        if (typeof available !== "boolean") throw Error();
        return available;
      } catch {
        throw new Error("Database request failed");
      }
    },
    async tournamentsAvailable() {
      try {
        const response = await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_tournaments_available`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" });
        if (response.status === 404) return false;
        if (!response.ok) throw Error();
        const available = await response.json();
        if (typeof available !== "boolean") throw Error();
        return available;
      } catch {
        throw new Error("Database request failed");
      }
    },
    async tournamentGames(roomId) {
      if (!uuid.test(roomId)) throw new Error("Database request failed");
      const games = await resource(`clubhouse_games?room_id=eq.${roomId}&ended_at=not.is.null&select=state,sequence_number&order=sequence_number.asc&limit=20`);
      if (!Array.isArray(games)) throw new Error("Database request failed");
      return games;
    },
    async rematchAvailable() {
      try {
        const response = await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_rematch_available`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" });
        if (response.status === 404) return false;
        if (!response.ok) throw Error();
        const available = await response.json();
        if (typeof available !== "boolean") throw Error();
        return available;
      } catch {
        throw new Error("Database request failed");
      }
    },
    async receipt(roomId, commandId) {
      return (await resource(`clubhouse_room_receipts?room_id=eq.${roomId}&command_id=eq.${encodeURIComponent(commandId)}&select=actor_id,fingerprint`))[0];
    },
    async history(roomId, before) {
      return await resource(`clubhouse_games?room_id=eq.${roomId}&ended_at=not.is.null${before ? `&sequence_number=lt.${before}` : ""}&select=state,sequence_number&order=sequence_number.desc&limit=20`);
    },
    async commit(room, revision, { actor, commandId = null, fingerprint = null, outboxRows = null } = {}) {
      if (outboxRows !== null && !uuid.test(commentaryScopeId || "")) throw new Error("Atomic commentary scope unavailable");
      const result = await resource(outboxRows === null ? "rpc/clubhouse_commit_game" : "rpc/clubhouse_commit_game_commentary", { method: "POST", body: JSON.stringify({ p_room_id: room.id, p_expected_revision: revision, p_state: room, p_actor_id: actor, p_command_id: commandId, p_fingerprint: fingerprint, ...outboxRows !== null ? { p_scope: commentaryScopeId, p_outbox: outboxRows } : {} }) });
      if (typeof result !== "boolean") throw new Error("Database request failed");
      return result;
    },
    async byId(id) {
      return (await db(`?id=eq.${encodeURIComponent(id)}&select=state`))[0]?.state;
    },
    async get(code) {
      return (await db(`?code=eq.${code}&select=state`))[0]?.state;
    },
    async list(userId) {
      return (await db(`?member_ids=cs.{${userId}}&select=state&order=created_at.desc&limit=30`)).map((r) => r.state);
    },
    async openTournaments(userId, before) {
      if (!uuid.test(userId)) throw new Error("Database request failed");
      if (before && (!uuid.test(before.id || "") || typeof before.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before.createdAt) || !Number.isFinite(Date.parse(before.createdAt)))) throw new Error("Database request failed");
      const cursor = before ? `&or=(created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id}))` : "";
      return await db(`?member_ids=cs.{${userId}}&state->tournament=not.is.null&state->tournament->>status=neq.completed${cursor}&select=state,created_at,id&order=created_at.desc,id.desc&limit=20`);
    },
    async sessions(userId, view, before) {
      if (!uuid.test(userId) || !["open", "completed"].includes(view) || before && (!uuid.test(before.id || "") || typeof before.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before.createdAt) || !Number.isFinite(Date.parse(before.createdAt)))) throw new Error("Database request failed");
      const classification = view === "open" ? "and(state->tournament.is.null,state->>status.neq.finished),state->tournament->>status.neq.completed" : "and(state->tournament.is.null,state->>status.eq.finished),state->tournament->>status.eq.completed";
      const filter = before ? `and=(or(${classification}),or(created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})))` : `or=(${classification})`;
      return await db(`?member_ids=cs.{${userId}}&${filter}&select=state,created_at,id&order=created_at.desc,id.desc&limit=20`);
    },
    async recentCount(userId) {
      return (await db(`?host_id=eq.${userId}&created_at=gte.${new Date(now() - 36e5).toISOString()}&select=id&limit=10`)).length;
    },
    async insert(room) {
      return !!await db("", { method: "POST", body: JSON.stringify(row(room)) });
    },
    async update(room, revision) {
      return (await db(`?id=eq.${room.id}&revision=eq.${revision}`, { method: "PATCH", body: JSON.stringify(row(room)) }))?.length === 1;
    }
  };
  async function resource(path, options = {}) {
    try {
      const response = await fetchImplementation(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" } });
      if (!response.ok) throw Error();
      return await response.json();
    } catch {
      throw new Error("Database request failed");
    }
  }
  async function authenticate(request) {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    try {
      const response = await fetchImplementation(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: authorization } });
      if (!response.ok) return null;
      const user = await response.json();
      return user?.email_confirmed_at && !user.is_anonymous && typeof user.id === "string" && uuid.test(user.id) ? user.id : null;
    } catch {
      throw new Error("Authentication request failed");
    }
  }
  return { store, authenticate };
}

// src/profile/avatar-reactions.js
var AVATAR_REACTIONS = Object.freeze(["yahtzee", "full-house", "upper-bonus", "large-straight", "game-win", "tournament-win", "scratch", "low-kind", "upper-impossible"]);

// server/portraits/animations.js
function createAvatarAnimationAdapter({ url, key, fetchImplementation = fetch }) {
  const headers2 = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  async function rpc(name, body) {
    const r = await fetchImplementation(url + "/rest/v1/rpc/" + name, { method: "POST", headers: headers2, body: JSON.stringify(body) });
    if (!r.ok) {
      if (r.status === 403) throw new PortraitError("This animation is not available at your table.", 403);
      throw new PortraitError("Avatar animation is temporarily unavailable.", 503);
    }
    return r.json();
  }
  const path = (p) => {
    if (typeof p !== "string" || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[a-z-]+\.mp4$/i.test(p)) throw new PortraitError("Invalid avatar animation path.");
    return p;
  };
  return {
    async read(actor, { ownerId, avatarId, kind, code }) {
      if (!UUID.test(ownerId || "") || !UUID.test(avatarId || "") || !AVATAR_REACTIONS.includes(kind) || code !== void 0 && !/^[A-Z2-9]{8}$/.test(code)) throw new PortraitError("Invalid avatar animation request.");
      const data = await rpc("clubhouse_avatar_animation", { p_actor: actor, p_owner: ownerId, p_avatar: avatarId, p_kind: kind, p_code: code || null });
      if (!data) return null;
      if (data.path !== ownerId + "/" + avatarId + "/" + kind + ".mp4") throw new PortraitError("Avatar animation identity changed.", 409);
      const r = await fetchImplementation(url + "/storage/v1/object/sign/clubhouse-avatar-animations/" + path(data.path), { method: "POST", headers: headers2, body: JSON.stringify({ expiresIn: 900 }) });
      if (!r.ok) throw new PortraitError("Avatar animation could not connect.", 503);
      const signed = await r.json();
      if (typeof signed.signedURL !== "string" || !signed.signedURL.startsWith("/object/sign/clubhouse-avatar-animations/")) throw new PortraitError("Invalid avatar animation location.", 503);
      return { kind, avatarId, url: url + "/storage/v1" + signed.signedURL };
    },
    async cleanup() {
      const paths = await rpc("clubhouse_avatar_animation_cleanup", {});
      if (!paths.length) return;
      const r = await fetchImplementation(url + "/storage/v1/object/clubhouse-avatar-animations", { method: "DELETE", headers: headers2, body: JSON.stringify({ prefixes: paths.map(path) }) });
      if (!r.ok) throw Error("Animation cleanup remains queued");
      await rpc("clubhouse_avatar_animation_cleanup", { p_deleted: paths });
    }
  };
}

// server/portraits/supabase-adapter.js
function createPortraitAdapter({ url, key, fetchImplementation = fetch, requestTimeoutMs = 15e3 }) {
  const deadline = (signal) => signal ? AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]) : AbortSignal.timeout(requestTimeoutMs);
  const authorization = { apikey: key, Authorization: `Bearer ${key}` };
  async function call(action, actor, payload, { signal } = {}) {
    const response = await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_portraits`, { method: "POST", headers: { ...authorization, "Content-Type": "application/json" }, signal: deadline(signal), body: JSON.stringify({ p_action: action, p_actor: actor, p_payload: payload }) });
    const data = await response.json();
    if (!response.ok) {
      if (data.code === "40001") throw new PortraitError("Your avatar changed on another phone. Refresh before confirming.", 409);
      if (data.code === "42501") throw new PortraitError("This portrait is not available to this account.", 403);
      if (String(data.message).includes("budget")) throw new PortraitError("The portrait test budget has been reached. Your saved avatar is unchanged.", 429);
      if (String(data.message).includes("rate limit")) throw new PortraitError("Too many portrait attempts. Try again later.", 429);
      throw new PortraitError("Portrait storage could not be checked. Reopen Your avatar before retrying.", 503);
    }
    return data;
  }
  const path = (p) => {
    if (typeof p !== "string" || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(original|portrait)$/i.test(p)) throw new PortraitError("Invalid image path.");
    return p;
  };
  async function storage(route, options) {
    let response;
    try {
      response = await fetchImplementation(url + "/storage/v1/" + route, { ...options, headers: { ...authorization, ...options.headers }, signal: deadline(options.signal) });
    } catch {
      throw new PortraitError("Portrait storage could not connect.", 503);
    }
    if (!response.ok) throw new PortraitError("Portrait storage could not finish. Try again.", 503);
    return response;
  }
  const images = {
    async put(p, bytes, mime) {
      await storage("object/clubhouse-portraits/" + path(p), { method: "POST", headers: { "Content-Type": mime, "x-upsert": "false" }, body: bytes });
    },
    async sign(p) {
      const response = await storage("object/sign/clubhouse-portraits/" + path(p), { method: "POST", signal: AbortSignal.timeout(Math.min(requestTimeoutMs, 4e3)), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 900 }) });
      const data = await response.json();
      if (typeof data.signedURL !== "string" || !data.signedURL.startsWith("/object/sign/clubhouse-portraits/")) throw new PortraitError("Invalid portrait response.", 503);
      return url + "/storage/v1" + data.signedURL;
    },
    async remove(paths, { signal } = {}) {
      if (!paths.length) return;
      await storage("object/clubhouse-portraits", { method: "DELETE", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [...new Set(paths.map(path))] }) });
    }
  };
  async function maintenanceActors() {
    const response = await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_portrait_cleanup_owners`, { method: "POST", headers: { ...authorization, "Content-Type": "application/json" }, body: "{}", signal: deadline() });
    if (!response.ok) throw new PortraitError("Cleanup list unavailable.", 503);
    return response.json();
  }
  return { store: { call, maintenanceActors }, images, clips: createAvatarAnimationAdapter({ url, key, fetchImplementation }), authenticate: createSupabaseRoomAdapter({ url, key, fetchImplementation }).authenticate };
}

// server/portraits/gemini.js
var MODEL = "gemini-nano-banana-2.1";
function createGeminiPortraitGenerator({ key, fetchImplementation = fetch, timeoutMs = 85e3 }) {
  return async ({ bytes, mime, style }) => {
    if (!key) throw new PortraitError("Portrait generation is not configured on the server.", 503);
    let encoded = "";
    for (let i = 0; i < bytes.length; i += 8192) encoded += String.fromCharCode(...bytes.subarray(i, i + 8192));
    let response;
    try {
      response = await fetchImplementation("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ model: MODEL, input: [{ type: "text", text: portraitPrompt(style) }, { type: "image", mime_type: mime, data: btoa(encoded) }], generation_config: { max_output_tokens: 8192 }, response_format: { type: "image", aspect_ratio: "1:1", image_size: "1K" }, store: false }), signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      throw new PortraitError("Generation could not finish. Check this draft before trying a new generation.", 504);
    }
    if (!response.ok) throw new PortraitError(response.status === 429 ? "Portrait service is busy. Try a new generation later." : "The portrait service could not create this image.", 502);
    let data;
    try {
      data = await response.json();
    } catch {
      throw new PortraitError("Portrait service returned an unreadable response.", 502);
    }
    const images = [];
    function scan(v) {
      if (Array.isArray(v)) v.forEach(scan);
      else if (v && typeof v === "object") {
        if (v.type === "image" && typeof v.data === "string") images.push(v);
        for (const [k, item] of Object.entries(v)) if (k !== "data") scan(item);
      }
    }
    scan(data);
    const unique = [...new Map(images.map((v) => [v.data, v])).values()];
    if (unique.length !== 1) throw new PortraitError("No usable portrait was returned. Your saved avatar is unchanged.", 502);
    const image = unique[0];
    let output;
    try {
      output = Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0));
    } catch {
      throw new PortraitError("Portrait service returned an invalid image.", 502);
    }
    return { bytes: output, mime: image.mime_type, usage: data.usage || {}, model: MODEL };
  };
}

// server/portraits/edge.js
var services = createPortraitAdapter({ url: Deno.env.get("SUPABASE_URL"), key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") });
Deno.serve(portraitHandler({ ...services, generate: createGeminiPortraitGenerator({ key: Deno.env.get("GEMINI_API_KEY") }) }));
