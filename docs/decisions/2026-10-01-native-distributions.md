# SW-001 native distribution contract

Date: 1 October 2026. Development decision: Codex under the authorized SW-001 fix. Independent review and commercial licence acceptance remain open.

Standard native mode resolves the versioned generic BLE connection panel, uses root asset paths and disables PWA updates. It supports manual games and connection testing, not vendor dice decoding. Native mode alone must not advertise GoDice capture.

Explicit native-evaluation requires separately provisioned ignored private input, uses the same native asset/PWA settings, exposes evaluation capture and emits godice-evaluation.json with distribution local-android-evaluation. Missing input fails. The publication guard remains in force. Private code remains excluded from supported source inventory. Both sync commands use dist-native; PowerShell packaging validates the marker against -Evaluation, including when reusing synced assets.

This selects supported build inputs without changing game command authority, commercial scope or physical qualification. See ../plans/SW-001-native-baseline.md for actual evidence and open fresh-install/remote/physical gates.
