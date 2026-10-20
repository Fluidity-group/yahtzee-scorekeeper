import { BASE_KEYS, UPPER_KEYS, META } from './categories.js';
import { computeTotals } from './scoring.js';

export const MODES = Object.freeze({
  standard: Object.freeze({ name: 'Standard', version: 1, rolls: 3, finalRolls: 3, extraTurn: false, weighted: false, joker: true }),
  competition: Object.freeze({ name: 'Competition', version: 1, rolls: 3, finalRolls: 4, extraTurn: true, weighted: false, joker: true }),
  accumulative: Object.freeze({ name: 'Accumulative', version: 1, rolls: 3, finalRolls: 3, extraTurn: true, weighted: true, joker: true }),
});
const fail = message => { throw new Error(message); };
const isFace = n => Number.isInteger(n) && n >= 1 && n <= 6;
const SOURCES = ['manual', 'manual-faces', 'simulated', 'godice', 'camera'];
const FACE_SOURCES = ['manual-faces', 'simulated', 'godice', 'camera'];
export function gameRules(mode, rulesVersion = 1, source = 'manual') {
  if (typeof mode !== 'string' || !Object.hasOwn(MODES, mode)) fail('Unknown game mode.');
  if (rulesVersion === 1) return { ...MODES[mode] };
  if (rulesVersion === 2 && mode === 'competition' && source === 'manual') return { ...MODES.competition, version: 2, joker: false, finalChain: true, bonusRolls: 3 };
  fail('This rules version requires Competition with manual scoring.');
}
const finalChainRules = g => g.mode === 'competition' && g.rules.version === 2 && g.rules.finalChain === true;
export function validateDice(dice) {
  if (!Array.isArray(dice) || dice.length !== 5 || !dice.every(isFace)) fail('Enter five dice, each from 1 to 6.');
  return dice;
}
export function combinations(dice) {
  validateDice(dice);
  const counts = Array.from({ length: 6 }, (_, i) => dice.filter(n => n === i + 1).length);
  const present = new Set(dice);
  const straight = n => Array.from({ length: 7 - n }, (_, i) => i + 1).some(start => Array.from({ length: n }, (_, i) => start + i).every(v => present.has(v)));
  return { threeKind: counts.some(n => n >= 3), fourKind: counts.some(n => n >= 4), fullHouse: counts.includes(3) && counts.includes(2), smallStraight: straight(4), largeStraight: straight(5), yahtzee: counts.includes(5) };
}
export const yahtzeePoints = (rules, face) => rules.weighted ? 110 - 10 * face : 50;
export const bonusPoints = (rules, face) => rules.weighted ? yahtzeePoints(rules, face) : 100;
export const filled = sheet => BASE_KEYS.filter(k => sheet[k] !== undefined).length;
export function rollLimit(game, seat = game.activeSeat) { return game.finalChain?.seat === seat ? game.rules.bonusRolls : filled(game.sheets[seat]) === 12 ? game.rules.finalRolls : game.rules.rolls; }
export function createCoreGame({ names, mode = 'standard', rulesVersion = 1, source = 'manual', hideTotals = false, id, time = new Date().toISOString() }) {
  if (!Array.isArray(names) || names.length < 1 || names.length > 8) fail('Choose one to eight players.');
  const clean = names.map(n => String(n).trim());
  if (clean.some(n => !n || n.length > 24)) fail('Player names must contain 1–24 characters.');
  if (new Set(clean.map(n => n.toLowerCase())).size !== clean.length) fail('Use a different name for each player.');
  if (typeof mode !== 'string' || !Object.hasOwn(MODES,mode)) fail('Unknown game mode.');
  if (!SOURCES.includes(source)) fail('Unknown dice source.');
  if (!id) fail('A game ID is required.');
  return { id, schema: 1, revision: 0, mode, rules: gameRules(mode, rulesVersion, source), source, hideTotals: Boolean(hideTotals),
    players: clean.map((name, seat) => ({ id: `${id}:p${seat}`, name, seat })), sheets: clean.map(() => ({})),
    activeSeat: 0, status: 'active', startedAt: time, endedAt: null, turn: null, turns: [], events: [] };
}
export function scoreOptions(game, dice) {
  validateDice(dice);
  const sheet = game.sheets[game.activeSeat], c = combinations(dice), sum = dice.reduce((a,b) => a+b,0);
  const available = BASE_KEYS.filter(k => sheet[k] === undefined);
  const matchingUpper = UPPER_KEYS[dice[0] - 1];
  const repeat = c.yahtzee && sheet.yahtzee !== undefined;
  let allowed = available;
  if (repeat && game.rules.joker) {
    if (sheet[matchingUpper] === undefined) allowed = [matchingUpper];
    else { const lower = available.filter(k => !UPPER_KEYS.includes(k)); allowed = lower.length ? lower : available; }
  }
  const joker = repeat && game.rules.joker && sheet[matchingUpper] !== undefined;
  const result = {};
  for (const key of allowed) {
    const cat = META[key];
    result[key] = cat.face ? dice.filter(v => v === cat.face).length * cat.face
      : key === 'chance' ? sum
      : key === 'threeKind' ? c.threeKind ? sum : 0
      : key === 'fourKind' ? c.fourKind ? sum : 0
      : key === 'yahtzee' ? c.yahtzee ? yahtzeePoints(game.rules, dice[0]) : 0
      : c[key] || joker ? cat.value : 0;
  }
  return { scores: result, bonus: repeat && sheet.yahtzee > 0 ? bonusPoints(game.rules, dice[0]) : 0,
    extraTurn: repeat && sheet.yahtzee > 0 && game.rules.extraTurn && !(finalChainRules(game) && filled(sheet) === 12), joker: repeat && game.rules.joker, combinations: c };
}
function validateValue(game, category, value) {
  if (!BASE_KEYS.includes(category) || !Number.isInteger(value) || value < 0) fail('Invalid score.');
  const c = META[category];
  if (c.face && (value > c.face * 5 || value % c.face)) fail('Choose a count from zero to five.');
  if (c.type === 'sum' && value > 30) fail('The dice total cannot exceed 30.');
  if (c.type === 'fixed' && category !== 'yahtzee' && ![0,c.value].includes(value)) fail('Use the category score or zero.');
  if (category === 'yahtzee' && !(game.rules.weighted ? [0,50,60,70,80,90,100] : [0,50]).includes(value)) fail('Invalid Yahtzee value.');
}
export function results(game) {
  const totals = game.sheets.map(s => computeTotals(s).grand), best = Math.max(...totals);
  return { totals, winners: totals.map((v,i) => v === best ? i : -1).filter(i => i >= 0), solo: totals.length === 1 };
}
function finishTurn(g, extra, time) {
  g.turn.endedAt = time; g.turns.push(g.turn); g.turn = null;
  if (!g.finalChain && g.sheets.every(s => filled(s) === 13)) { g.status = 'finished'; g.endedAt = time; return; }
  if (!extra) {
    for (let i = 1; i <= g.players.length; i++) { const next = (g.activeSeat + i) % g.players.length; if (filled(g.sheets[next]) < 13) { g.activeSeat = next; break; } }
  }
}
// Undo the latest completed turn only; unscored following observations are audited/excluded.
export function undoableScore(game, seat) {
 const turn=game.turns.findLast(t=>!t.undone&&!t.excluded);
 if(!turn)return null;
 const result=game.events.findLast(e=>e.turnId===turn.id&&['score','bonus','final-chain-roll'].includes(e.type));
 if(!result||(seat!==undefined&&result.seat!==seat))return null;
 const later=game.events.slice(game.events.indexOf(result)+1);
 if(later.some(e=>['score','bonus','score-undo'].includes(e.type)))return null;
 if(result.type==='score'&&game.sheets[result.seat][result.category]===undefined)return null;
 return result;
}
// Immutable commands: the UI only replaces its state after persistence accepts the next snapshot.
export function command(game, action, { id, time = new Date().toISOString() } = {}) {
  if (!id) fail('Command ID required.');
  if (game.events.some(e => e.commandId === id)) return game;
  const g = structuredClone(game);
  const event = (type, data = {}) => {
    const e = { id: `${id}:${g.events.length}`, commandId: id, type, time, seat: g.activeSeat, turnId: g.turn?.id ?? null, ...data };
    g.events.push(e); return e;
  };
  if (action.type === 'undo-score') {
    const original = undoableScore(g, action.seat);
    if (!original || original.id !== action.target || action.seat !== original.seat) fail('Only your latest completed turn can be undone before the next completed turn.');
    const category=original.type==='score'?original.category:null;
    const before = category?g.sheets[original.seat][category]:(original.value||0);
    const reversedBonus = category?(original.bonus||0):(original.value||0);
    if(category)delete g.sheets[original.seat][category];
    if (reversedBonus) {
      const remaining = (g.sheets[original.seat].yahtzeeBonus || 0) - reversedBonus;
      if (remaining < 0) fail('The attached Yahtzee bonus cannot be reversed.');
      if (remaining) g.sheets[original.seat].yahtzeeBonus = remaining;
      else delete g.sheets[original.seat].yahtzeeBonus;
    }
    for (const turn of g.turns) if (turn.id === original.turnId) Object.assign(turn, { undone: true, excluded: true, undoTarget: original.id });
    if (g.turn) g.turns.push({ ...g.turn, endedAt: time, undone: true, excluded: true, undoTarget: original.id });
    g.turn = null;
    g.activeSeat = original.seat; g.status = 'active'; g.endedAt = null;
    g.finalChain = original.type==='final-chain-roll'?{seat:original.seat,attempt:original.attempt}:null;
    event('score-undo', { target: original.id, seat: original.seat, category, before, reversedBonus, undoneTurnId:original.turnId });
  } else if (action.type === 'correct-score') {
    const original = g.events.find(e => e.id === action.target && e.type === 'score');
    if (!original || original.seat !== action.seat) fail('Choose one of this player’s recorded scores.');
    if (g.events.some(e => e.type === 'score-undo' && e.target === original.id)) fail('That score was undone. Choose the replacement score.');
    validateValue(g, original.category, action.value);
    event('score-correction', { target: original.id, seat: original.seat, category: original.category, before: g.sheets[original.seat][original.category], value: action.value });
    g.sheets[original.seat][original.category] = action.value;
  } else {
    if (g.status !== 'active') fail('This game is complete.');
    if (action.seat !== g.activeSeat) fail('It is another player’s turn.');
    if (action.type === 'start') {
      if (g.turn) fail('The turn is already started.');
      const source=action.source??g.source;
      if(!SOURCES.includes(source))fail('Unknown dice source.');
      if (finalChainRules(g) && source !== 'manual') fail('These Competition rules use manual scoring.');
      g.turn = { id: `${id}:turn`, seat: g.activeSeat, startedAt: time, limit: rollLimit(g), source, rolls: [], manualFallback: false,
        ...(g.finalChain ? { phase: 'final-bonus', attempt: g.finalChain.attempt, manualRolls: [] } : {}) };
      event('turn-start');
    } else {
      if (!g.turn) fail('Start your turn first.');
      const rolls = g.turn.rolls.filter(r => !r.excluded), last = rolls.at(-1);
      if (g.finalChain && action.type !== 'final-chain-roll') fail('Report a roll in your final bonus attempt.');
      if (action.type === 'final-chain-roll') {
        if (!finalChainRules(g) || !g.finalChain || g.turn.phase !== 'final-bonus' || g.turn.source !== 'manual') fail('No final bonus attempt is active.');
        if (action.face !== null && !isFace(action.face)) fail('Report a Yahtzee face from one to six, or no Yahtzee.');
        if (g.turn.manualRolls.length >= g.turn.limit) fail('Final bonus roll limit reached.');
        const finishAttempt = action.finishAttempt === true;
        if (finishAttempt && action.face !== null) fail('A failed attempt cannot also report a Yahtzee.');
        const rollNumber = finishAttempt ? null : g.turn.manualRolls.length + 1, attempt = g.finalChain.attempt;
        const value = action.face === null ? 0 : bonusPoints(g.rules, action.face);
        const e = event('final-chain-roll', { face: action.face, attempt, rollNumber, value, source: 'manual', ...(finishAttempt ? {scope:'attempt',outcome:'no-yahtzee'} : {}) });
        if (finishAttempt) g.turn.manualAttemptOutcome = 'no-yahtzee';
        else g.turn.manualRolls.push({ id: e.id, face: action.face });
        if (value) {
          g.sheets[g.activeSeat].yahtzeeBonus = (g.sheets[g.activeSeat].yahtzeeBonus || 0) + value;
          g.finalChain.attempt++;
          finishTurn(g, true, time);
        } else if (finishAttempt || rollNumber === g.turn.limit) {
          event('final-chain-end', { attempt });
          g.finalChain = null;
          finishTurn(g, false, time);
        }
      } else if (action.type === 'roll') {
        if (!FACE_SOURCES.includes(g.turn.source)) fail('This turn uses manual scoring.');
        if (rolls.length >= g.turn.limit) fail('Roll limit reached. Choose a category.');
        validateDice(action.dice);
        const held = action.held ?? Array(5).fill(false);
        if (held.length !== 5 || !held.every(v => typeof v === 'boolean')) fail('Invalid held dice.');
        if (!last && held.some(Boolean)) fail('Roll all five dice first.');
        if (held.every(Boolean)) fail('Release at least one die to record a reroll.');
        if (last && held.some((v,i) => v && action.dice[i] !== last.dice[i])) fail('Held dice cannot change during a reroll.');
        let hardware={};
        if(g.turn.source==='camera'){
          validateCameraCapture(game,action.capture,action.dice,held);
          const original=action.capture.observation;
          if(g.events.some(e=>e.type==='roll'&&e.observedSource==='camera'&&['cameraId','sessionId','frameId'].every(k=>e.capture?.observation[k]===original[k])))fail('This camera frame was already recorded. Capture a fresh roll.');
          if(last&&held.some(Boolean)&&['cameraId','sessionId','calibrationId'].some(k=>last.capture?.observation[k]!==original[k]))fail('Camera session or calibration changed. Release all holds and capture again.');
          hardware={observedSource:'camera',capture:structuredClone(action.capture)};
        }
        if(g.turn.source==='godice'){
          if(!Array.isArray(action.deviceIds)||action.deviceIds.length!==5||new Set(action.deviceIds).size!==5||action.deviceIds.some(id=>typeof id!=='string'||!id))fail('Five identified dice are required.');
          if(action.capture?.gameId!==g.id||action.capture?.turnId!==g.turn.id||action.capture?.playerId!==g.players[g.activeSeat].id||action.capture?.revision!==game.revision)fail('Capture belongs to another turn or revision.');
          if(!Array.isArray(action.capture.events)||action.capture.events.length>500||!Array.isArray(action.capture.evidence)||action.capture.evidence.length>500)fail('Invalid capture evidence.');
          if(last&&held.some(Boolean)&&JSON.stringify(last.deviceIds)!==JSON.stringify(action.deviceIds))fail('Held dice cannot be transferred to another device.');
          hardware={deviceIds:[...action.deviceIds],capture:structuredClone(action.capture)};
        }
        const e = event('roll', { dice: [...action.dice], held: [...held], source: g.turn.source, combinations: combinations(action.dice),...hardware });
        g.turn.rolls.push({ id: e.id, dice: [...action.dice], held: [...held], source: g.turn.source, excluded: false,...(hardware.deviceIds?{deviceIds:hardware.deviceIds}:{}),...(g.turn.source==='camera'?hardware:{}) });
      } else if (action.type === 'correct-roll') {
        if (!last) fail('No roll to correct.');
        validateDice(action.dice);
        event('roll-correction', { target: last.id, before: [...last.dice], dice: [...action.dice], source: 'manual-correction', observedSource:last.observedSource??last.source });
        last.observedSource ??= last.source;
        last.dice = [...action.dice]; last.source = 'manual-correction';
      } else if (action.type === 'discard-roll') {
        if (!last) fail('No roll to exclude.');
        event('roll-excluded', { target: last.id }); last.excluded = true;
      } else if (action.type === 'manual-fallback') {
        event('manual-fallback'); g.turn.source = 'manual'; g.turn.manualFallback = true;
      } else if (action.type === 'score' || action.type === 'bonus') {
        let dice = FACE_SOURCES.includes(g.turn.source) ? last?.dice : null;
        if (FACE_SOURCES.includes(g.turn.source) && !dice) fail('Record a roll first.');
        if (g.turn.source === 'manual' && action.yahtzeeFace) {
          if (!isFace(action.yahtzeeFace)) fail('Choose a valid Yahtzee face.');
          dice = Array(5).fill(action.yahtzeeFace);
        }
        const options = dice ? scoreOptions(g,dice) : null;
        if (action.type === 'bonus') {
          if (!options?.extraTurn) fail('A scored first Yahtzee and five matching dice are required.');
          g.sheets[g.activeSeat].yahtzeeBonus = (g.sheets[g.activeSeat].yahtzeeBonus || 0) + options.bonus;
          event('bonus', { value: options.bonus, face: dice[0], source: g.turn.source, rollId: last?.id ?? null });
          finishTurn(g,true,time);
        } else {
          if (g.sheets[g.activeSeat][action.category] !== undefined) fail('That category is already filled.');
          validateValue(g,action.category,action.value);
          if (options?.extraTurn) fail('Record the bonus Yahtzee, then take your extra turn.');
          if (options && !(action.category in options.scores)) fail('Joker placement requires another category.');
          if (options && action.value !== options.scores[action.category] && !(action.value === 0 && !options.joker)) fail('Score does not match the dice.');
          if (g.rules.weighted && action.category === 'yahtzee' && action.value > 0 && !dice) fail('Select the Yahtzee face.');
          const bonus = options?.bonus || 0;
          g.sheets[g.activeSeat][action.category] = action.value;
          if (bonus) g.sheets[g.activeSeat].yahtzeeBonus = (g.sheets[g.activeSeat].yahtzeeBonus || 0) + bonus;
          event('score', { category: action.category, value: action.value, bonus, face: dice?.[0] ?? null, source: g.turn.source, rollId: last?.id ?? null });
          const finalYahtzee = finalChainRules(g) && filled(g.sheets[g.activeSeat]) === 13 &&
            (options?.bonus > 0 || action.category === 'yahtzee' && action.value > 0);
          if (finalYahtzee) {
            g.finalChain = { seat: g.activeSeat, attempt: 1 };
            event('final-chain-start', { attempt: 1 });
          }
          finishTurn(g, finalYahtzee, time);
        }
      } else fail('Unknown action.');
    }
  }
  g.revision++; return g;
}
export function rollAnalytics(game, seat) {
  const rolls = new Map(),excludedTurns=new Set(game.turns.filter(t=>t.excluded||t.undone).map(t=>t.id));
  for (const e of game.events) {
    if (e.seat !== seat||excludedTurns.has(e.turnId)) continue;
    if (e.type === 'roll') rolls.set(e.id,{ ...e, observedSource:e.observedSource??e.source });
    if (e.type === 'roll-correction' && rolls.has(e.target)) Object.assign(rolls.get(e.target),{ dice:e.dice,source:'manual-correction' });
    if (e.type === 'roll-excluded') rolls.delete(e.target);
  }
  const counts = {}, turns = {};
  for (const roll of rolls.values()) for (const [key,match] of Object.entries(combinations(roll.dice))) if(match){counts[key]=(counts[key]||0)+1;(turns[key]??=new Set()).add(roll.turnId);}
  const observedSources={};for(const roll of rolls.values())observedSources[roll.observedSource]=(observedSources[roll.observedSource]||0)+1;
  return { recordedRolls:rolls.size, counts, turns:Object.fromEntries(Object.entries(turns).map(([k,s])=>[k,s.size])), corrected:[...rolls.values()].filter(r=>r.source==='manual-correction'||r.capture?.corrections?.length>0).length, observedSources };
}
// Camera evidence is a reviewed proposal. It never confers player authority.
export function validateCameraCapture(game,capture,dice,held){
  if(capture?.gameId!==game.id||capture?.revision!==game.revision||capture?.turnId!==game.turn?.id||capture?.playerId!==game.players[game.activeSeat].id)fail('Capture belongs to another turn or revision.');
  if(capture.version!==1||capture.confirmed!==true||capture.identityScope!=='logical-slots')fail('Confirm a versioned camera observation first.');
  const o=capture.observation;
  const observationKeys=['version','cameraId','sessionId','sequence','frameId','width','height','orientation','calibrationId','mediaOrigin','receivedAtMonotonicMs','decodedAtMonotonicMs','observedAtMonotonicMs','ageUpperBoundMs','bridgeReceivedAtMonotonicMs','timestampMeaning','readerVersion','prediction','predictedValues'];
  if(o&&Object.keys(o).some(k=>!observationKeys.includes(k)))fail('Unexpected camera metadata.');
  if(!o||o.version!==1||!['cameraId','sessionId','frameId','calibrationId','readerVersion'].every(k=>typeof o[k]==='string'&&/^[\w.-]{1,128}$/.test(o[k])))fail('Invalid camera observation identity.');
  if(!Number.isInteger(o.sequence)||o.sequence<1||!Number.isInteger(o.width)||!Number.isInteger(o.height)||o.width<1||o.height<1||o.width>8192||o.height>8192||![0,90,180,270].includes(o.orientation))fail('Invalid camera frame metadata.');
  if(!['camera','local-rtsp','fixture','webcam','replay','synthetic'].includes(o.mediaOrigin))fail('Invalid camera media origin.');
  const rendered=o.timestampMeaning==='local-render-not-sensor-capture';
  if(rendered){
    if(!Number.isFinite(o.observedAtMonotonicMs)||o.observedAtMonotonicMs<0||!Number.isFinite(o.ageUpperBoundMs)||o.ageUpperBoundMs<0)fail('Invalid camera render timing.');
    if(o.bridgeReceivedAtMonotonicMs!==undefined&&(!Number.isFinite(o.bridgeReceivedAtMonotonicMs)||o.bridgeReceivedAtMonotonicMs<o.observedAtMonotonicMs))fail('Invalid camera bridge timing.');
  }else if(o.mediaOrigin==='camera'||!Number.isFinite(o.receivedAtMonotonicMs)||!Number.isFinite(o.decodedAtMonotonicMs)||o.receivedAtMonotonicMs<0||o.decodedAtMonotonicMs<o.receivedAtMonotonicMs)fail('Invalid camera frame timing.');
  if(!Array.isArray(o.predictedValues)||o.predictedValues.length!==5||!o.predictedValues.every(v=>v===null||isFace(v)))fail('Invalid original camera values.');
  if(o.prediction&&(!Array.isArray(o.prediction.dice)||o.prediction.dice.length>5||JSON.stringify(Array.from({length:5},(_,i)=>o.prediction.dice[i]?.value??null))!==JSON.stringify(o.predictedValues)))fail('Original camera prediction does not match its values.');
  if(JSON.stringify(o).length>65536)fail('Camera evidence is too large.');
  if(!Array.isArray(capture.confirmedValues)||JSON.stringify(capture.confirmedValues)!==JSON.stringify(dice)||JSON.stringify(capture.heldMask)!==JSON.stringify(held))fail('Review does not match the submitted roll.');
  if(!Array.isArray(capture.corrections)||capture.corrections.length>5)fail('Invalid camera corrections.');
  const changed=o.predictedValues.flatMap((v,i)=>v===dice[i]?[]:[{slot:i,before:v,after:dice[i]}]);
  if(JSON.stringify(capture.corrections)!==JSON.stringify(changed))fail('Camera corrections must preserve the original values.');
  if(!Number.isFinite(capture.reviewedAtMonotonicMs)||capture.reviewedAtMonotonicMs<(rendered?o.observedAtMonotonicMs:o.decodedAtMonotonicMs))fail('Invalid camera review timing.');
}
