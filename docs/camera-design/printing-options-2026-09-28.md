# Prototype printing comparison — 28 September 2026

Recommendation: use **black MJF PA12/PA12S nylon** for the best balance of appearance and functional strength; use **black PETG FDM from a local shop** for the lowest practical cost and quicker iteration. A same-week local delivery must be confirmed by the printer; no local business has supplied a quote or committed a date yet.

## Process choice

MJF nylon has a consistent, slightly granular matte surface. PA12S is intended to improve surface appearance. It suits housings and mechanical parts, with less directional strength variation than typical filament printing. It is not automatically a smooth injection-molded finish; optional vapor smoothing costs extra and requires review of sliding fits. See [HP's material portfolio](https://www.hp.com/us-en/printers/3d-printers/materials.html), [JLC3DP PA12S specifications](https://jlc3dp.com/help/article/pa12s-hp-nylon) and [Craftcloud's MJF guide](https://craftcloud3d.com/en/material-guide/hp-mjf-nylon-pa12).

PETG is an inexpensive, tough material used for holders and mechanical components. Expect visible layer lines and a more glossy surface. For this design, mast/pivot orientation and bolt tightening matter more than decorative fine layers. The supplied upright mast orientation should be reviewed for bending strength by the print shop. Four perimeters, 0.20 mm layers and 30% infill are quote starting points, not validated load specifications. [Prusa material guidance](https://help.prusa3d.com/article/petg_2059).

For this first load-bearing assembly I would select one of those thermoplastics rather than choose ordinary resin purely for appearance. Do not order the two optical diffusers in opaque black; use the specified cut diffuser sheet separately. Standard MJF material/accuracy is not a substitute for fitting the mast: JLC3DP advertises ±0.3 mm for dimensions within 100 mm, while the base socket has only 0.3 mm nominal clearance per side. Supplier review and a fit trial remain necessary.

## Price basis — estimates, not quotes

The actual CAD manifest contains 12 structural parts totaling **492.335 cm³**. Adding the fit coupon produces **13 files / 498.627 cm³**. The two optional diffusers are excluded. At an assumed PETG density of 1.27 g/cm³, a completely solid print would contain approximately 633 g before support material. Infill can reduce this, but many walls are thin enough to be mostly perimeters. An unsliced allowance of **500–750 g including supports** is useful for budgeting, not a measured print weight.

One US service publishes PETG rates of **$0.10–$0.18/g**, yielding a material-based service benchmark of **$50–$135** for that allowance. Allowing for setup/cleanup and possible shipping, use **$75–$175 before tax** as a provisional budget. This is my estimate using published rates, not a quote from a Huntsville shop. [Published rate benchmark, LayerSlayers3D in Nevada](https://layerslayers3d.com/). A local complete-set PETG offer around $100–$150 with support removal and an acceptable pickup date would be worth considering; that is a buying target, not an advertised local price.

There is **no verified exact MJF price yet**. JLC3DP's advertised “from $1” is a minimum promotional starting price, not the price of this device. Its calculator requires the actual files. At the time of writing, upload permission has been requested but the files have not been transmitted. No order, account creation, shop message or payment has been made.

## Huntsville shortlist

| Provider | Verified offering / contact | Cost and speed assessment |
|---|---|---|
| [3D By Design](https://3dbydesignllc.com/) | Huntsville business advertising a print farm and multimaterial printing. [Contact form](https://3dbydesignllc.com/pages/contact). | My first local quote candidate. No public project price, PETG stock confirmation or promised turnaround found. Request total and a pickup date. |
| [Hot Nozzle 3D Printing and Prototyping](https://hotnozzleprinting.com/) | Huntsville FDM/resin business; brayden@hotnozzleprinting.com. Advertises 8 inch width and 10 inch height. | Second local quote candidate. Price/date require response. The 210 mm tray support exceeds advertised 203.2 mm width in its supplied orientation; shop must confirm fit/orientation before acceptance. |
| [Huntsville 3D Printing](https://huntsville3dprinting.com/) | Advertises FDM, SLS and other industrial processes; [contact](https://huntsville3dprinting.com/contact/), 256-715-3270. | Worth comparing for professional nylon. No published job price or firm lead time found; public contact page says areas served but does not establish a walk-in production/pickup address. Confirm local pickup and production location. |
| [Huntsville–Madison County Public Library](https://hmcpl.org/node/591) | PLA only. Free filament printing while supplies last; oversized jobs charged $0.03/g above 75 g. Library/guest card required. | Best published local bargain for the small fit coupon, likely free subject to acceptance. Limit: two regular jobs or one >75 g job/month; projects over eight hours may not be printed. Up to seven days requested, no guarantee. Poor fit for a fast 13-part functional PETG order. Never permit automatic scaling of these mechanical parts. |
| [The Shop HSV](https://theshophsv.org/Become-A-Member) | Makerspace, 3305 Governors Drive SW; 256-479-5320. | $100/month, initial three-month commitment and orientation. At least $300 membership commitment, before any unconfirmed materials/access charges. Useful for repeated hands-on development; not the best one-off bargain. |

[American Filament's factory outlet](https://americanfilament.us/pages/local-store) is at 4315 Spartacus Dr SW, 256-489-1155. Its current official site confirms the outlet, but I did not verify a current contract-printing service or price there. It is a possible local referral, not a quoted production option. I did not use the old Rocket City 3D marketplace price as a current verified local quote. Generic city-targeted web pages should not be mistaken for local pickup facilities.

## Online comparison and timing

- [JLC3DP PA12S MJF](https://jlc3dp.com/help/article/pa12s-hp-nylon): advertised production from 72 hours, excluding shipping and exceptions. Current [holiday notice](https://jlc3dp.com/news/jlc3dp-september-october2026-holiday-schedule) closes factories October 1–4, 2026 and resumes production/dispatch October 5. Do not assume a three-day delivered turnaround for an order on September 28. Exact cost, shipping, taxes/import charges and dates remain unquoted.
- [Craftcloud](https://craftcloud3d.com/en/material-guide/hp-mjf-nylon-pa12): useful comparison marketplace for US-supplied nylon to avoid the overseas holiday, but file-based quotes and supplier-specific delivery dates are required. No quote obtained or files uploaded.

The lowest **verified published local price** is the library's limited PLA service. The best **practical value candidate for the whole device** is local PETG, conditional on a competitive quote and promised date. The best **finish/strength choice** is MJF PA12/PA12S, conditional on price, tolerance review and lead time. There is not enough evidence yet to declare a cheapest complete-set supplier.

## Ready-to-quote package

Use [print-quote-brief.md](../../hardware/dice-vision-v1/print-quote-brief.md) and `hardware/dice-vision-v1/dice-vision-print-quote.zip`. The ZIP contains only 13 print STL files, the part manifest and the brief; no tray, electronics solids or opaque diffuser request. Quote one set at original scale and obtain a total including setup, support removal, finishing, tax and delivery/pickup. Request a committed date and ask the supplier to review orientation and mating tolerances before ordering.
