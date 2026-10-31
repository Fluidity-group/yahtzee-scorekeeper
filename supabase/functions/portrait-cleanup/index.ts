// src/profile/portrait-contract.js
var PORTRAIT_STYLES = Object.freeze([
  { id: "box-art", name: "Painted box art", description: "Warm paint and vintage printed texture.", prompt: "Hand-painted 1988 budget PC casino box illustration: opaque gouache/acrylic brushwork, rough printed edges, flat graphic shapes, offbeat character acting, dusty coral/teal/ochre/navy, visible paper grain. Fully painted, never photographic." },
  { id: "noir-comic", name: "Noir comic / halftone", description: "Bold ink, graphic shadows and newsprint.", prompt: "1980s noir comic portrait, heavy black ink contours, angular shadow blocks, visible halftone dots, cheap newsprint grain, limited black/cream/coral spot color, expressive illustration. No smooth airbrush." },
  { id: "neon-airbrush", name: "Neon airbrush", description: "Smooth retro paint with neon highlights.", prompt: "1987 hand-airbrushed arcade cabinet portrait, controlled painted gradients, restrained magenta/cyan rim light, deep indigo, peach midtones, hard stencil accents and analog grain. Illustrated retro art, no glossy 3D rendering or bloom haze." },
  { id: "retro-pixel", name: "Retro pixel portrait", description: "Crisp 16-bit character art and a limited palette.", prompt: "1992 16-bit character-selection portrait, hand-placed 128x128 pixel-art appearance cleanly nearest-neighbor upscaled, 24-color palette, clustered shading, stepped contours and ordered dithering. Crisp square pixels, no antialiasing or smooth gradients." }
]);
var PORTRAIT_MAX_BYTES = 5 * 1024 * 1024;
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var PortraitError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};

// src/game/categories.js
var UPPER = [
  { key: "aces", name: "Aces", face: 1, hint: "Add up your 1s", type: "count" },
  { key: "twos", name: "Twos", face: 2, hint: "Add up your 2s", type: "count" },
  { key: "threes", name: "Threes", face: 3, hint: "Add up your 3s", type: "count" },
  { key: "fours", name: "Fours", face: 4, hint: "Add up your 4s", type: "count" },
  { key: "fives", name: "Fives", face: 5, hint: "Add up your 5s", type: "count" },
  { key: "sixes", name: "Sixes", face: 6, hint: "Add up your 6s", type: "count" }
];
var LOWER = [
  { key: "threeKind", name: "Three of a Kind", hint: "Sum all 5 \xB7 ~21% a roll", type: "sum", max: 30 },
  { key: "fourKind", name: "Four of a Kind", hint: "Sum all 5 \xB7 ~2% a roll", type: "sum", max: 30 },
  { key: "fullHouse", name: "Full House", hint: "25 pts \xB7 ~4% a roll", type: "fixed", value: 25 },
  { key: "smallStraight", name: "Small Straight", hint: "30 pts \xB7 ~15% a roll", type: "fixed", value: 30 },
  { key: "largeStraight", name: "Large Straight", hint: "40 pts \xB7 ~3% a roll", type: "fixed", value: 40 },
  { key: "yahtzee", name: "Yahtzee", hint: "50 pts \xB7 ~0.08% a roll \u{1F92F}", type: "fixed", value: 50 },
  { key: "chance", name: "Chance", hint: "Sum all 5 \xB7 freebie", type: "sum", max: 30 },
  { key: "yahtzeeBonus", name: "Yahtzee Bonus", hint: "+100 \xB7 then take a whole extra turn", type: "bonus" }
];
var ALL = [...UPPER, ...LOWER];
var META = Object.fromEntries(ALL.map((c) => [c.key, c]));
var UPPER_KEYS = UPPER.map((c) => c.key);
var LOWER_KEYS = LOWER.map((c) => c.key);
var BASE_KEYS = [...UPPER_KEYS, "threeKind", "fourKind", "fullHouse", "smallStraight", "largeStraight", "yahtzee", "chance"];

// src/game/core.js
var MODES = Object.freeze({
  standard: Object.freeze({ name: "Standard", version: 1, rolls: 3, finalRolls: 3, extraTurn: false, weighted: false, joker: true }),
  competition: Object.freeze({ name: "Competition", version: 1, rolls: 3, finalRolls: 4, extraTurn: true, weighted: false, joker: true }),
  accumulative: Object.freeze({ name: "Accumulative", version: 1, rolls: 3, finalRolls: 3, extraTurn: true, weighted: true, joker: true })
});

// src/game/score-presentation.js
var VENUE_IDS = Object.freeze(["miami", "sydney", "las-vegas", "tokyo"]);

// src/multiplayer/room.js
var RoomError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};

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
  async function studioResource(path, options = {}) {
    let response;
    try {
      response = await fetchImplementation(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } });
    } catch {
      throw new RoomError("Studio could not connect. Retry with the same request.", 503);
    }
    if (response.status === 404) throw new RoomError("Studio needs the draft-storage server update.", 503);
    if (!response.ok) {
      let code;
      try {
        code = (await response.json())?.code;
      } catch {
      }
      if (["40001", "23505"].includes(code)) throw new RoomError("This draft changed on another computer. Reload it before saving.", 409);
      if (code === "42501") throw new RoomError("Open your own draft in a table you belong to.", 403);
      if (code === "22023") throw new RoomError("Invalid draft or draft limit reached (32).", 400);
      throw new RoomError("Studio could not save this request. Refresh and try again.", 503);
    }
    try {
      return await response.json();
    } catch {
      throw new RoomError("Unreadable Studio response. Refresh before editing.", 503);
    }
  }
  const draftFields = "id,room_id,owner_id,revision,base_config_version,content,updated_at";
  const draftScope = (roomId, ownerId) => {
    if (!uuid.test(roomId) || !uuid.test(ownerId)) throw new Error("Invalid draft scope");
    return `room_id=eq.${roomId}&owner_id=eq.${ownerId}&deleted=eq.false`;
  };
  const store2 = {
    async reactionDrafts(roomId, ownerId) {
      const rows = await studioResource(`clubhouse_reaction_drafts?${draftScope(roomId, ownerId)}&select=${draftFields}&order=updated_at.desc&limit=32`);
      if (!Array.isArray(rows)) throw new Error("Invalid drafts");
      return rows;
    },
    async reactionDraft(roomId, ownerId, id) {
      if (!uuid.test(id)) throw new Error("Invalid draft identity");
      const rows = await studioResource(`clubhouse_reaction_drafts?${draftScope(roomId, ownerId)}&id=eq.${id}&select=${draftFields}`);
      if (!Array.isArray(rows)) throw new Error("Invalid draft");
      return rows[0];
    },
    async saveReactionDraft({ roomId, ownerId, id, expectedRevision, baseVersion, content, requestId }) {
      return studioResource("rpc/clubhouse_save_reaction_draft", { method: "POST", body: JSON.stringify({ p_room_id: roomId, p_owner_id: ownerId, p_id: id, p_expected_revision: expectedRevision, p_base_version: baseVersion, p_content: content, p_request_id: requestId }) });
    },
    async discardReactionDraft(roomId, ownerId, id, expectedRevision) {
      const result = await studioResource("rpc/clubhouse_discard_reaction_draft", { method: "POST", body: JSON.stringify({ p_room_id: roomId, p_owner_id: ownerId, p_id: id, p_expected_revision: expectedRevision }) });
      if (result !== true) throw new RoomError("Draft discard could not be confirmed. Refresh Studio.", 503);
      return true;
    },
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
    async commit(room, revision, { actor, commandId = null, fingerprint = null, outboxRows = null, draft = null } = {}) {
      if (outboxRows !== null && !uuid.test(commentaryScopeId || "")) throw new Error("Atomic commentary scope unavailable");
      if (draft) {
        if (outboxRows !== null) throw new Error("Invalid publication commit");
        const result2 = await studioResource("rpc/clubhouse_commit_reaction_draft", { method: "POST", body: JSON.stringify({ p_room_id: room.id, p_expected_revision: revision, p_state: room, p_actor_id: actor, p_command_id: commandId, p_fingerprint: fingerprint, p_draft_id: draft.id, p_draft_revision: draft.revision }) });
        if (typeof result2 !== "boolean") throw new Error("Invalid publication result");
        return result2;
      }
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
  return { store: store2, authenticate };
}

// src/profile/avatar-reactions.js
var AVATAR_REACTIONS = Object.freeze(["yahtzee", "full-house", "upper-bonus", "large-straight", "game-win", "tournament-win", "scratch", "low-kind", "upper-impossible"]);

// server/portraits/animations.js
function createAvatarAnimationAdapter({ url, key, fetchImplementation = fetch }) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  async function rpc(name, body) {
    const r = await fetchImplementation(url + "/rest/v1/rpc/" + name, { method: "POST", headers, body: JSON.stringify(body) });
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
      const r = await fetchImplementation(url + "/storage/v1/object/sign/clubhouse-avatar-animations/" + path(data.path), { method: "POST", headers, body: JSON.stringify({ expiresIn: 900 }) });
      if (!r.ok) throw new PortraitError("Avatar animation could not connect.", 503);
      const signed = await r.json();
      if (typeof signed.signedURL !== "string" || !signed.signedURL.startsWith("/object/sign/clubhouse-avatar-animations/")) throw new PortraitError("Invalid avatar animation location.", 503);
      return { kind, avatarId, url: url + "/storage/v1" + signed.signedURL };
    },
    async cleanup() {
      const paths = await rpc("clubhouse_avatar_animation_cleanup", {});
      if (!paths.length) return;
      const r = await fetchImplementation(url + "/storage/v1/object/clubhouse-avatar-animations", { method: "DELETE", headers, body: JSON.stringify({ prefixes: paths.map(path) }) });
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
  const images2 = {
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
  return { store: { call, maintenanceActors }, images: images2, clips: createAvatarAnimationAdapter({ url, key, fetchImplementation }), authenticate: createSupabaseRoomAdapter({ url, key, fetchImplementation }).authenticate };
}

// server/portraits/cleanup.js
function portraitCleanupHandler({ token, store: store2, images: images2, clips: clips2, now = () => Date.now() }) {
  return async (request) => {
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    if (request.method !== "POST") return reply({ error: "Use POST." }, 405);
    if (!token || request.headers.get("x-portrait-cleanup-token") !== token) return reply({ error: "Unauthorized" }, 401);
    const deadline = now() + 1e5;
    let objects = 0, actors = 0;
    try {
      await clips2?.cleanup();
      for (const actor of await store2.maintenanceActors()) {
        if (now() >= deadline) return reply({ actors, objects, morePending: true });
        for (const task of await store2.call("cleanup", actor, {})) {
          if (now() >= deadline) return reply({ actors, objects, morePending: true });
          await images2.remove(task.paths);
          await store2.call("cleanup-complete", actor, { id: task.id, paths: task.paths });
          objects += task.paths.length;
        }
        actors++;
      }
      return reply({ actors, objects, morePending: false });
    } catch {
      return reply({ error: "Cleanup remains queued for retry." }, 503);
    }
  };
}

// server/portraits/cleanup-edge.js
var { store, images, clips } = createPortraitAdapter({ url: Deno.env.get("SUPABASE_URL"), key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") });
Deno.serve(portraitCleanupHandler({ store, images, clips, token: Deno.env.get("PORTRAIT_CLEANUP_TOKEN") }));
