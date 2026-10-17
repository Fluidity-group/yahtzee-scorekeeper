# SW-042: in-card Undo and indicator space

Implemented, qualified and deployed for owner playtest; physical acceptance pending. Code 9b4f19ab69f48ffed5b80da094ed4fd9650885ec; Node24 gate C:\Codex\Yahtzee Game\artifacts\sw039\source\artifacts\engineering\2026-10-17T00-10-32-333Z-b982e105:1,112 passed,13 optional camera skips, web/native/room/commentary builds passed. First qualification caught repeat-bonus entry regression; repaired before final qualification/publication.

Category/indicator46%, own scores36%, peer18%. Horizontal indicators70×22px (previous44×14); synthetic Large-text browser320/390/402/440px no page overflow. Score fields remain at least44px; owner field126px at390px fixture. No engine or dependency changes.

Bottom Undo removed. Latest recorded score popup retains correction and eligible Undo; Undo returns turn/reopens category for replacement elsewhere. Authority and next-completed-turn cutoff unchanged. Local shared-phone previous score remains tappable after handoff; hosted opponents read-only. Bonus-only/final-chain Undo in bonus row retains repeat-Yahtzee control. Paused paragraph and metadata duplication removed; purple status remains. Host Resume first/accented in tournament and clubhouse menus, capability/connection/busy guarded.

Pixel install-r/readback SHA256 59dc30134c854ab21e5d174c589f9f3494bf8b75d4a617eeb24c55160842019b, 7599348bytes; native assets 38 matched. Public web revision ad1cc17584124c615ce87a54ba58d6c2d333d1a1, previous 4a3558902df27f564d94ae7981ac6e9447cafa4c; 42 public files byte matched. Backend ACTIVEv10 unchanged; no migration or paid provider request. Before/after full room/game/profile-settings fingerprints/accounts equal; tournament game8of12 remains paused revision217. No app data cleared or live score/settings changed.

Evidence: artifacts/sw039/sw042-manifest.json and sw042-rollout. Browser synthetic screenshot artifacts/sw039/sw042-indicator-space-390.png. Physical Android/iPhone Safari gameplay acceptance remains with owner. Rollback: sw042-rollout/pixel-before.apk via install-r; web-before.zip/previous revision, preserving storage. No backend rollback.
