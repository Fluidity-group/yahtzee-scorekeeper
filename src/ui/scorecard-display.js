export const DISPLAY_SIZES = ['compact', 'comfortable', 'large'];
const key = 'dice-clubhouse:scorecard-size';
export function readScorecardSize(storage = globalThis.localStorage) {
 try { const value=storage.getItem(key);return DISPLAY_SIZES.includes(value)?value:'comfortable'; }
 catch { return 'comfortable'; }
}
export function saveScorecardSize(value, storage = globalThis.localStorage) {
 if (!DISPLAY_SIZES.includes(value)) throw Error('Choose a valid scorecard size.');
 storage.setItem(key,value);return value;
}
export function applyScorecardSize(root, value=readScorecardSize()) {
 root.dataset.scorecardSize=DISPLAY_SIZES.includes(value)?value:'comfortable';
}
export function renderScorecardDisplay(value=readScorecardSize()) {
 return `<h2>Scorecard display</h2><p class="core-muted">Saved on this device. Your opponent chooses their own size.</p><fieldset class="scorecard-size-options"><legend>Text size</legend>${DISPLAY_SIZES.map(size=>`<label><input type="radio" name="scorecard-size" value="${size}"${size===value?' checked':''}>${size[0].toUpperCase()+size.slice(1)}</label>`).join('')}</fieldset><p class="core-muted">Your score stays prominent, with opponents alongside. Scroll vertically for the full card; phone text scaling and zoom remain available.</p><button class="all-scores" data-action="close">Done</button>`;
}
