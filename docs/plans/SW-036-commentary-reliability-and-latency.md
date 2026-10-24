# SW-036: reliable commentary handoff and measured Pixel retest

Date: 15 October 2026. Owner: product owner; lead/reviewer: Codex development self-review with explicitly requested specialist agents. State: implemented/qualified/deployed/installed for owner retest. Software scope; no independent/commercial or physical acceptance claimed.

## Purpose and baseline

Owner authorizes fixes, expert agents and Pixel update. Baseline executable3775a14, documentation3c2320b in isolated `poc-s01-commentary/Yahtzee Game`, deployed commentaryv9/game-roomv9, last verified APK09166925. These are historical identities; inspect target freshly before promotion. Root dirty checkout is documentation/ignored evidence only; retain unrelated changes. Specialists use separate scoped worktrees and lead integrates scoped commits sequentially.

Current evidence: completed welcome receipt, prepared score2.349s native request→position/7.717s score submission→position, cold score6.756s/8.419s; later prepared job unclaimed and local-command503. PostgreSQL exception `Speech receipt requires current fenced lease at commit` is proven; Undo historical invalidation is the suspected trigger pending reproduction. No conclusion of score loss or physical listening acceptance.

## Requirements and verification

| ID | Acceptance criterion | Verification | State |
|---|---|---|---|
| R1 | Undo/correction can invalidate historical completed speech after lease expiry without replaying it or altering actual exposure | Disposable PostgreSQL reproduction, repaired positive and44 anti-forgery negatives | Verified33SQL checks |
| R2 | Accepted newest score is pumped after in-flight refresh/terminal receipt without readiness polling or duplicate voice | Client/session controller race regressions | Verified; physical retest open |
| R3 | Rejected current playback cannot permanently strand a newer valid target | Deferred native failure/new target regression; terminal receipt ordering retained | Verified for acknowledged stop/receipt; uncertain stop fails closed |
| R4 | Latency records distinguish total submission→position, queue/preparation, native startup and server phases without raw jokes/profiles/secrets | Focused numeric trace tests and installed owner retest | Numeric tests passed; actual phone timing open |
| R5 | Exact clean qualified source/backend/APK delivered preserving local data and authority | Node24 full gate, actual SQL checks, Android assets/credential scan, fresh Pixel serial/install-r/readback, backend source readback | Qualified/deployed/installed; physical acceptance open |

## Design and impact

Narrow canonical receipt mutation exception permits only true→false historical validity invalidation with every other field unchanged. New/advanced actual listening receipts continue to require current fenced lease. Additive migration; no score schema/data deletion. Client repairs use explicit queue/refresh transitions rather than polling or another playback handshake.

Server/native expert evaluates next audio preparation. Text preparation is already implemented; true audio preparation requires a separate bounded synthesis capability and private expiring bytes with fresh playback checks. Do not claim it implemented or weaken speaker ownership to preload. Stable prompt prefix is below deployed Haiku caching minimum; no prompt padding/model change or inert feature shipping.

## Risks and execution bounds

Historical invalidation must not permit changing heardBy/status/sequence/identity/timestamps, resurrection, or new listening without lease. Queue fixes must not retry an already consumed target or play stale/profile-incompatible lines. Scoring stays independent. No new provider calls during agent diagnostics; existing owner-use allowance and Rachel/model settings unchanged. User explicitly authorized live repair deployment and Pixel update. No public web publication or app data clearing required.

## Completion and decision

Receipt baseline reproduced through real service Undo after completed synthetic speech and expired lease. Expert migration commit619b710 (integratedcc4228d) permits only exact historical Boolean validity revocation;44 forged combinations/new receipts/resurrection rejected. Lead reran all33 actual disposable PostgreSQL checks successfully in integration checkout; `artifacts/commentary-durable/report.json`, SHA2567eb104dfec7432209480846dcf6dc283206c058a2c2c297ceac216c0e6f8e22a. Synthetic qualification made no live mutation or paid generation; later rollout is recorded below.

Client baseline reproduced accepted-score refresh coalescing, bound/unbound native failure stranding, and combined Undo/new-score loss. Expert commits3c797c4/5171f63 integrated4b5ae3c/215567c; final stop-barrier repairs are described below. Started-speech wake prepares a connecting-time queued score once; failed/mismatched terminal receipts do not automatically drain; old scope callbacks cannot mutate a new welcome. Queue vs residual preparation vs native-player invocation timings are separate numeric records. Architecture expert reviewed code as teammate development evidence, not commercial independent approval.

Final code includes native-stop acknowledgment barrier installed before callback-capable stop, persistent uncertain-stop interlock and error clearing only on real recovered speech. Lead and architecture expert reviewed receipt/client changes; historical reproductions and84finalcontroller tests recorded in [client evidence](SW-036-client-race-evidence.md). No XState/dependency/provider change was needed. A native stop failure blocks that controller until recreation rather than reopening on a later score.

Clean source260d351199a28d1d622adb2c3b6ddd22beb50703/sourceSHA259b588c78552e893fce45f833235d3cbf4cdbb93512cb870e8b000692b7d32e qualified under Node24.19:1,074tests/13optionalcamera skips, all web/native/commentary/room builds and unchanged-source check passed. Gate `artifacts/engineering/2026-10-15T14-03-04-792Z-fb82846b/report.json`. Android cached offline JDK21/Gradle build succeeded,38assets matched/credential-pattern scan passed. Subsequent checkpoint changes documentation only.

Narrow migration applied to live Supabase with function body readback matched, client execution denied/service role retained/RLS enabled;17rooms/19games/revision sum343 and full fingerprints unchanged. Commentaryv9/game-roomv9 remain ACTIVE, unsigned401; fresh deployed commentary canonical352ee5f279f52f2736ab258441c837e5183f62d687340adfeee1d9e127e7d391 matched qualified bundle. No edge redeployment/public web publication. Limits/configuration unchanged, no agent-triggered paid calls; pre-rollout usage51writer/37voice/5,267spoken characters.

Fresh Pixel hardware67080DLDV005JQ/transport192.168.0.229:44167 verified, exact predecessor09166925 retained. APK6b19de2f309601543c9ee5345cc8450c9e325688b878c17ef47ddfc082ac60a7 installed-r with app data preserved, launchStatusok and installed readback hash matched. Post-install process healthy/no fatal exception in bounded recent logs. Actual owner listening, latency and comedy quality remain open. [Release/rollback/test](../releases/SW-036-commentary-reliability.md) retains full evidence/configuration identities. Root ignored artifacts/sw036 contains central reports and installed APK. No speed percentage is claimed from synthetic overlap tests.
