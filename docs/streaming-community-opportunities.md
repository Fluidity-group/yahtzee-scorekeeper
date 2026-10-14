# Physical dice: streaming integrations and commercial opportunities

Advisory assessment: 1 October 2026. Prepared by Codex for the product owner. Recommendations are proposals; no new commercial scope, pricing, platform partnership or release gate is accepted.

## Recommendation

TikTok-specific follow-up: [live formats, overlays and revenue discovery](tiktok-dice-live-opportunities.md). Recommends a vertical host-led pilot, manual chat participation and separate measurement of broadcaster income versus overlay/product sales. No TikTok automation or revenue forecast established.

Position the device as a bridge from physical dice to readable live results: players keep the tactile game, while viewers get clear faces, scores, context and a correction history. Start with an OBS browser overlay for existing five-d6 games, then Discord summaries and Twitch audience interaction. Sell reduced production effort and better spectator understanding. Recognition itself is not yet commercially qualified.

The camera route could eventually let users retain ordinary dice rather than buying electronic sets. That is a differentiation hypothesis, dependent on measured recognition reliability, setup effort and supported dice/lighting. The C121 is the current development input; a custom ESP32 enclosure should follow customer and optics evidence rather than become a prerequisite for testing streaming demand.

## What we have and what is missing

Existing foundations are the pure rules engine, accepted roll/reroll history, correction provenance, hosted multiplayer and proposed C121 Android recognition/review. See [architecture](architecture.md), [product specification](prototype-development-spec.md), [camera design](android-c121-poc-design.md) and [integration control](projects/integration.md). Camera observations require player review/confirmation before game acceptance. Webcam history of 6/10 exact rolls is evidence of an unfinished recognition problem, not a streaming-ready accuracy claim.

No dedicated OBS, Twitch, Discord or spectator publication design was found in the reviewed documentation. Current camera/native and physical acceptance remain open. Current five-d6 work does not establish support for d4/d8/d10/d12/d20, arbitrary dice pools, RPG modifiers or VTT rules. Current launch scope also defers AI coaching and post-game analysis; the opportunities below do not override that decision.

## Priority users and value

| Priority | Community / buyer | Useful live experience | Commercial hypothesis and dependency |
|---|---|---|---|
| 1 | Small tabletop and dice-game creators streaming five-d6 games | Readable faces, held dice, roll number, current player, score and rare-combination celebration | Creator pays for branding, layouts and reduced manual overlay work; closest to current capabilities |
| 2 | Remote board-game clubs using Discord | Shared result page, match summaries, league standings and correction-aware history | Organizer pays for persistent leagues/admin features; private groups may prefer a free/basic tier |
| 3 | Twitch variety creators using physical dice for audience challenges | Viewers request a challenge; host rolls; overlay reveals confirmed outcome | Creator pays for controlled audience participation; needs moderation and clear request-to-roll linkage |
| 4 | Board-game cafés, convention organizers and tournament producers | Projected scoreboards, multiple tables, session exports, sponsor graphics | Event licence or service package; requires multiple-table identity, support and stronger reliability |
| 5 | RPG actual-play shows and remote RPG groups | Physical dice visible as structured rolls alongside an actual-play stream | Attractive expansion, but requires polyhedral recognition, roll formulas and private/GM roll controls |
| 6 | Publishers and accessory vendors | Branded demo overlays or a licensed result SDK | Partnership/licensing upside after proof of adoption; integration/support and rights negotiation required |

These rankings are product judgments, not measured market size or willingness to pay. Platform APIs demonstrate feasible distribution paths, not customer demand.

## Integration designs we should have

### 1. Common public result contract — first dependency

Design this at the boundary after authoritative acceptance, outside recognition and pure scoring. Propose a versioned public projection with schemaVersion, eventId, sessionId, authorityId/epoch, sequence, gameRevision, turnId, acceptedAt, publishedAt, rulesVersion, optional public player alias, dice faces and logical slots, known held flags, roll number, source class, completeness, correction status and supersededEventId. A proposed event set is session.snapshot, roll.accepted, roll.corrected, score.accepted, score.corrected and session.status.

Camera logical slots must not be advertised as persistent physical die identities. Unknown information remains unknown. Publish only an allowlisted projection: exclude account IDs, email, credentials, camera addresses, raw diagnostics and raw frames. Public sharing must be explicitly enabled by the host with player display-name consent. Retain original evidence privately; public corrections explain which result changed.

Consumers deduplicate event IDs, order by authority epoch/sequence and recover using a snapshot plus cursor. Corrections replace or amend the displayed result and derived statistics without celebrating the original again. Hide stale results or label them disconnected. Never synthesize missed rolls. Keep hosted rooms and Pi authority separate; each adapter publishes from one declared authority, with no state merge implied.

For the first OBS experiment, prefer a local read-only feed reachable by the creator's PC over an explicitly paired LAN connection. Android-to-PC discovery, address changes, browser security and background service behaviour need their own design and measurement. A hosted relay is a later option when remote overlays/history justify hosting costs. Do not expose the camera RTSP service to the internet or assume an Android local endpoint is already implemented.

Proposed design home: `docs/contracts/public-dice-events.md`; adapters later belong outside `src/dice/` and pure rules, with authority publication hooks reviewed against `server/rooms/` and local core contracts. These are proposed locations, not existing implementations.

### 2. OBS browser overlay — first product slice

OBS supports local files or URLs as browser sources [S1]. Design a transparent overlay with compact and full scoreboard layouts, creator-selected names/colours, face values in text as well as graphics, explicit corrected/manual indicators and connection status. Start with no audience controls. Offer a setup guide and preview using clearly labelled simulated data.

The creator controls video composition; our initial export is structured results. Camera video may be captured separately only after compatibility is proven. Avoid promising an RTSP stream is directly usable by the browser source. Add a configurable result delay: capture, review, acceptance and video travel take different times. Test synchronization at the encoded stream output, not merely on the phone. An OBS-composited overlay is carried in the resulting video; an interactive platform extension is a separate viewer surface.

Target Twitch first for pilot recruitment, but the same composited overlay can accompany an OBS broadcast to YouTube or other supported destinations. Platform-specific viewer interactivity needs separate adapters and current policy review.

Proposed design home: `docs/obs-dice-overlay-design.md`. Acceptance must include actual OBS scene/source reload, disconnected Android, duplicate/reordered events, public correction, transparent rendering and phone-to-video latency.

### 3. Discord — summaries before a bot

Discord incoming webhooks can post into a channel without a bot user [S2]. First design opt-in end-of-turn/game summaries and exceptional confirmed results, rather than sending every die update. Queue/rate-limit delivery, deduplicate retries, suppress mentions by default and update or annotate corrected posts. Store webhook secrets privately; never include them in overlay URLs or client-visible result projections.

Later, add an authenticated bot only when slash commands, private session joins, league administration or interactive queries justify it. A shared spectator web page may provide live results while Discord provides conversation and summaries. Discord screen-sharing is another distribution route for the OBS scene, not evidence of a native dice-result integration.

Proposed design home: `docs/discord-dice-community-design.md`.

### 4. Twitch interaction — separate inbound requests from results

Twitch EventSub supplies channel-point reward redemption events [S3]. Design an authenticated request queue with broadcaster-authorized scopes, replay protection, cooldowns, queue limits, moderator cancel/pause and fulfil/cancel receipts. For example, a viewer requests “roll for the next challenge”; the host accepts the request, physically rolls and confirms the result. Link requestId to accepted roll eventId. The request must not take a player seat, force a reroll, change rules or confirm a camera reading.

An interactive Twitch Extension could let viewers inspect dice history, statistics or vote on an allowed challenge. Twitch provides panel, overlay and component surfaces within its extension system [S4]. It adds platform review, authentication, backend and maintenance requirements, so defer it until the OBS pilot establishes demand. Keep audience challenge events distinct from canonical gameplay; show exact statistical assumptions if displaying odds.

Proposed design home: `docs/twitch-dice-interaction-design.md`. Audience polls/challenges are sufficient for the initial experiment; wagering or paid chance-based prizes are outside this proposal.

### 5. VTT and broader dice support — discovery work

Foundry already lists a Pixels electronic dice integration [S5]. Pixels has also described a dddice/OBS proof of concept [S6]. Therefore “physical dice shown digitally” is an existing competitive category. Our potential edge is ordinary dice plus useful broadcast context and correction provenance, if camera performance supports it. Do not claim exclusivity.

Research a read-only roll display/export first. A VTT adapter that satisfies an actual pending roll needs explicit formula, dice type/count, player/GM permissions, secret-roll visibility and correction semantics; an observed total must not silently satisfy an unrelated pending roll. Polyhedral camera recognition is a separate SW/HW/INT qualification task. Evaluate a partner/adapter route before building a universal VTT product.

Proposed design home: `docs/vtt-dice-integration-discovery.md`.

## Analytics that can add value

Start with current roll faces, cumulative score, recent-roll history, naturally rolled combinations and session highlights. Separate observed, corrected, manually entered and incomplete data. Publish descriptive counts with sample size and mode/rules version; missing capture is not a zero roll. Any odds display must declare fair independent dice and its held/reroll assumptions. A short sample cannot certify dice fairness, absence of cheating or tournament integrity.

Potential later paid features are branded highlight graphics, league exports and longer history. Coaching and AI commentary are separate product/cost decisions. Existing jovial commentary can be evaluated for stream use with captions, mute, queue/latency controls and provider rights/cost checks; do not add it to the first overlay dependency chain.

## Commercial experiments and economics

Preserve the current free manual/multiplayer and intended one-time GoDice upgrade model. A creator offering would be a separate proposed product decision, not a repricing of that product.

| Offer to test | Possible charging basis | Evidence needed before commitment |
|---|---|---|
| Basic local overlay | Free entry tier | Does it bring repeat use and qualified creator leads? |
| Creator features | One-time local theme/layout pack; subscription only for ongoing hosted value | Compare actual buying intent for branding, saved presets, history and cloud relay |
| Community organizer | Per organizer/league | Retention, season administration effort and support burden |
| Event production | Per event or annual organizer licence | Multi-table setup time, reliability and operator support costs |
| OEM/SDK | Negotiated integration/support licence | Partner demand, permitted redistribution, integration effort and maintenance commitment |
| Camera enclosure or kit | Hardware margin with optional software service | BOM, assembly/test yield, shipping/returns, warranty, certification and optics acceptance |

No competitor price comparison, revenue forecast or TAM is established here. Test price ranges during discovery rather than presenting invented prices as market evidence. Measure contribution per paid account: receipts less payment fees, relay/storage/bandwidth, AI/voice usage if enabled and attributable support. Hardware margin must also account for assembly/testing, fulfilment, returns and warranty. Avoid a recurring subscription solely for a local static overlay; recurring value needs a recurring service.

GoDice's published API licence limits use and excludes commercial deployment [S7]; any public or commercial vendor-dependent integration needs separately resolved terms. Camera-first integration can reduce reliance on that API but does not close privacy, app distribution, branding, hardware or platform gates.

## Proposed discovery and pilot

1. Interview six tabletop creators, three community organizers and one event producer, recruited by the product owner. Ask how results are shown today, time spent per session, corrections/mistakes, ordinary versus electronic dice preference and whether the camera position interferes with play. These are proposed sample counts, not completed interviews; no outreach has been sent.
2. Prepare a simulated OBS demo using the proposed public event contract. Validate the spectator layout before hardware reliability can support a live pilot. Label simulated results.
3. After C121 native/physical acceptance, pilot with three creators over three sessions each. Measure setup minutes, review/correction effort, confirmed-roll-to-overlay latency, video/result alignment, missed/duplicate/wrong displayed results, reconnect recovery and operator intervention. Record exact hardware/build identities.
4. Proposed continuation targets for product-owner review: setup at most ten minutes after onboarding, confirmed-result-to-overlay p95 at most one second excluding configurable broadcast delay, zero unconfirmed or duplicate result displays in the pilot, and at least two creators voluntarily reusing it and expressing concrete willingness to pay. These do not claim population reliability or statistical market validation.
5. Compare creators' existing process with the pilot; choose whether to build Discord, Twitch interaction or branded creator features based on repeated requests and payment evidence. Pause if confirmation effort removes the production benefit.

Suggested sequence: public event contract and spectator/privacy review -> simulated OBS slice -> qualified C121/Android live pilot -> Discord summary experiment -> Twitch requests -> extension/VTT expansion if justified. Calendar estimates should follow baseline and native-camera feasibility evidence.

## Sources and limits

Primary sources checked 1 October 2026. Capabilities are documentation evidence, not tests performed on this project.

- S1: [OBS Browser Source](https://obsproject.com/kb/browser-source): browser sources support web/local content.
- S2: [Discord webhook resource](https://docs.discord.com/developers/resources/webhook): incoming webhook posting and API structure.
- S3: [Twitch EventSub reference](https://dev.twitch.tv/docs/eventsub/eventsub-reference/): channel-point redemption events.
- S4: [Twitch Extensions](https://dev.twitch.tv/docs/extensions): supported extension surfaces and lifecycle.
- S5: [Foundry Pixels integration](https://foundryvtt.com/packages/pixels): existing physical electronic dice integration listing; not proof of camera support.
- S6: [Pixels March 2025 update](https://gamewithpixels.com/blogs/blog/pre-order-update-march-2025): vendor-described dddice/OBS proof of concept; current maturity was not independently tested.
- S7: [GoDice API licence](https://raw.githubusercontent.com/ParticulaCode/GoDiceJavaScriptAPI/main/LICENSE.md): published use/distribution limits; negotiated rights remain unresolved.

No customers interviewed, devices tested, integrations implemented, services deployed, vendors contacted or revenue measured for this assessment. G4/G5 remain open.
