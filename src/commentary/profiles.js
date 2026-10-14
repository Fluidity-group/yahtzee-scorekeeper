const intensities = ['playful', 'savage', 'dark'];
const frequencies = ['highlights', 'balanced', 'lively'];
export function createProfile({ profanityAllowed, humorIntensity, frequency, version = 1 }) {
  if (typeof profanityAllowed !== 'boolean' || !intensities.includes(humorIntensity) || !frequencies.includes(frequency) || !Number.isSafeInteger(version) || version < 1) throw new Error('Explicit valid commentary settings required.');
  return Object.freeze({ schemaVersion: 1, version, profanityAllowed, humorIntensity, frequency });
}
export function updateProfile(profile, changes) {
  const next = createProfile({ ...profile, ...changes, version: profile.version + 1 });
  return next;
}
// Synthetic fixture validation only. Production needs a classifier/rewrite contract,
// including obfuscations, custom lines, aliases and fallback recordings.
export function fixtureLineCompatible(line, profile) {
  return line.profileVersion === profile.version && (profile.profanityAllowed || !line.containsProfanity);
}
