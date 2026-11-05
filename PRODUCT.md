# Home Design Studio — Product Spec

Owner: Luke. Status: direction set 2026-11-05. This file is the source of truth
for tiers, the free-tier intake funnel, and the Pro/Owner materials engine.
Nothing here is built yet except the design studio (see README) and the
finish-photo backfill.

## Tiers

| Tier | Who | What they get |
|------|-----|---------------|
| **Free** | Prospects | Upload photos/videos + a short vision note → it becomes an RFQ to Luke. Nothing else. (Lead funnel.) |
| **Pro** | Paying customers (upcharge once selling) | The full design studio (spaces, styles, palette, real-photo finishes, live board) **+ the materials & logistics engine**. |
| **Owner** | Luke | Everything in Pro, plus admin/RFQ inbox, the 3-option generator, outreach, and internal cost/margin views. |

Gate the current studio + the materials engine behind Pro/Owner. Free never
sees them.

## Free-tier funnel (the lead machine)

1. **Upload** photos and/or videos of the space + a brief description of the vision.
2. **Security scan** — every uploaded file is scanned for malicious content before it is stored or shown. (Server-side; see Feasibility.)
3. **AI-generated check** — detect whether an upload is AI-generated. If it is, the user must **declare** that it's AI-generated and confirm they want to **improve their real product** (not submit a fake). Combine a detector + C2PA/EXIF metadata + mandatory self-declaration (detection alone is not reliable — see Feasibility).
4. **RFQ to Luke** — a structured request (files + description + contact) lands in the Owner inbox.
5. **3 options generated** — reuse the design-studio engine to produce 3 distinct style/finish directions for the submitted space.
6. **Outreach + SLA** — reach the customer by any channel and promise the finished options **within 36 hours** of receiving their files + vision.

## Pro/Owner — Materials & Logistics Engine

A **running, live total** as the user designs, broken down and sourced. Luke's
three required outputs plus 20 more I'm proposing:

**Luke's three (required):**
1. Running material total **with sales tax by the material's location** (ship-to / store jurisdiction).
2. **Which lumber / home stores stock each material** nearby, with stock + price.
3. **Fuel/diesel per trip** from the user's vehicle MPG (manufacturer spec) and the store distance.

**20 more (proposed):**
4. **Itemized takeoff** — convert selected finishes + room/exterior dimensions into real buy quantities (boxes of flooring, gallons of paint, linear ft of trim, sheets, fixtures), with an adjustable **waste/overage factor** per material (e.g. +10% flooring, +15% diagonal tile).
5. **Good / Better / Best** product tier toggle per material, each with low–typical–high pricing.
6. **Fees by jurisdiction** — permit fees, dumpster/disposal, delivery — added to the total alongside tax.
7. **Cheapest-basket vs fewest-stops** optimizer across stores (minimize $ or minimize trips).
8. **Weight & volume totals** → does it fit the vehicle? how many loads? payload-aware.
9. **Delivery vs self-haul breakeven** — store delivery fee vs fuel + time of picking up; recommend the cheaper.
10. **Trips needed** — derived from material volume/weight vs vehicle bed/payload capacity.
11. **Labor estimate (optional)** — crew-hours per task × local trade rate; toggle on/off.
12. **Timeline / sequence** — demo → rough-in → finishes, with durations (Gantt-style).
13. **Total roll-up** — materials + tax + fees + fuel/delivery + labor + a contingency %.
14. **Value engineering** — "same look for less": alternative materials that match the palette, with $ saved.
15. **ROI / resale uplift** — estimated value added by the remodel, by region.
16. **Rebate & tax-credit finder** — low-flow fixtures, LED, insulation, efficient HVAC → local utility rebates + federal/state credits.
17. **Tool list + rent-vs-buy** per task, with store tool-rental pricing.
18. **Best-time-to-buy** — lumber/material price trend + seasonality.
19. **Contractor / bulk pricing** eligibility and volume-discount thresholds.
20. **Measurement helper** — estimate room dimensions from the uploaded photos/video to auto-fill square footage (ties the free upload to the paid takeoff).
21. **Multi-room / whole-home** aggregation into one master budget + one shopping run.
22. **Shareable output** — printable/PDF material list + per-store shopping-cart deep links; quote with an expiry date.
23. **Inflation-adjusted pricing** — refresh to today's prices; show "as of" date.
24. **Sustainability score** — material + transport carbon estimate; greener swaps.
25. **Financing estimate** — monthly payment at a given APR/term, clearly labeled an estimate (no lending, no application).

## Internal Material & Quote Library — the "flash response" backbone (Luke 2026-11-05)

An **Owner-controlled internal database** that lets us assemble a full quote the
instant an RFQ lands, instead of computing everything live per request. This is
what makes the 36-hr SLA feel immediate and keeps live-API cost low.

Holds:

- **Materials catalog** — every material/SKU: specs, Good/Better/Best tier, unit, **coverage** (sq ft or lin ft per unit), **waste factor**, low–typical–high price, **weight & volume**, store availability + store SKUs, lead time, the finish photo, sustainability notes.
- **Quote & template library** — reusable **3-option "recipes"** per space × style (seeded from the studio's style defaults), prior quotes, and pre-built material-takeoff bundles keyed to space type + size bands. A new RFQ snaps to the closest recipe, then gets tuned.
- **Pricing & logistics cache** — last-known **store prices**, **tax tables by jurisdiction**, **fuel prices**, **vehicle/MPG table** (by make/model/year), and **store/distance table**. Refreshed on a schedule so quotes build from cache (flash), with only volatile fields (live price/stock/fuel) refreshed on demand.

Role: the materials engine (#1–#25 above) **computes** against this library; the
library **stores, caches, and reuses**. Every finished quote feeds back in, so
the library gets faster and better over time. It is internal/Owner-only — never
exposed to Free users.

## Feasibility — honest flags (verify before promising any to a customer)

- **Malware scanning of uploads** — standard and doable, but needs a **backend + object storage** (the app is static today). Use a real engine server-side (e.g. ClamAV, or a cloud scanning API). Never run user files through the frontend.
- **AI-generated detection** — **not reliable on its own.** No detector is close to 100%, and false positives/negatives are common. The robust design is detector **+** content-credential/metadata checks (C2PA, EXIF) **+** the mandatory self-declaration Luke already specified. Treat the declaration as the source of truth, the detector as a hint.
- **Store stock + price** — the big-box chains have **no fully public real-time inventory API**; this likely needs a data partner, scraping within terms, or manual local-store lists to start. Flag as "best effort / verify in store."
- **Location sales tax, permit/disposal fees** — need a tax-rate source (e.g. a tax API) and per-jurisdiction fee tables; start with Arizona.
- **Fuel cost** — vehicle MPG DB (by make/model/year) + current local fuel price + store distance (a maps/distance API). All feasible.
- **This whole funnel is a backend product** — its own repo already exists (this one); it will need a database, auth, storage, and server-side scanning. Build in chunks.

## Build order (proposed — confirm with Luke)

1. Finish the design studio's real-photo finishes (in progress — drip).
2. Tier gating (Free / Pro / Owner) + a Free upload screen (client only, no scanning yet).
3. Backend: storage + malware scan + AI-gen check + self-declaration + RFQ inbox.
4. 3-option generator + outreach + 36-hr SLA tracking.
5. Materials engine, starting with #1–#4 + #8–#9 (takeoff, tax, stores, fuel, fit/trips), then expand.

No work on 2–5 starts without Luke's go, one chunk at a time.
