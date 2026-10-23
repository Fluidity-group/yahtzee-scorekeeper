# SW-054: Amber's playable UI development copy

23 October 2026. Requested by Amber/Dan; engineering Codex. State: implemented and automated development checks passed; local preview running. Browser/phone visual acceptance pending; no product deployment or baseline promotion.

## Purpose and requirements

Create a real playable development clone of the latest recorded iPhone baseline, supporting live UI edits, review requests, playability testing and later promotion of accepted changes. SW053 remains the immutable reference gallery. This is local development, not a public deployment or automatic main-branch replacement.

Baseline: runtime `0bc8ca0`, recorded source `1283973`; isolated branch `codex/amber-ui-lab`, worktree `artifacts/sw054/source`. No secrets copied. Existing pinned node_modules reused via a local junction.

| Requirement | Observable acceptance | Evidence |
|---|---|---|
| LAB-1 | Real local game can be created, scored, undone and resumed using existing product code |31 focused lab/scoring/Undo/scorecard checks pass; restart persistence is retained unchanged but not freshly executed as a real browser journey |
| LAB-2 | Source/CSS changes update through Vite live reload |LAN page/module/API200; WebSocket delivered an update for the changed and restored lab-only HMR probe |
| LAB-3 | Change requests persist on ROG with screen, type, expected behaviour and review status |API creates/updates/reads requests and rejects cross-origin writes; UI saves, edits decisions, resizes and exports |
| LAB-4 | Production runtime source and frozen baseline remain unchanged; no real cloud calls |Custom config excludes environment/PWA/provider proxy; served URL/key/commentary values blank; git runtime diff empty; SW052 source clean |
| LAB-5 | Accepted changes have a reviewable promotion path | README and review manifest; main stays an explicit future decision |

## Design and impact

Use the actual source game in an iframe inside a development-only workbench, with full-screen play available. New origin/port8475 separates browser games/preferences from the gallery and deployed app. The workbench is development tooling, outside product UI. Its feedback API only writes bounded review records under ignored artifacts; same-origin custom-header JSON writes, no general file editing or cloud commands.

Only the lab entry provides cryptographically random RFC4122 UUIDs on LAN HTTP where native randomUUID is unavailable. Normal production bootstrap, scoring, persistence and room authority remain untouched. iPhone-test mode keeps voice deferred. Online account flows require a separately authorized test backend later; offline solo/shared-phone scoring is ready for qualification now.

## Execution bounds and promotion

No automatic promotion, public publication, production credentials, accounts or tournament writes. A review status is a tester decision, not a test-gate pass. Implement UI changes as scoped commits on this branch; preserve accepted-game rules. Reproduce bugs and add meaningful regression checks. Run the full Node24 engineering gate on the final product candidate, review the scoped diff against1283973, and obtain promotion/deployment authorization for the chosen target. Root working folder is older/dirty; never copy the entire worktree over it.

## Completion

Worktree `C:/Codex/Yahtzee Game/artifacts/sw054/source`, branch `codex/amber-ui-lab`. Real game source remains byte-identical for tracked product runtime paths to1283973. New lab-only code, bounded local review API, launch script, documentation and tests are separate from the production entry/config. No files from the source .env or credentials were copied; dependencies are a local node_modules junction.

Node24.19.0 / Vitest4.1.11:31 checks in5 files passed (`artifacts/amber-lab/focused-checks.json`). Vite7.3.7 lab game compilation passed; existing mixed static/dynamic-import warnings reported, no build failure. jsdom cannot perform a real download; export Blob generation and UI request submission are tested, actual browser export remains visual acceptance.

`node lab/check-live.mjs` passed (`artifacts/amber-lab/live-check.json`): main workbench, game HTML, entry/bootstrap/UI scripts and local API200; confirmed served offline environment; opened Vite WebSocket and observed a real source update before restoring the probe. An initial environment assertion expected direct substitutions rather than Vite's injected environment object; the assertion was corrected and rerun. No service configuration was changed to make that check pass.

`node node_modules/vite/bin/vite.js build --config lab/vite.config.js` passed. Generated dist-lab is ignored and is not a native/public product release. Full engineering release gate is deferred until there are accepted product changes to prepare for promotion. Existing SW052 worktree remains clean. Local preview started through `lab/Start-Lab.ps1`; no firewall changes, real accounts, paid providers, device installs or public deployments.

Browser observation was previously denied in this chat; no alternate browser automation was used. HTTP/DOM/WebSocket evidence does not establish Amber's visual/touch acceptance. Online cross-device invitations/tournaments need a separately approved test backend. Request statuses record tester decisions, never an automatic merge. Promotion checklist in `lab/README.md` retains a reviewed diff, scoped commits, final gate, named destination and explicit promotion/release decision.
