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

// src/game/scoring.js
function upperSubtotal(values) {
  return UPPER_KEYS.reduce((s, k) => s + (values[k] ?? 0), 0);
}
var UPPER_BONUS_THRESHOLD = 63;
var UPPER_BONUS_POINTS = 35;
function upperBonus(subtotal) {
  return subtotal >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0;
}
function lowerTotal(values) {
  return LOWER_KEYS.reduce((s, k) => s + (values[k] ?? 0), 0);
}
function computeTotals(values) {
  const upper = upperSubtotal(values);
  const bonus = upperBonus(upper);
  const upperTotal = upper + bonus;
  const lower = lowerTotal(values);
  return { upper, bonus, upperTotal, lower, grand: upperTotal + lower };
}
function filledBaseCount(values) {
  return BASE_KEYS.filter((k) => values[k] !== void 0).length;
}

// src/commentary/opening-facts.js
var uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
var freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
function openingFacts({ room, purpose, sourceCommandId, acceptedAt, priorGame = null } = {}) {
  if (!["opening", "return", "next-game"].includes(purpose) || !room?.game || !uuid.test(room.id || "") || typeof sourceCommandId !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(sourceCommandId) || !Number.isFinite(Date.parse(acceptedAt))) throw Error("Accepted room lifecycle identity required.");
  const game = room.game, ids = room.members.map((member) => member.userId);
  if (ids.length !== game.players.length || new Set(ids).size !== ids.length || ids.some((id) => !uuid.test(id || ""))) throw Error("Unique account-owned roster required.");
  const hidden = game.hideTotals && game.status !== "finished";
  const seats = ids.map((accountId, seat) => ({ accountId, seat, displayName: game.players[seat].name, label: game.players[seat].name, instructionAuthority: "none", remaining: 13 - filledBaseCount(game.sheets[seat]), ...!hidden ? { total: computeTotals(game.sheets[seat]).grand } : {} }));
  const scoresRecorded = game.sheets.reduce((sum, sheet) => sum + filledBaseCount(sheet), 0);
  let priorGameSummary = null;
  if (priorGame?.authorized === true && priorGame.game?.status === "finished" && Array.isArray(priorGame.accountIds) && priorGame.accountIds.length === ids.length && ids.every((id) => priorGame.accountIds.includes(id)) && priorGame.game.players.length === ids.length) {
    const totals = priorGame.game.sheets.map((sheet) => computeTotals(sheet).grand), best2 = Math.max(...totals);
    const winners = totals.flatMap((total, seat) => total === best2 ? [{ accountId: priorGame.accountIds[seat], displayName: priorGame.game.players[seat].name, total }] : []);
    priorGameSummary = { gameId: priorGame.game.id, winners, tied: winners.length > 1, basis: "authorized-finished-history", meaning: "previous-game-result-not-tournament-standing" };
  }
  const best = hidden ? null : Math.max(...seats.map((seat) => seat.total));
  return freeze({ schemaVersion: 1, purpose, observation: "accepted-lifecycle-only", snapshotBasis: "at-acceptance", gameId: game.id, eventId: `lifecycle-${sourceCommandId}`, commandId: sourceCommandId, momentKey: `${room.id}:${game.id}:${purpose}:${sourceCommandId}`, acceptedAt, tournamentName: room.tournament?.name || null, namesInstructionAuthority: "none", scoresRecorded, seats, leaders: hidden ? [] : seats.filter((seat) => seat.total === best).map((seat) => seat.accountId), disclosurePolicy: hidden ? "category-scores-only" : "scores-and-totals", priorGameSummary, complete: game.status === "finished" });
}

// src/game/core.js
var MODES = Object.freeze({
  standard: Object.freeze({ name: "Standard", version: 1, rolls: 3, finalRolls: 3, extraTurn: false, weighted: false, joker: true }),
  competition: Object.freeze({ name: "Competition", version: 1, rolls: 3, finalRolls: 4, extraTurn: true, weighted: false, joker: true }),
  accumulative: Object.freeze({ name: "Accumulative", version: 1, rolls: 3, finalRolls: 3, extraTurn: true, weighted: true, joker: true })
});
var fail = (message) => {
  throw new Error(message);
};
var isFace = (n) => Number.isInteger(n) && n >= 1 && n <= 6;
var SOURCES = ["manual", "manual-faces", "simulated", "godice", "camera"];
var FACE_SOURCES = ["manual-faces", "simulated", "godice", "camera"];
function gameRules(mode, rulesVersion = 1, source = "manual") {
  if (typeof mode !== "string" || !Object.hasOwn(MODES, mode)) fail("Unknown game mode.");
  if (rulesVersion === 1) return { ...MODES[mode] };
  if (rulesVersion === 2 && mode === "competition" && source === "manual") return { ...MODES.competition, version: 2, joker: false, finalChain: true, bonusRolls: 3 };
  fail("This rules version requires Competition with manual scoring.");
}
var finalChainRules = (g) => g.mode === "competition" && g.rules.version === 2 && g.rules.finalChain === true;
function validateDice(dice) {
  if (!Array.isArray(dice) || dice.length !== 5 || !dice.every(isFace)) fail("Enter five dice, each from 1 to 6.");
  return dice;
}
function combinations(dice) {
  validateDice(dice);
  const counts = Array.from({ length: 6 }, (_, i) => dice.filter((n) => n === i + 1).length);
  const present = new Set(dice);
  const straight = (n) => Array.from({ length: 7 - n }, (_, i) => i + 1).some((start) => Array.from({ length: n }, (_, i) => start + i).every((v) => present.has(v)));
  return { threeKind: counts.some((n) => n >= 3), fourKind: counts.some((n) => n >= 4), fullHouse: counts.includes(3) && counts.includes(2), smallStraight: straight(4), largeStraight: straight(5), yahtzee: counts.includes(5) };
}
var yahtzeePoints = (rules, face) => rules.weighted ? 110 - 10 * face : 50;
var bonusPoints = (rules, face) => rules.weighted ? yahtzeePoints(rules, face) : 100;
var filled = (sheet) => BASE_KEYS.filter((k) => sheet[k] !== void 0).length;
function rollLimit(game, seat = game.activeSeat) {
  return game.finalChain?.seat === seat ? game.rules.bonusRolls : filled(game.sheets[seat]) === 12 ? game.rules.finalRolls : game.rules.rolls;
}
function createCoreGame({ names, mode = "standard", rulesVersion = 1, source = "manual", hideTotals = false, id, time = (/* @__PURE__ */ new Date()).toISOString() }) {
  if (!Array.isArray(names) || names.length < 1 || names.length > 8) fail("Choose one to eight players.");
  const clean = names.map((n) => String(n).trim());
  if (clean.some((n) => !n || n.length > 24)) fail("Player names must contain 1\u201324 characters.");
  if (new Set(clean.map((n) => n.toLowerCase())).size !== clean.length) fail("Use a different name for each player.");
  if (typeof mode !== "string" || !Object.hasOwn(MODES, mode)) fail("Unknown game mode.");
  if (!SOURCES.includes(source)) fail("Unknown dice source.");
  if (!id) fail("A game ID is required.");
  return {
    id,
    schema: 1,
    revision: 0,
    mode,
    rules: gameRules(mode, rulesVersion, source),
    source,
    hideTotals: Boolean(hideTotals),
    players: clean.map((name, seat) => ({ id: `${id}:p${seat}`, name, seat })),
    sheets: clean.map(() => ({})),
    activeSeat: 0,
    status: "active",
    startedAt: time,
    endedAt: null,
    turn: null,
    turns: [],
    events: []
  };
}
function scoreOptions(game, dice) {
  validateDice(dice);
  const sheet = game.sheets[game.activeSeat], c = combinations(dice), sum = dice.reduce((a, b) => a + b, 0);
  const available = BASE_KEYS.filter((k) => sheet[k] === void 0);
  const matchingUpper = UPPER_KEYS[dice[0] - 1];
  const repeat = c.yahtzee && sheet.yahtzee !== void 0;
  let allowed = available;
  if (repeat && game.rules.joker) {
    if (sheet[matchingUpper] === void 0) allowed = [matchingUpper];
    else {
      const lower = available.filter((k) => !UPPER_KEYS.includes(k));
      allowed = lower.length ? lower : available;
    }
  }
  const joker = repeat && game.rules.joker && sheet[matchingUpper] !== void 0;
  const result = {};
  for (const key of allowed) {
    const cat = META[key];
    result[key] = cat.face ? dice.filter((v) => v === cat.face).length * cat.face : key === "chance" ? sum : key === "threeKind" ? c.threeKind ? sum : 0 : key === "fourKind" ? c.fourKind ? sum : 0 : key === "yahtzee" ? c.yahtzee ? yahtzeePoints(game.rules, dice[0]) : 0 : c[key] || joker ? cat.value : 0;
  }
  return {
    scores: result,
    bonus: repeat && sheet.yahtzee > 0 ? bonusPoints(game.rules, dice[0]) : 0,
    extraTurn: repeat && sheet.yahtzee > 0 && game.rules.extraTurn && !(finalChainRules(game) && filled(sheet) === 12),
    joker: repeat && game.rules.joker,
    combinations: c
  };
}
function validateValue(game, category, value) {
  if (!BASE_KEYS.includes(category) || !Number.isInteger(value) || value < 0) fail("Invalid score.");
  const c = META[category];
  if (c.face && (value > c.face * 5 || value % c.face)) fail("Choose a count from zero to five.");
  if (c.type === "sum" && value > 30) fail("The dice total cannot exceed 30.");
  if (c.type === "fixed" && category !== "yahtzee" && ![0, c.value].includes(value)) fail("Use the category score or zero.");
  if (category === "yahtzee" && !(game.rules.weighted ? [0, 50, 60, 70, 80, 90, 100] : [0, 50]).includes(value)) fail("Invalid Yahtzee value.");
}
function results(game) {
  const totals = game.sheets.map((s) => computeTotals(s).grand), best = Math.max(...totals);
  return { totals, winners: totals.map((v, i) => v === best ? i : -1).filter((i) => i >= 0), solo: totals.length === 1 };
}
function finishTurn(g, extra, time) {
  g.turn.endedAt = time;
  g.turns.push(g.turn);
  g.turn = null;
  if (!g.finalChain && g.sheets.every((s) => filled(s) === 13)) {
    g.status = "finished";
    g.endedAt = time;
    return;
  }
  if (!extra) {
    for (let i = 1; i <= g.players.length; i++) {
      const next = (g.activeSeat + i) % g.players.length;
      if (filled(g.sheets[next]) < 13) {
        g.activeSeat = next;
        break;
      }
    }
  }
}
function undoableScore(game, seat) {
  const turn = game.turns.findLast((t) => !t.undone && !t.excluded);
  if (!turn) return null;
  const result = game.events.findLast((e) => e.turnId === turn.id && ["score", "bonus", "final-chain-roll"].includes(e.type));
  if (!result || seat !== void 0 && result.seat !== seat) return null;
  const later = game.events.slice(game.events.indexOf(result) + 1);
  if (later.some((e) => ["score", "bonus", "score-undo"].includes(e.type))) return null;
  if (result.type === "score" && game.sheets[result.seat][result.category] === void 0) return null;
  return result;
}
function command(game, action, { id, time = (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  if (!id) fail("Command ID required.");
  if (game.events.some((e) => e.commandId === id)) return game;
  const g = structuredClone(game);
  const event = (type, data = {}) => {
    const e = { id: `${id}:${g.events.length}`, commandId: id, type, time, seat: g.activeSeat, turnId: g.turn?.id ?? null, ...data };
    g.events.push(e);
    return e;
  };
  if (action.type === "undo-score") {
    const original = undoableScore(g, action.seat);
    if (!original || original.id !== action.target || action.seat !== original.seat) fail("Only your latest completed turn can be undone before the next completed turn.");
    const category = original.type === "score" ? original.category : null;
    const before = category ? g.sheets[original.seat][category] : original.value || 0;
    const reversedBonus = category ? original.bonus || 0 : original.value || 0;
    if (category) delete g.sheets[original.seat][category];
    if (reversedBonus) {
      const remaining = (g.sheets[original.seat].yahtzeeBonus || 0) - reversedBonus;
      if (remaining < 0) fail("The attached Yahtzee bonus cannot be reversed.");
      if (remaining) g.sheets[original.seat].yahtzeeBonus = remaining;
      else delete g.sheets[original.seat].yahtzeeBonus;
    }
    for (const turn of g.turns) if (turn.id === original.turnId) Object.assign(turn, { undone: true, excluded: true, undoTarget: original.id });
    if (g.turn) g.turns.push({ ...g.turn, endedAt: time, undone: true, excluded: true, undoTarget: original.id });
    g.turn = null;
    g.activeSeat = original.seat;
    g.status = "active";
    g.endedAt = null;
    g.finalChain = original.type === "final-chain-roll" ? { seat: original.seat, attempt: original.attempt } : null;
    event("score-undo", { target: original.id, seat: original.seat, category, before, reversedBonus, undoneTurnId: original.turnId });
  } else if (action.type === "correct-score") {
    const original = g.events.find((e) => e.id === action.target && e.type === "score");
    if (!original || original.seat !== action.seat) fail("Choose one of this player\u2019s recorded scores.");
    if (g.events.some((e) => e.type === "score-undo" && e.target === original.id)) fail("That score was undone. Choose the replacement score.");
    validateValue(g, original.category, action.value);
    event("score-correction", { target: original.id, seat: original.seat, category: original.category, before: g.sheets[original.seat][original.category], value: action.value });
    g.sheets[original.seat][original.category] = action.value;
  } else {
    if (g.status !== "active") fail("This game is complete.");
    if (action.seat !== g.activeSeat) fail("It is another player\u2019s turn.");
    if (action.type === "start") {
      if (g.turn) fail("The turn is already started.");
      const source = action.source ?? g.source;
      if (!SOURCES.includes(source)) fail("Unknown dice source.");
      if (finalChainRules(g) && source !== "manual") fail("These Competition rules use manual scoring.");
      g.turn = {
        id: `${id}:turn`,
        seat: g.activeSeat,
        startedAt: time,
        limit: rollLimit(g),
        source,
        rolls: [],
        manualFallback: false,
        ...g.finalChain ? { phase: "final-bonus", attempt: g.finalChain.attempt, manualRolls: [] } : {}
      };
      event("turn-start");
    } else {
      if (!g.turn) fail("Start your turn first.");
      const rolls = g.turn.rolls.filter((r) => !r.excluded), last = rolls.at(-1);
      if (g.finalChain && action.type !== "final-chain-roll") fail("Report a roll in your final bonus attempt.");
      if (action.type === "final-chain-roll") {
        if (!finalChainRules(g) || !g.finalChain || g.turn.phase !== "final-bonus" || g.turn.source !== "manual") fail("No final bonus attempt is active.");
        if (action.face !== null && !isFace(action.face)) fail("Report a Yahtzee face from one to six, or no Yahtzee.");
        if (g.turn.manualRolls.length >= g.turn.limit) fail("Final bonus roll limit reached.");
        const finishAttempt = action.finishAttempt === true;
        if (finishAttempt && action.face !== null) fail("A failed attempt cannot also report a Yahtzee.");
        const rollNumber = finishAttempt ? null : g.turn.manualRolls.length + 1, attempt = g.finalChain.attempt;
        const value = action.face === null ? 0 : bonusPoints(g.rules, action.face);
        const e = event("final-chain-roll", { face: action.face, attempt, rollNumber, value, source: "manual", ...finishAttempt ? { scope: "attempt", outcome: "no-yahtzee" } : {} });
        if (finishAttempt) g.turn.manualAttemptOutcome = "no-yahtzee";
        else g.turn.manualRolls.push({ id: e.id, face: action.face });
        if (value) {
          g.sheets[g.activeSeat].yahtzeeBonus = (g.sheets[g.activeSeat].yahtzeeBonus || 0) + value;
          g.finalChain.attempt++;
          finishTurn(g, true, time);
        } else if (finishAttempt || rollNumber === g.turn.limit) {
          event("final-chain-end", { attempt });
          g.finalChain = null;
          finishTurn(g, false, time);
        }
      } else if (action.type === "roll") {
        if (!FACE_SOURCES.includes(g.turn.source)) fail("This turn uses manual scoring.");
        if (rolls.length >= g.turn.limit) fail("Roll limit reached. Choose a category.");
        validateDice(action.dice);
        const held = action.held ?? Array(5).fill(false);
        if (held.length !== 5 || !held.every((v) => typeof v === "boolean")) fail("Invalid held dice.");
        if (!last && held.some(Boolean)) fail("Roll all five dice first.");
        if (held.every(Boolean)) fail("Release at least one die to record a reroll.");
        if (last && held.some((v, i) => v && action.dice[i] !== last.dice[i])) fail("Held dice cannot change during a reroll.");
        let hardware = {};
        if (g.turn.source === "camera") {
          validateCameraCapture(game, action.capture, action.dice, held);
          const original = action.capture.observation;
          if (g.events.some((e2) => e2.type === "roll" && e2.observedSource === "camera" && ["cameraId", "sessionId", "frameId"].every((k) => e2.capture?.observation[k] === original[k]))) fail("This camera frame was already recorded. Capture a fresh roll.");
          if (last && held.some(Boolean) && ["cameraId", "sessionId", "calibrationId"].some((k) => last.capture?.observation[k] !== original[k])) fail("Camera session or calibration changed. Release all holds and capture again.");
          hardware = { observedSource: "camera", capture: structuredClone(action.capture) };
        }
        if (g.turn.source === "godice") {
          if (!Array.isArray(action.deviceIds) || action.deviceIds.length !== 5 || new Set(action.deviceIds).size !== 5 || action.deviceIds.some((id2) => typeof id2 !== "string" || !id2)) fail("Five identified dice are required.");
          if (action.capture?.gameId !== g.id || action.capture?.turnId !== g.turn.id || action.capture?.playerId !== g.players[g.activeSeat].id || action.capture?.revision !== game.revision) fail("Capture belongs to another turn or revision.");
          if (!Array.isArray(action.capture.events) || action.capture.events.length > 500 || !Array.isArray(action.capture.evidence) || action.capture.evidence.length > 500) fail("Invalid capture evidence.");
          if (last && held.some(Boolean) && JSON.stringify(last.deviceIds) !== JSON.stringify(action.deviceIds)) fail("Held dice cannot be transferred to another device.");
          hardware = { deviceIds: [...action.deviceIds], capture: structuredClone(action.capture) };
        }
        const e = event("roll", { dice: [...action.dice], held: [...held], source: g.turn.source, combinations: combinations(action.dice), ...hardware });
        g.turn.rolls.push({ id: e.id, dice: [...action.dice], held: [...held], source: g.turn.source, excluded: false, ...hardware.deviceIds ? { deviceIds: hardware.deviceIds } : {}, ...g.turn.source === "camera" ? hardware : {} });
      } else if (action.type === "correct-roll") {
        if (!last) fail("No roll to correct.");
        validateDice(action.dice);
        event("roll-correction", { target: last.id, before: [...last.dice], dice: [...action.dice], source: "manual-correction", observedSource: last.observedSource ?? last.source });
        last.observedSource ??= last.source;
        last.dice = [...action.dice];
        last.source = "manual-correction";
      } else if (action.type === "discard-roll") {
        if (!last) fail("No roll to exclude.");
        event("roll-excluded", { target: last.id });
        last.excluded = true;
      } else if (action.type === "manual-fallback") {
        event("manual-fallback");
        g.turn.source = "manual";
        g.turn.manualFallback = true;
      } else if (action.type === "score" || action.type === "bonus") {
        let dice = FACE_SOURCES.includes(g.turn.source) ? last?.dice : null;
        if (FACE_SOURCES.includes(g.turn.source) && !dice) fail("Record a roll first.");
        if (g.turn.source === "manual" && action.yahtzeeFace) {
          if (!isFace(action.yahtzeeFace)) fail("Choose a valid Yahtzee face.");
          dice = Array(5).fill(action.yahtzeeFace);
        }
        const options = dice ? scoreOptions(g, dice) : null;
        if (action.type === "bonus") {
          if (!options?.extraTurn) fail("A scored first Yahtzee and five matching dice are required.");
          g.sheets[g.activeSeat].yahtzeeBonus = (g.sheets[g.activeSeat].yahtzeeBonus || 0) + options.bonus;
          event("bonus", { value: options.bonus, face: dice[0], source: g.turn.source, rollId: last?.id ?? null });
          finishTurn(g, true, time);
        } else {
          if (g.sheets[g.activeSeat][action.category] !== void 0) fail("That category is already filled.");
          validateValue(g, action.category, action.value);
          if (options?.extraTurn) fail("Record the bonus Yahtzee, then take your extra turn.");
          if (options && !(action.category in options.scores)) fail("Joker placement requires another category.");
          if (options && action.value !== options.scores[action.category] && !(action.value === 0 && !options.joker)) fail("Score does not match the dice.");
          if (g.rules.weighted && action.category === "yahtzee" && action.value > 0 && !dice) fail("Select the Yahtzee face.");
          const bonus = options?.bonus || 0;
          g.sheets[g.activeSeat][action.category] = action.value;
          if (bonus) g.sheets[g.activeSeat].yahtzeeBonus = (g.sheets[g.activeSeat].yahtzeeBonus || 0) + bonus;
          event("score", { category: action.category, value: action.value, bonus, face: dice?.[0] ?? null, source: g.turn.source, rollId: last?.id ?? null });
          const finalYahtzee = finalChainRules(g) && filled(g.sheets[g.activeSeat]) === 13 && (options?.bonus > 0 || action.category === "yahtzee" && action.value > 0);
          if (finalYahtzee) {
            g.finalChain = { seat: g.activeSeat, attempt: 1 };
            event("final-chain-start", { attempt: 1 });
          }
          finishTurn(g, finalYahtzee, time);
        }
      } else fail("Unknown action.");
    }
  }
  g.revision++;
  return g;
}
function validateCameraCapture(game, capture, dice, held) {
  if (capture?.gameId !== game.id || capture?.revision !== game.revision || capture?.turnId !== game.turn?.id || capture?.playerId !== game.players[game.activeSeat].id) fail("Capture belongs to another turn or revision.");
  if (capture.version !== 1 || capture.confirmed !== true || capture.identityScope !== "logical-slots") fail("Confirm a versioned camera observation first.");
  const o = capture.observation;
  const observationKeys = ["version", "cameraId", "sessionId", "sequence", "frameId", "width", "height", "orientation", "calibrationId", "mediaOrigin", "receivedAtMonotonicMs", "decodedAtMonotonicMs", "observedAtMonotonicMs", "ageUpperBoundMs", "bridgeReceivedAtMonotonicMs", "timestampMeaning", "readerVersion", "prediction", "predictedValues"];
  if (o && Object.keys(o).some((k) => !observationKeys.includes(k))) fail("Unexpected camera metadata.");
  if (!o || o.version !== 1 || !["cameraId", "sessionId", "frameId", "calibrationId", "readerVersion"].every((k) => typeof o[k] === "string" && /^[\w.-]{1,128}$/.test(o[k]))) fail("Invalid camera observation identity.");
  if (!Number.isInteger(o.sequence) || o.sequence < 1 || !Number.isInteger(o.width) || !Number.isInteger(o.height) || o.width < 1 || o.height < 1 || o.width > 8192 || o.height > 8192 || ![0, 90, 180, 270].includes(o.orientation)) fail("Invalid camera frame metadata.");
  if (!["camera", "local-rtsp", "fixture", "webcam", "replay", "synthetic"].includes(o.mediaOrigin)) fail("Invalid camera media origin.");
  const rendered = o.timestampMeaning === "local-render-not-sensor-capture";
  if (rendered) {
    if (!Number.isFinite(o.observedAtMonotonicMs) || o.observedAtMonotonicMs < 0 || !Number.isFinite(o.ageUpperBoundMs) || o.ageUpperBoundMs < 0) fail("Invalid camera render timing.");
    if (o.bridgeReceivedAtMonotonicMs !== void 0 && (!Number.isFinite(o.bridgeReceivedAtMonotonicMs) || o.bridgeReceivedAtMonotonicMs < o.observedAtMonotonicMs)) fail("Invalid camera bridge timing.");
  } else if (o.mediaOrigin === "camera" || !Number.isFinite(o.receivedAtMonotonicMs) || !Number.isFinite(o.decodedAtMonotonicMs) || o.receivedAtMonotonicMs < 0 || o.decodedAtMonotonicMs < o.receivedAtMonotonicMs) fail("Invalid camera frame timing.");
  if (!Array.isArray(o.predictedValues) || o.predictedValues.length !== 5 || !o.predictedValues.every((v) => v === null || isFace(v))) fail("Invalid original camera values.");
  if (o.prediction && (!Array.isArray(o.prediction.dice) || o.prediction.dice.length > 5 || JSON.stringify(Array.from({ length: 5 }, (_, i) => o.prediction.dice[i]?.value ?? null)) !== JSON.stringify(o.predictedValues))) fail("Original camera prediction does not match its values.");
  if (JSON.stringify(o).length > 65536) fail("Camera evidence is too large.");
  if (!Array.isArray(capture.confirmedValues) || JSON.stringify(capture.confirmedValues) !== JSON.stringify(dice) || JSON.stringify(capture.heldMask) !== JSON.stringify(held)) fail("Review does not match the submitted roll.");
  if (!Array.isArray(capture.corrections) || capture.corrections.length > 5) fail("Invalid camera corrections.");
  const changed = o.predictedValues.flatMap((v, i) => v === dice[i] ? [] : [{ slot: i, before: v, after: dice[i] }]);
  if (JSON.stringify(capture.corrections) !== JSON.stringify(changed)) fail("Camera corrections must preserve the original values.");
  if (!Number.isFinite(capture.reviewedAtMonotonicMs) || capture.reviewedAtMonotonicMs < (rendered ? o.observedAtMonotonicMs : o.decodedAtMonotonicMs)) fail("Invalid camera review timing.");
}

// src/multiplayer/tournament.js
function tournamentConfig(value, mode, source, rulesVersion = 1) {
  if (value === void 0 || value === null) return null;
  if (source !== "manual") throw new RoomError("Tournaments currently use manual scoring.");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RoomError("Invalid tournament settings.");
  const name = String(value.name ?? "").trim();
  if (!name || name.length > 60) throw new RoomError("Enter a tournament name of 1\u201360 characters.");
  if (!Number.isInteger(value.gameCount) || value.gameCount < 2 || value.gameCount > 20) throw new RoomError("Choose 2\u201320 tournament games.");
  if (!Number.isInteger(value.playerCount) || value.playerCount < 2 || value.playerCount > 8) throw new RoomError("Choose 2\u20138 tournament players.");
  return { name, gameCount: value.gameCount, playerCount: value.playerCount, status: "playing", rules: gameRules(mode, rulesVersion, source) };
}
function requireTournamentPlaying(room) {
  if (room.tournament?.status === "paused") throw new RoomError("The tournament is paused. Ask the host to resume.", 409);
}
function updateTournamentCompletion(room) {
  if (!room.tournament) return room;
  const complete = room.game?.status === "finished" && (room.gameSequence ?? 1) === room.tournament.gameCount;
  return { ...room, tournament: { ...room.tournament, status: complete ? "completed" : "playing" } };
}
function setTournamentPaused(room, { userId, gameId, expectedRevision, paused, time }) {
  requireMember(room, userId);
  if (room.hostId !== userId) throw new RoomError("Only the host can pause or resume the tournament.", 403);
  if (!room.tournament || !room.game) throw new RoomError("Start the tournament before pausing it.");
  if (room.tournament.status === "completed") throw new RoomError("This tournament is complete.");
  if (room.revision !== expectedRevision || room.game.id !== gameId) throw new RoomError("The tournament changed. Refresh before continuing.", 409);
  if (typeof paused !== "boolean") throw new RoomError("Invalid pause request.");
  const status = paused ? "paused" : "playing";
  if (room.tournament.status === status) return { ...room, revision: room.revision + 1 };
  return { ...room, revision: room.revision + 1, tournament: { ...room.tournament, status, pausedAt: paused ? time : null } };
}
function tournamentStandings(room, snapshots) {
  if (!room.tournament) throw new RoomError("This table is not a tournament.");
  const games = /* @__PURE__ */ new Map();
  for (const game of snapshots) if (game?.status === "finished" && !(game.id === room.game?.id && room.game.status !== "finished")) games.set(game.id, game);
  if (room.game?.status === "finished") games.set(room.game.id, room.game);
  if (games.size > room.tournament.gameCount) throw new RoomError("Tournament history exceeds its game count.", 500);
  const standings = room.members.map((m) => ({ userId: m.userId, name: m.name, points: 0, wins: 0, games: 0 }));
  for (const game of games.values()) {
    if (game.players.length !== standings.length || new Set(game.players.map((p) => p.id)).size !== standings.length) throw new RoomError("Tournament history has a different roster.", 500);
    if (game.mode !== room.mode || Object.keys(room.tournament.rules).some((key) => game.rules?.[key] !== room.tournament.rules[key]) || Object.keys(game.rules ?? {}).length !== Object.keys(room.tournament.rules).length) throw new RoomError("Tournament history has different rules.", 500);
    const result = results(game);
    for (const entry of standings) {
      const seat = game.players.findIndex((p) => p.id === entry.userId);
      if (seat < 0) throw new RoomError("Tournament history has a different roster.", 500);
      entry.points += result.totals[seat];
      entry.games++;
      if (result.winners.includes(seat)) entry.wins++;
    }
  }
  const leaders = (key) => games.size ? standings.filter((p) => p[key] === Math.max(...standings.map((s) => s[key]))).map((p) => p.userId) : [];
  return { standings, completedGames: games.size, final: room.tournament.status === "completed", pointsLeaders: leaders("points"), winsLeaders: leaders("wins") };
}

// src/multiplayer/room.js
var RoomError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
var fail2 = (message, status) => {
  throw new RoomError(message, status);
};
function playerName(value) {
  const name = String(value || "").trim();
  if (!name || name.length > 24) fail2("Enter a name of 1\u201324 characters.");
  return name;
}
function memberSeat(room, userId) {
  return room.members.findIndex((m) => m.userId === userId);
}
function requireMember(room, userId) {
  const seat = memberSeat(room, userId);
  if (seat < 0) fail2("You are not a member of this game.", 403);
  return seat;
}
function createRoom({ id, code, userId, name, mode = "standard", source = "manual", hideTotals = false, tournament, rulesVersion = 1, time }) {
  if (typeof mode !== "string" || !Object.hasOwn(MODES, mode)) fail2("Unknown game mode.");
  if (!["manual", "godice"].includes(source)) fail2("Choose manual or host GoDice.");
  try {
    gameRules(mode, rulesVersion, source);
  } catch (error) {
    fail2(error.message);
  }
  return {
    id,
    code,
    hostId: userId,
    revision: 0,
    status: "lobby",
    mode,
    source,
    hideTotals: hideTotals === true,
    createdAt: time,
    joinExpiresAt: new Date(Date.parse(time) + 48 * 60 * 60 * 1e3).toISOString(),
    members: [{ userId, name: playerName(name) }],
    game: null,
    rulesVersion,
    ...tournament !== void 0 && tournament !== null ? { tournament: tournamentConfig(tournament, mode, source, rulesVersion) } : {}
  };
}
function joinRoom(room, { userId, name, time }) {
  if (memberSeat(room, userId) >= 0) return room;
  if (room.status !== "lobby") fail2("This game has started. Only its existing players can rejoin.");
  if (time >= room.joinExpiresAt) fail2("This invitation has expired. Ask the host to create a new game.");
  if (room.members.length >= 8) fail2("This game already has eight players.");
  if (room.tournament && room.members.length >= room.tournament.playerCount) fail2("This tournament already has its chosen number of players.");
  name = playerName(name);
  if (room.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) fail2("That name is taken in this game. Choose another.");
  return { ...room, revision: room.revision + 1, members: [...room.members, { userId, name }] };
}
function startRoom(room, { userId, time }) {
  requireMember(room, userId);
  if (room.hostId !== userId) fail2("Only the host can start the game.", 403);
  if (room.status !== "lobby") return room;
  if (room.tournament && room.members.length !== room.tournament.playerCount) fail2("Wait for the chosen number of tournament players before starting.");
  let game = createCoreGame({ id: room.id, names: room.members.map((m) => m.name), mode: room.mode, hideTotals: room.hideTotals, source: room.source || "manual", rulesVersion: room.rulesVersion ?? 1, time });
  game.players = game.players.map((p, i) => ({ ...p, id: room.members[i].userId }));
  if (room.tournament) game.rules = structuredClone(room.tournament.rules);
  if (game.source === "godice") game = command(game, { type: "start", seat: 0 }, { id: `room:${room.id}:first-turn`, time });
  return { ...room, revision: room.revision + 1, status: "active", game };
}
function playRoom(room, { userId, action, commandId: commandId2, expectedRevision, gameId, time }) {
  const member = requireMember(room, userId), host = room.hostId === userId;
  requireTournamentPlaying(room);
  if (!room.game) fail2("The host has not started this game.");
  if (action?.type === "undo-score" && gameId !== room.game.id) fail2("Refresh the current game before undoing a score.", 409);
  if (gameId !== void 0 && gameId !== room.game.id || (room.gameSequence ?? 1) > 1 && gameId === void 0) fail2("The table moved to a new game. Refresh or update the app before scoring.", 409);
  if (typeof commandId2 !== "string" || !/^[\w-]{8,100}$/.test(commandId2)) fail2("Invalid command ID.");
  const prior = room.game.events.find((e) => e.commandId === commandId2);
  const receipt = room.receipts?.find((r) => r.id === commandId2);
  if (receipt) {
    if (receipt.actor !== userId) fail2("This command belongs to another player.", 403);
    return room;
  }
  if (prior) {
    if ((prior.actorId || room.members[prior.seat]?.userId) !== userId) fail2("This command belongs to another player.", 403);
    return room;
  }
  if (room.revision !== expectedRevision) fail2("The game changed. Refresh and choose your score again.", 409);
  if (!action || !["start", "score", "bonus", "final-chain-roll", "correct-score", "undo-score", "roll", "correct-roll", "manual-fallback", "dice-state"].includes(action.type)) fail2("Unsupported game action.");
  const hardware = room.game.source === "godice";
  const receipts = [...room.receipts || [], { id: commandId2, actor: userId }].slice(-100);
  if (action.type === "dice-state") {
    if (!host || !hardware) fail2("Only the GoDice host can publish dice readings.", 403);
    if (room.game.status !== "active" || action.turnId !== room.game.turn?.id || action.gameRevision !== room.game.revision) fail2("The turn changed.", 409);
    if (!["rolling", "paused", "ready", "settled"].includes(action.phase) || !Array.isArray(action.faces) || action.faces.length !== 5 || action.faces.some((v) => v !== null && (!Number.isInteger(v) || v < 1 || v > 6)) || !Array.isArray(action.moving) || action.moving.length !== 5 || action.moving.some((v) => typeof v !== "boolean")) fail2("Invalid live dice state.");
    if (!Number.isInteger(action.connected) || action.connected < 0 || action.connected > 5) fail2("Invalid dice count.");
    return { ...room, revision: room.revision + 1, receipts, liveDice: { turnId: action.turnId, phase: action.phase, faces: [...action.faces], moving: [...action.moving], connected: action.connected, updatedAt: time } };
  }
  if (["roll"].includes(action.type) && (!host || !hardware)) fail2("Only the GoDice host can record physical rolls.", 403);
  if (["correct-roll", "manual-fallback"].includes(action.type) && !hardware) fail2("This room uses manual dice.");
  if (action.type === "start" && action.source !== void 0 && action.source !== (hardware ? "godice" : "manual")) fail2("The room dice mode is fixed.");
  const delegated = hardware && host && ["start", "roll", "correct-roll", "manual-fallback"].includes(action.type);
  const seat = delegated ? room.game.activeSeat : member;
  if (!["correct-score", "undo-score"].includes(action.type) && room.game.activeSeat !== seat) fail2("It is another player\u2019s turn.", 403);
  if (["score", "bonus", "correct-roll"].includes(action.type) && hardware && room.game.turn?.source === "godice" && ["rolling", "paused"].includes(room.liveDice?.phase)) fail2("Wait for the host dice to settle.");
  if (["correct-score", "undo-score"].includes(action.type) && !room.game.events.some((e) => e.id === action.target && (e.type === "score" || action.type === "undo-score" && ["bonus", "final-chain-roll"].includes(e.type)) && e.seat === seat)) fail2("You can only change your own scores.", 403);
  let game = room.game;
  try {
    if (!game.turn && ["score", "bonus", "final-chain-roll"].includes(action.type)) game = command(game, { type: "start", seat }, { id: `room:${commandId2}:start`, time });
    game = command(game, { ...action, seat }, { id: commandId2, time });
  } catch (error) {
    throw new RoomError(error.message);
  }
  for (const e of game.events) if (e.commandId === commandId2) e.actorId = userId;
  if (hardware && game.status === "active" && !game.turn) game = command(game, { type: "start", seat: game.activeSeat, source: "godice" }, { id: `room:${commandId2}:next`, time });
  const last = game.turn?.rolls.filter((r) => !r.excluded).at(-1);
  const liveDice = hardware ? { turnId: game.turn?.id, phase: last ? "settled" : "ready", faces: last?.dice || Array(5).fill(null), moving: Array(5).fill(false), connected: room.liveDice?.connected ?? 0, updatedAt: time } : void 0;
  return updateTournamentCompletion({ ...room, revision: room.revision + 1, status: game.status, game, receipts, ...["correct-score", "undo-score"].includes(action.type) && room.game.status === "finished" ? { rematch: null } : {}, ...hardware ? { liveDice } : {} });
}

// src/commentary/facts.js
var freeze2 = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze2);
    Object.freeze(value);
  }
  return value;
};
function acceptedFacts(game, eventId, accountIds, { identityKind = "account", ownerAccountId = null } = {}) {
  const event = game.events.find((e) => e.id === eventId);
  if (!event || !["score", "score-correction", "bonus", "final-chain-roll", "final-chain-end"].includes(event.type)) return null;
  const local = identityKind === "local-seat" && /^[0-9a-f-]{36}$/i.test(ownerAccountId || "") && accountIds.every((id, i) => id === game.players[i]?.id && id === game.id + ":p" + i);
  if (accountIds.length !== game.players.length || new Set(accountIds).size !== accountIds.length || !local && accountIds.some((id) => !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))) throw new Error("Unique account UUIDs required for each seat.");
  if (game.events.at(-1).commandId !== event.commandId) throw new Error("Capture facts at the accepted command snapshot.");
  const seats = game.sheets.map((sheet, seat) => ({ accountId: accountIds[seat], seat, seatLabel: `Player ${String.fromCharCode(65 + seat)}`, displayName: game.players[seat].name, label: game.players[seat].name, nameSource: "frozen-game-alias", instructionAuthority: "none", ...!game.hideTotals ? { total: computeTotals(sheet).grand, upperBonus: computeTotals(sheet).bonus } : {}, remaining: 13 - filledBaseCount(sheet) }));
  const best = game.hideTotals ? null : Math.max(...seats.map((s) => s.total));
  return freeze2({ schemaVersion: 1, ...local ? { identityKind: "local-seat", ownerAccountId } : {}, gameId: game.id, eventId, commandId: event.commandId, eventType: event.type, revision: game.revision, acceptedAt: event.time, rulesVersion: game.rules.version, mode: game.mode, source: event.source ?? game.source, seat: event.seat, accountId: accountIds[event.seat], label: seats[event.seat].label, displayName: seats[event.seat].displayName, nameSource: "frozen-game-alias", instructionAuthority: "none", category: event.category ?? null, value: event.value ?? 0, bonus: event.bonus ?? 0, correctionTarget: event.target ?? null, seats, disclosurePolicy: game.hideTotals ? "category-scores-only" : "scores-and-totals", leaders: game.hideTotals ? [] : seats.filter((s) => s.total === best).map((s) => s.accountId), tied: game.hideTotals ? null : seats.filter((s) => s.total === best).length > 1, complete: game.status === "finished", finalChain: game.finalChain ? { ...game.finalChain } : null, snapshotBasis: "at-acceptance", scoreDependencies: game.events.filter((e) => e.type === "score").map((e) => e.id), observation: "accepted-score-only" });
}

// server/commentary/accepted-outbox.js
var uuid2 = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
var commandId = /^[A-Za-z0-9_-]{8,100}$/;
var freeze3 = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze3);
    Object.freeze(value);
  }
  return value;
};
var requireValue = (value, message) => {
  if (!value) throw Error(message);
};
var scoreTypes = ["score", "bonus", "final-chain-end", "final-chain-roll"];
function acceptedOutbox({ before, after, actorId, commandId: id, operation, acceptedAt, openingFacts: openingFacts2, priorGame = null } = {}) {
  requireValue(before && after && uuid2.test(after.id) && before.id === after.id, "Matching room UUID snapshots required");
  requireValue(uuid2.test(actorId) && commandId.test(id || ""), "Accepted UUID actor and command ID required");
  requireValue(Number.isFinite(Date.parse(acceptedAt)), "Accepted server timestamp required");
  requireValue(Number.isSafeInteger(before.revision) && Number.isSafeInteger(after.revision), "Room revisions required");
  requireValue(Array.isArray(after.members) && after.members.length >= 1 && after.members.length <= 8, "Bounded roster required");
  const audience = after.members.map((m) => m.userId);
  requireValue(audience.every((v) => uuid2.test(v)) && new Set(audience).size === audience.length && audience.includes(actorId), "Unique member UUIDs and member actor required");
  requireValue(JSON.stringify(before.members.map((m) => m.userId)) === JSON.stringify(audience) && before.hostId === after.hostId, "Acceptance cannot change ownership or seats");
  if (after === before || after.revision === before.revision) return freeze3([]);
  requireValue(after.revision === before.revision + 1, "Exactly one accepted room revision required");
  if (!["command", "start", "resume", "ready"].includes(operation)) return freeze3([]);
  if (!after.game) return freeze3([]);
  requireValue(uuid2.test(after.game.id) && after.game.players.length === audience.length && after.game.players.every((p, i) => p.id === audience[i]), "Game UUID and authoritative seat UUIDs required");
  requireValue(Number.isSafeInteger(after.game.rules?.version) && after.game.rules.version > 0, "Versioned game rules required");
  const rows = [];
  const add = (kind, purpose2, facts2, invalidates = []) => rows.push({ schemaVersion: 1, idempotencyKey: JSON.stringify([after.id, after.game.id, id, kind, purpose2]), roomId: after.id, gameId: after.game.id, commandId: id, actorId, expectedRoomRevision: before.revision, acceptedRoomRevision: after.revision, acceptedAt, kind, purpose: purpose2, audience: [...audience], facts: facts2, invalidates, dispatch: "after-transaction-commit-only" });
  if (operation === "command") {
    requireValue(before.game?.id === after.game.id, "Score command cannot replace game");
    const old = before.game.events, next = after.game.events;
    requireValue(Array.isArray(old) && Array.isArray(next) && next.length >= old.length && old.every((e, i) => e.id === next[i].id && e.commandId === next[i].commandId), "Accepted event history prefix required");
    const appended = next.slice(old.length), owned = appended.filter((e) => e.commandId === id);
    requireValue(appended.every((e) => e.commandId === id || e.type === "turn-start" && ["room:" + id + ":start", "room:" + id + ":next"].includes(e.commandId)), "Only accepted command and known turn helpers allowed");
    if (!owned.length) return freeze3([]);
    requireValue(owned.every((e) => e.actorId === actorId && Number.isSafeInteger(e.seat) && audience[e.seat] === actorId), "Event actor must own score seat");
    const changes = owned.filter((e) => ["score-undo", "score-correction"].includes(e.type));
    if (changes.length) {
      const invalidates = changes.map((e) => ({ eventId: e.id, targetEventId: e.target, reason: e.type }));
      requireValue(invalidates.every((e) => old.some((o) => o.id === e.targetEventId && o.type === "score" && audience[o.seat] === actorId)), "Correction must target accepted own score");
      add("invalidate", "correction", null, invalidates);
      return freeze3(rows);
    }
    const event = scoreTypes.map((type) => owned.find((e) => e.type === type)).find(Boolean);
    if (!event) return freeze3([]);
    const lastOwned = next.findLastIndex((e) => e.commandId === id);
    const facts2 = acceptedFacts({ ...after.game, events: next.slice(0, lastOwned + 1) }, event.id, audience);
    requireValue(facts2 && facts2.commandId === id && facts2.accountId === actorId, "Accepted score grounding required");
    add("moment", "score", facts2);
    return freeze3(rows);
  }
  requireValue(actorId === after.hostId || operation === "ready", "Host lifecycle authority required");
  let purpose = null;
  if (operation === "start" && !before.game && before.status === "lobby" && after.status === "active") purpose = "opening";
  if (operation === "resume" && before.game?.id === after.game.id && before.tournament?.status === "paused" && after.tournament?.status === "playing") purpose = "return";
  if (operation === "ready" && before.game?.status === "finished" && before.game.id !== after.game.id && after.game.status === "active" && (after.gameSequence ?? 1) === (before.gameSequence ?? 1) + 1) purpose = "next-game";
  if (!purpose) return freeze3([]);
  requireValue(typeof openingFacts2 === "function", "Shared lifecycle facts builder required");
  const facts = openingFacts2({ room: after, purpose, sourceCommandId: id, acceptedAt, priorGame });
  requireValue(facts?.purpose === purpose && facts.gameId === after.game.id && facts.commandId === id && facts.observation === "accepted-lifecycle-only" && facts.snapshotBasis === "at-acceptance" && facts.acceptedAt === acceptedAt && facts.seats?.length === audience.length && facts.seats.every((seat, i) => seat.accountId === audience[i] && seat.seat === i), "Lifecycle builder binding mismatch");
  add("moment", purpose, structuredClone(facts));
  return freeze3(rows);
}

// src/multiplayer/rematch.js
function nextStarter(room) {
  const winners = results(room.game).winners;
  const prior = room.game.startingSeat ?? 0;
  return winners.find((seat) => seat > prior) ?? winners[0];
}
function setRematchReady(room, { userId, gameId, gameRevision, ready, commandId: commandId2, nextGameId, time }) {
  requireMember(room, userId);
  requireTournamentPlaying(room);
  if (room.tournament && (room.gameSequence ?? 1) >= room.tournament.gameCount) throw new RoomError("This tournament is complete. All scheduled games are saved.");
  if (room.source === "godice") throw new RoomError("Play again is currently available for manual tables only.");
  if (room.game?.status !== "finished") throw new RoomError("Finish the current game before playing again.");
  if (room.game.id !== gameId || room.game.revision !== gameRevision) throw new RoomError("The game results changed. Review them before playing again.", 409);
  if (typeof ready !== "boolean" || typeof commandId2 !== "string" || !/^[\w-]{8,100}$/.test(commandId2)) throw new RoomError("Invalid readiness request.");
  const accepted = room.rematch?.gameId === gameId && room.rematch.gameRevision === gameRevision ? room.rematch.ready : [];
  const players = new Set(accepted);
  if (ready) players.add(userId);
  else players.delete(userId);
  const readyIds = room.members.filter((m) => players.has(m.userId)).map((m) => m.userId);
  const starter = nextStarter(room);
  if (readyIds.length !== room.members.length) return { ...room, revision: room.revision + 1, rematch: { gameId, gameRevision, ready: readyIds, nextStarterId: room.members[starter].userId } };
  if (typeof nextGameId !== "string" || nextGameId === gameId) throw new RoomError("A new game identity is required.");
  let game = createCoreGame({ id: nextGameId, names: room.members.map((m) => m.name), mode: room.mode, source: "manual", hideTotals: room.hideTotals, rulesVersion: room.game.rules.version, time });
  game.rules = structuredClone(room.game.rules);
  game.players = game.players.map((p, i) => ({ ...p, id: room.members[i].userId }));
  game.activeSeat = starter;
  game.startingSeat = starter;
  return { ...room, revision: room.revision + 1, status: "active", game, gameSequence: (room.gameSequence ?? 1) + 1, rematch: null, receipts: [], liveDice: void 0 };
}

// server/rooms/handler.js
var headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store" };
var reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
function roomHandler({ store: store2, authenticate: authenticate2, now = () => (/* @__PURE__ */ new Date()).toISOString(), randomCode: randomCode2, randomId = () => crypto.randomUUID(), commentary = null }) {
  return async (request) => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({ error: "Use POST." }, 405);
    try {
      const userId = await authenticate2(request);
      if (!userId) throw new RoomError("Sign in to join a game.", 401);
      const raw = await request.text();
      if (raw.length > 256e3) throw new RoomError("Request too large.", 413);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new RoomError("Invalid request.");
      }
      if (!body || typeof body !== "object") throw new RoomError("Invalid request.");
      const supportsRematch = await store2.rematchAvailable?.() === true;
      const supportsTournaments = supportsRematch && await store2.tournamentsAvailable?.() === true;
      const supportsCompetition = supportsRematch && await store2.competitionAvailable?.() === true;
      const supportsCommentary = !!commentary && supportsRematch && await store2.commentaryAvailable?.() === true;
      const present = (room) => ({ ...room, capabilities: { commentaryAtomicCommit: supportsCommentary, rematch: supportsRematch && room.source !== "godice", history: supportsRematch, tournaments: supportsTournaments, competitionFinalChain: supportsCompetition, manualAttemptFinish: supportsCompetition, undoScore: supportsRematch }, ...room.game?.status === "finished" ? { nextStarterId: room.members[nextStarter(room)].userId } : {} });
      if (body.operation === "list") return reply({ rooms: (await store2.list(userId)).map(present) });
      if (["tournaments", "sessions"].includes(body.operation)) {
        if (body.operation === "tournaments" ? !supportsTournaments : !supportsRematch) throw new RoomError("Saved sessions need the current server.", 503);
        if (body.operation === "sessions" && !["open", "completed"].includes(body.view)) throw new RoomError("Choose open sessions or completed results.");
        const before = body.before;
        if (before !== void 0 && (!before || typeof before !== "object" || typeof before.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before.createdAt) || !Number.isFinite(Date.parse(before.createdAt)) || new Date(before.createdAt).toISOString() !== before.createdAt || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before.id || ""))) throw new RoomError("Invalid tournament list cursor.");
        const rows = await (body.operation === "sessions" ? store2.sessions(userId, body.view, before) : store2.openTournaments(userId, before)), last = rows.at(-1);
        return reply({ rooms: rows.map((r) => present(r.state)), nextBefore: rows.length === 20 ? { createdAt: new Date(last.created_at).toISOString(), id: last.id } : null });
      }
      if (body.operation === "create") {
        if (body.rulesVersion === 2 && !supportsCompetition) throw new RoomError("Updated Competition rules need a server update. Your saved games are unchanged.", 503);
        if (body.tournament && !supportsTournaments) throw new RoomError("Tournaments need a server update. Ordinary hosted games are available.", 503);
        if (!/^[0-9a-f-]{36}$/i.test(body.requestId || "")) throw new RoomError("Invalid request ID.");
        const existing = await store2.byId(body.requestId);
        if (existing) {
          if (existing.hostId !== userId) throw new RoomError("This room belongs to another host.", 403);
          return reply({ room: present(existing) });
        }
        if (await store2.recentCount(userId) >= 10) throw new RoomError("Too many new rooms. Please try again later.", 429);
        for (let tries = 0; tries < 4; tries++) {
          const room = createRoom({ id: body.requestId, code: randomCode2(), userId, name: body.name, mode: body.mode, source: body.source, hideTotals: body.hideTotals, tournament: body.tournament, rulesVersion: body.rulesVersion, time: now() });
          if (await store2.insert(room)) return reply({ room: present(room) });
          const accepted = await store2.byId(body.requestId);
          if (accepted) {
            if (accepted.hostId !== userId) throw new RoomError("This room belongs to another host.", 403);
            return reply({ room: present(accepted) });
          }
        }
        throw new RoomError("Could not create a room. Please try again.", 409);
      }
      const code = String(body.code || "").toUpperCase().replace(/[\s-]/g, "");
      if (!/^[A-Z2-9]{8}$/.test(code)) throw new RoomError("Enter the eight-character room code.");
      const nextGameId = body.operation === "ready" ? randomId() : null;
      const lifecycleDurable = ["ready", "pause", "resume"].includes(body.operation);
      const atomicOperation = !!commentary && ["command", "start", "resume", "ready"].includes(body.operation);
      if (atomicOperation && !supportsCommentary) throw new RoomError("Live commentary needs the atomic game server update.", 503);
      const durable = lifecycleDurable || atomicOperation;
      const fingerprint = body.operation === "ready" ? JSON.stringify({ operation: "ready", gameId: body.gameId, gameRevision: body.gameRevision, ready: body.ready }) : body.operation === "command" && durable ? JSON.stringify({ operation: body.operation, gameId: body.gameId, expectedRevision: body.expectedRevision, action: body.action }) : durable ? JSON.stringify({ operation: body.operation, gameId: body.gameId, expectedRevision: body.expectedRevision }) : null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const room = await store2.get(code);
        if (!room) throw new RoomError("Room not found. Check the code.", 404);
        if ((room.game?.rules.version ?? room.rulesVersion) === 2 && !["read", "history", "standings", "join"].includes(body.operation)) {
          if (!supportsCompetition) throw new RoomError("This Competition game needs the current server.", 503);
          if (body.rulesVersion !== 2) throw new RoomError("Update the app or reload the webpage for these Competition rules.", 409);
        }
        if (room.tournament && !supportsTournaments && !["read", "history"].includes(body.operation)) throw new RoomError("This tournament needs the current server before it can be updated.", 503);
        if (((room.gameSequence ?? 1) > 1 || room.historyVersion === 1) && !supportsRematch && body.operation !== "read") throw new RoomError("This table needs the current server before it can be updated.", 503);
        let next;
        if (body.operation === "join") next = joinRoom(room, { userId, name: body.name, time: now() });
        else {
          requireMember(room, userId);
          if (body.operation === "read") return reply({ room: present(room) });
          if (body.operation === "standings") {
            if (!supportsTournaments) throw new RoomError("Tournament standings need a server update.", 503);
            const snapshots = (await store2.tournamentGames(room.id)).map((row2) => row2.state);
            const current = await store2.get(code);
            if (current?.revision !== room.revision) continue;
            return reply({ ...tournamentStandings(room, snapshots), roomRevision: room.revision, gameId: room.game?.id ?? null, gameRevision: room.game?.revision ?? null });
          }
          if (body.operation === "history") {
            if (!supportsRematch) throw new RoomError("Hosted history needs a server update.", 503);
            if (body.before !== void 0 && (!Number.isInteger(body.before) || body.before < 1)) throw new RoomError("Invalid history cursor.");
            const rows = await store2.history(room.id, body.before);
            return reply({ games: rows.map((r) => ({ ...r.state, sequence: r.sequence_number })), nextBefore: rows.length === 20 ? rows.at(-1).sequence_number : null });
          }
          if (durable) {
            if (!supportsRematch) throw new RoomError("Play again needs a server update. Your finished game is saved.", 503);
            if (typeof body.commandId !== "string" || !/^[\w-]{8,100}$/.test(body.commandId)) throw new RoomError("Invalid command ID.");
            const receipt = await store2.receipt(room.id, body.commandId);
            if (receipt) {
              if (receipt.actor_id !== userId || receipt.fingerprint !== fingerprint) throw new RoomError("This command belongs to another request.", 403);
              return reply({ room: present(room) });
            }
            if (lifecycleDurable) next = body.operation === "ready" ? setRematchReady(room, { userId, gameId: body.gameId, gameRevision: body.gameRevision, ready: body.ready, commandId: body.commandId, nextGameId, time: now() }) : setTournamentPaused(room, { userId, gameId: body.gameId, expectedRevision: body.expectedRevision, paused: body.operation === "pause", time: now() });
          }
          if (!next && body.operation === "start") {
            if (room.status === "lobby" && body.expectedRevision !== room.revision) throw new RoomError("The lobby changed. Review the players and start again.", 409);
            next = startRoom(room, { userId, time: now() });
          } else if (!next && body.operation === "command") {
            if (body.action?.type === "undo-score" && !supportsRematch) throw new RoomError("Undo needs the updated history server.", 503);
            next = playRoom(room, { userId, action: body.action, commandId: body.commandId, expectedRevision: body.expectedRevision, gameId: body.gameId, time: now() });
          } else if (!next) throw new RoomError("Unknown operation.");
        }
        if (next !== room && supportsRematch && next.game) next = { ...next, historyVersion: 1 };
        let outboxRows = null;
        if (atomicOperation && next !== room) {
          const priorGame = body.operation === "ready" && room.game?.status === "finished" ? { authorized: true, game: room.game, accountIds: room.members.map((m) => m.userId) } : null;
          const eligible = body.operation !== "command" || ["score", "bonus", "undo-score", "correct-score", "final-chain-roll", "final-chain-end"].includes(body.action?.type);
          outboxRows = eligible ? acceptedOutbox({ before: room, after: next, actorId: userId, commandId: body.commandId, operation: body.operation, acceptedAt: now(), openingFacts: commentary.openingFacts, priorGame }) : [];
          const greeting = outboxRows.find((row2) => ["opening", "return", "next-game"].includes(row2.purpose));
          if (greeting) next = { ...next, commentaryLifecycle: { commandId: greeting.commandId, purpose: greeting.purpose, acceptedRoomRevision: next.revision, gameId: next.game.id } };
        }
        const saved = next === room || await (supportsRematch && next.game ? store2.commit(next, room.revision, { actor: userId, ...durable ? { commandId: body.commandId, fingerprint } : {}, ...outboxRows !== null ? { outboxRows } : {} }) : store2.update(next, room.revision));
        if (saved) return reply({ room: present(next), ...durable && next !== room ? { acceptedCommandId: body.commandId, acceptedRoomRevision: next.revision } : {} });
      }
      throw new RoomError("The game changed. Please try again.", 409);
    } catch (error) {
      if (error instanceof RoomError) return reply({ error: error.message }, error.status);
      if (error?.name === "GameRuleError") return reply({ error: error.message }, 400);
      return reply({ error: "The game could not be updated. Refresh and try again." }, 500);
    }
  };
}

// server/rooms/supabase-adapter.js
var uuid3 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  const store2 = {
    async commentaryAvailable() {
      if (!uuid3.test(commentaryScopeId || "")) return false;
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
      if (!uuid3.test(roomId)) throw new Error("Database request failed");
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
    async receipt(roomId, commandId2) {
      return (await resource(`clubhouse_room_receipts?room_id=eq.${roomId}&command_id=eq.${encodeURIComponent(commandId2)}&select=actor_id,fingerprint`))[0];
    },
    async history(roomId, before) {
      return await resource(`clubhouse_games?room_id=eq.${roomId}&ended_at=not.is.null${before ? `&sequence_number=lt.${before}` : ""}&select=state,sequence_number&order=sequence_number.desc&limit=20`);
    },
    async commit(room, revision, { actor, commandId: commandId2 = null, fingerprint = null, outboxRows = null } = {}) {
      if (outboxRows !== null && !uuid3.test(commentaryScopeId || "")) throw new Error("Atomic commentary scope unavailable");
      const result = await resource(outboxRows === null ? "rpc/clubhouse_commit_game" : "rpc/clubhouse_commit_game_commentary", { method: "POST", body: JSON.stringify({ p_room_id: room.id, p_expected_revision: revision, p_state: room, p_actor_id: actor, p_command_id: commandId2, p_fingerprint: fingerprint, ...outboxRows !== null ? { p_scope: commentaryScopeId, p_outbox: outboxRows } : {} }) });
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
      if (!uuid3.test(userId)) throw new Error("Database request failed");
      if (before && (!uuid3.test(before.id || "") || typeof before.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before.createdAt) || !Number.isFinite(Date.parse(before.createdAt)))) throw new Error("Database request failed");
      const cursor = before ? `&or=(created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id}))` : "";
      return await db(`?member_ids=cs.{${userId}}&state->tournament=not.is.null&state->tournament->>status=neq.completed${cursor}&select=state,created_at,id&order=created_at.desc,id.desc&limit=20`);
    },
    async sessions(userId, view, before) {
      if (!uuid3.test(userId) || !["open", "completed"].includes(view) || before && (!uuid3.test(before.id || "") || typeof before.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before.createdAt) || !Number.isFinite(Date.parse(before.createdAt)))) throw new Error("Database request failed");
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
  async function authenticate2(request) {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    try {
      const response = await fetchImplementation(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: authorization } });
      if (!response.ok) return null;
      const user = await response.json();
      return user?.email_confirmed_at && !user.is_anonymous && typeof user.id === "string" && uuid3.test(user.id) ? user.id : null;
    } catch {
      throw new Error("Authentication request failed");
    }
  }
  return { store: store2, authenticate: authenticate2 };
}

// server/rooms/edge.js
var { store, authenticate } = createSupabaseRoomAdapter({ url: Deno.env.get("SUPABASE_URL"), key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), commentaryScopeId: "d1ce0000-0000-4000-8000-000000000026" });
var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (v) => alphabet[v % 32]).join("");
Deno.serve(roomHandler({ store, authenticate, randomCode, commentary: { openingFacts } }));
