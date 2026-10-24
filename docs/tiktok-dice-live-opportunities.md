# TikTok live dice: format and revenue discovery

Advisory research: 1 October 2026. Prepared by Codex for the product owner. Follow-up to [INT-004](plans/INT-004-streaming-community-discovery.md). No integration implementation, account eligibility inspection, demand validation or pricing approval.

## Recommendation

Test a hosted vertical dice show with readable live results before building TikTok-specific automation. A score overlay supports the show; the entertainment comes from understandable stakes, human reactions, chat participation and frequent resolutions. These are format hypotheses, not established audience preferences or measured demand.

Best first experiment: “Chat chooses the keepers.” Show five physical d6, ask whether to keep a pair or chase a straight, let the host read the free chat vote, reroll and reveal the confirmed result. Existing game rules and authorized player decisions still control a canonical game. A separate challenge mode would need its own accepted design. No paid vote or automated gifting trigger is needed.

## Revenue: creator versus product business

| Route | Who earns / pays | Application and limitation |
|---|---|---|
| LIVE Gifts | Eligible broadcaster receives platform rewards | Voluntary appreciation for the show; availability/eligibility varies. Viewer gift purchase price is not a dependable creator payout calculation. No forecast established |
| Subscription | Viewers support an eligible creator | Recurring show, community recognition, exclusive discussion or bonus sessions. Requires sustained audience interest and account access |
| TikTok Shop affiliate | Creator receives commissions on eligible sales | Demonstrate dice, trays, towers and games used on stream; product/creator eligibility and seller commission matter |
| Sponsorship | Brand pays creator | Branded tabletop sessions or accessory demonstrations; commercial disclosure required |
| Our own products | Customers buy our hardware/software | Live demonstrations generate qualified leads; sales channel eligibility, support and commercial release gates remain separate |
| Creator overlay product | Other creators buy our software/service | Sell useful layouts, presets and history; subscription only where ongoing hosted value supports it. Revenue is from software customers, not automatically from TikTok views |
| Edited video revenue | Eligible creator earns on qualifying published videos | Creator Rewards is separate from LIVE. Original eligible videos over one minute may qualify; a short highlight or raw LIVE archive does not automatically qualify |

Priority judgment: use live content to validate demand and drive relevant product/affiliate sales; treat Gifts as uncertain additional income. Subscriptions and sponsorships become more plausible after repeat viewing. Our own channel is also a demonstration/customer-acquisition channel for an overlay product used by other creators.

Net session contribution = actual creator reward receipts + subscription receipts allocated to sessions + settled affiliate commissions + sponsorship allocation + attributable product gross profit, less production labour, platform/payment costs not already deducted, returns, software/support and fulfilment costs. Avoid double-counting sale revenue and gross profit. Track product leads separately until conversion attribution is defensible. No payout percentage, income benchmark or market size is inferred.

## Formats to test

| Format | Why someone might watch | Overlay requirement |
|---|---|---|
| Chat chooses keepers | Participation and disagreement over a visible decision | Dice, named options, host's final choice, rolls left |
| Race to a target | Easy-to-understand progress and a visible ending | Goal, current score, attempt count |
| Two-person comeback game | Personalities, rivalry and suspense | Player names, gap, current turn and remaining opportunity |
| Rare-roll hunt in a bounded session | Anticipation and satisfying reveal | Target combination, honest attempt count, session timer |
| Dice tower / tactile close-ups | Sound, motion and visually satisfying objects | Minimal result strip; good physical video/audio |
| “What would you keep?” mini lessons | Viewers compare choices and learn | Options, declared odds assumptions if calculated; coaching is an expansion proposal |
| Accessory demonstration during play | Product usefulness shown in context | Clean result strip and disclosed commercial relationship |

Avoid fabricated suspense, claiming a rare outcome is due, or using a small sample to certify fairness. Polyhedral RPG shows remain a later qualification area. Viewer choice is advisory until the authorized player accepts it.

## Overlay and broadcast design

Proposed vertical composition: short goal headline at top, large tray video in the centre, compact confirmed dice/results and two-player score strip, plus host reaction where useful. Keep important information clear of actual TikTok chat/buttons; inspect on a viewer phone. Refresh the premise regularly for newly arriving viewers. Keep detailed eight-player scorecards out of the main composition unless legibility is demonstrated.

Architecture: camera -> recognition/review -> accepted result -> read-only spectator page -> OBS/browser scene composition -> available TikTok broadcast route. Use the INT-004 public-event design for corrections, deduplication, reconnect and publication consent. Manual result entry can test the entertainment format while camera qualification remains open, with source clearly labelled.

TikTok documents portrait/landscape dual layouts in LIVE Studio [T1] and camera sources [T2]; its support material also references LIVE Studio and OBS for desktop LIVE [T3]. Exact stream-key access, link/browser sources, virtual-camera availability, audio routing and device/account compatibility were not verified. Select and test the actual route before promising one-click integration. OBS composition is feasible in principle; a working TikTok broadcast for this account is not established. Recognition-camera input is not automatically a compatible broadcast camera source.

For the first experiment, the host reads comments manually. Do not depend on an unofficial TikTok gift/chat feed as a supported public API. No reliable official gift-event automation contract was established in this research. Confirm platform-supported interfaces before later automation.

## Bounded pilot

Compare three 20–30 minute formats twice each: chat chooses keepers, two-person game with overlay, and a bounded target challenge. Keep host, time slots and production quality reasonably similar; six sessions are exploratory, not statistical proof. Start with manual confirmed results if necessary.

Measure average watch duration, available retention metrics, follows per 100 unique viewers, meaningful comments per minute, returning viewers where available, actual net receipts per live hour, attributable clicks/sales, setup time and correction/intervention burden. Review whether people understand the goal and score without explanation. Change one major format variable at a time. Do not choose the winner solely by gift revenue from a single unusually generous viewer.

Keep participation free and Gifts voluntary. A “pay/gift for a chance to win cash or a product” dice format is outside this experiment and raises platform gambling/promotion issues; TikTok Shop has an explicit gambling policy [T9]. This is a relevant boundary for monetizing random outcomes, not a restriction on ordinary dice-game broadcasting.

## Primary sources checked 1 October 2026

- T1: [LIVE Studio dual layout](https://www.tiktok.com/live/studio/help/article/Enhance-visuals/Use-dual-layout-to-go-LIVE-in-portrait-and-landscape-simultaneously?lang=en).
- T2: [LIVE Studio camera sources](https://www.tiktok.com/live/studio/help/article/Get-started-with-your-first-LIVE/Add-a-camera-source-to-let-viewers-know-you).
- T3: [TikTok LIVE moderation and desktop access](https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/moderating-on-tiktok-live).
- T4: [LIVE Gifts](https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/live-gifts-on-tiktok) and [LIVE overview](https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/what-is-tiktok-live): availability and eligibility apply; confirm in the account.
- T5: [Subscription expansion announcement](https://newsroom.tiktok.com/empowering-creators-and-fostering-communities-with-the-expanded-subscription-feature?lang=en): feature rationale and announced criteria; not evidence this account currently qualifies.
- T6: [TikTok Shop affiliate](https://business.tiktokshop.com/us/affiliate): commissions from videos and LIVE product recommendations; US source, not universal regional eligibility.
- T7: [Commercial disclosure requirements](https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/promoting-a-brand-product-or-service).
- T8: [Creator Rewards](https://support.tiktok.com/en/business-and-creator/creator-rewards-program/how-is-the-creator-rewards-program-different-from-the-tiktok-creator-fund): published eligible video program, separate from LIVE rewards.
- T9: [TikTok Shop gambling policy](https://seller-us.tiktok.com/university/essay?from=policy&identity=1&knowledge_id=10016188&role=1): Shop-specific restrictions, not legal advice or an exhaustive general LIVE policy review.

Research supports possible monetization mechanisms and technical directions. It does not establish that dice content will attract viewers, that any account has feature access, or that revenues will cover production costs.
