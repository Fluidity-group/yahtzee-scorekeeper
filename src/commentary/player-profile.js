const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PLAYER_GENDERS = Object.freeze(['', 'woman', 'man', 'nonbinary', 'another']);
export const PLAYER_PROFILE_LIMITS = Object.freeze({ displayName: 24, blurb: 240 });
function text(value, limit, label) {
 if (typeof value !== 'string') throw new Error(`${label} must be text.`);
 const clean = value.trim();
 if ([...clean].length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(clean)) throw new Error(`${label} must be at most ${limit} characters without control characters.`);
 return clean;
}
// Account ownership is independent from display names and versioned table humor settings.
// This contract does not persist a profile or change game-time alias snapshots.
export function createPlayerProfile({ accountId, displayName = '', gender = '', blurb = '', version = 1 } = {}) {
 if (typeof accountId !== 'string' || !UUID.test(accountId)) throw new Error('A valid account UUID is required.');
 if (!Number.isSafeInteger(version) || version < 1) throw new Error('A positive profile version is required.');
 if (!PLAYER_GENDERS.includes(gender)) throw new Error('Choose a supported optional gender.');
 return Object.freeze({ schemaVersion: 1, accountId: accountId.toLowerCase(), version,
  displayName: text(displayName, PLAYER_PROFILE_LIMITS.displayName, 'Display name'), gender,
  blurb: text(blurb, PLAYER_PROFILE_LIMITS.blurb, 'Player blurb') });
}
export function updatePlayerProfile(profile, changes = {}) {
 if (changes.accountId !== undefined && changes.accountId.toLowerCase() !== profile.accountId) throw new Error('Player profile ownership cannot change.');
 return createPlayerProfile({ ...profile, ...changes, accountId: profile.accountId, version: profile.version + 1 });
}
// A writer must treat this object as quoted player data, never a system instruction.
// Gender is voluntary self-description, never inferred from names or used to raise humor intensity.
export function playerProfileContext(profile) {
 const checked = createPlayerProfile(profile);
 return Object.freeze({ source: 'player-provided', instructionAuthority: 'none', accountId: checked.accountId,
  profileVersion: checked.version, displayName: checked.displayName, gender: checked.gender || null, blurb: checked.blurb || null });
}
