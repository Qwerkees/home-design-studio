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

## Companion materials — "also needed to install this" (Luke 2026-11-05)

Every primary finish in the main quote auto-attaches its **recommended companion
materials** — the consumables, substrates, trims and hardware needed to actually
install it — each with a one-line description of why. They roll into the running
total as a separate "install / also needed" line group, so nothing is forgotten
and the quote is job-complete, not just the headline material. Stored in the
Material & Quote Library as `companions` on each catalog material
(`{ item, why, unit, qty_rule }`), so a quote assembles them instantly.

Starter set (expand in the library):

- **LVP / laminate flooring** → underlayment (moisture + sound barrier), transition strips (room-to-room / flooring changes), quarter-round or T-molding (edge trim), spacers + tapping block (install), flooring adhesive (only if glue-down).
- **Tile flooring** → thinset mortar, grout, cement backer board, waterproof membrane (wet areas), tile spacers, penetrating sealer.
- **Hardwood flooring** → vapor barrier/underlayment, cleats/staples or adhesive, wood filler, reducers/transitions, finish + sealer (if site-finished).
- **Polished concrete** → densifier, sealer, optional stain.
- **Wall paint** → primer, painter's tape, drop cloths, roller frames + covers, brushes, spackle/patching compound, sandpaper, paintable caulk.
- **Cabinetry** → cabinet screws, shims, filler/scribe strips, toe-kick, knobs/pulls, optional under-cabinet lighting, silicone.
- **Countertop (stone/quartz)** → adhesive/epoxy, color-matched seam filler, stone sealer (natural stone), support brackets, sink/faucet cutout, optional backsplash.
- **Fixtures / hardware** → braided supply lines, shutoff valves, plumber's tape + putty, mounting hardware, caulk.
- **Siding** → house wrap / weather barrier, flashing, fasteners, trim, sealant, starter strip, primer (if paint-grade).
- **Roof** → underlayment, drip edge, flashing, ice-and-water shield, ridge cap, fasteners, ventilation.
- **Front door** → weatherstripping, threshold/sill, shims, lockset/hardware, exterior sealant.
- **Landscaping (xeriscape)** → weed-barrier fabric, edging, gravel/decomposed granite, drip irrigation, soil amendment, plants.

Each companion also carries its own price, tax, store availability and weight, so
it feeds the totals, store-stock, fuel and trips math like any primary material.

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

## Presentation Canvas — framed gallery view (Owner, Luke 2026-11-05)

Owner-only. Present a design to the client on a **canvas-like board**: each
option (room/exterior render + palette + chosen finishes) is shown inside a
**gallery/canvas frame** — matted, framed-art look, like prints hung on a wall —
rather than a plain web card. The **3 generated options render as three framed
canvases** side by side, which is exactly what the client sees in the RFQ
response and the 36-hr deliverable.

- Each canvas = framed render + a caption strip (style name, palette chips,
  headline finishes, ballpark total).
- Toggle frame styles (gallery white mat, thin black, natural wood) and
  wall/background so it reads as a real presentation board.
- Optional v2: a free-arrange canvas workspace (drag, zoom, pin swatches +
  notes) where the Owner composes the board before sending.
- Export the board to image/PDF for sending by any channel.

Build it as its own view gated to the Owner tier; it reuses the existing
render + palette + finish data, so it's presentation on top of what's already
there, not new data.

## Member Rewards (Luke 2026-11-05)

A **"Member Rewards" button**. The user joins by providing a **telephone
number**, which is the membership key. Rewards: points/credits toward a project,
**referral bonuses**, repeat-customer discounts, early access to options. The
phone number ties a member to their RFQs/quotes and enables status texts (quote
ready, reward earned).

- **Compliance (required):** explicit opt-in / consent before any SMS (TCPA), clear terms, easy STOP/opt-out. Use a real SMS provider (e.g. Twilio). Store the number securely server-side — never in client code or logs.
- Works across tiers as a lead + retention hook; the rewards ledger lives in the Owner backend.

## Owner Studio Generator — always-on image/video (Luke 2026-11-05)

Owner-only, available **24/7/365**: an internal "canvas-like" **image + video
generator** built into the Owner app, so Luke can produce room renders, finish
photos, option boards, and promo videos anytime — **not** dependent on an
interactive sign-in or Canva's per-window trickle.

- **What "always on" requires:** a **server-side generation service with a stored API key** (an image + video model API — e.g. a Gemini / OpenAI image API for stills, fal.ai / Replicate for video). A server key runs without any browser login, which is the whole point. The interactive IMG.LY sign-in (and Canva's quota) can't deliver 24/7 on their own.
- **Honest cost flag:** these APIs are **metered — pay per generation.** Making it truly always-on needs Luke's API key + a budget (or a genuinely free tier where one exists). Keys stay server-side, never in the app. This decision is Luke's (spend), per the $0-spend rule.
- This same service becomes the engine behind the free-tier **3-option generation** and the **Presentation Canvas** renders — one generator, used everywhere.

## Project Improvement Videos — 5 credible picks (Luke 2026-11-05)

Alongside the options, show **5 credible, highly-rated videos** matched to the
**specific area/project the customer wants to improve** (derived from their
uploaded photos/video + vision note, or the chosen space/scope). Think: for a
kitchen refresh, the 5 best-reviewed kitchen-remodel / how-to / inspiration
videos; for a stucco exterior, the top exterior-refinish videos.

- **"Credible / highly rated"** = reputable channels + strong engagement
  (views, like ratio), relevance-matched to the project type and the chosen
  finishes — not random results.
- Serves as inspiration, how-to, and trust-building in the RFQ response and the
  Pro/Owner project view.
- **Source:** YouTube Data API, filtered by relevance + view/like thresholds +
  an allowlist of reputable channels; cache the picks per project type in the
  Material & Quote Library so they load instantly and can be hand-curated.
  Honest flag: the API has a daily free quota and ranking needs tuning to keep
  "credible," so start with a curated list per common project type and layer
  the live search on top.

## Agentic Contractor & Specials Sweep — Yuma / Phoenix (Luke 2026-11-05)

A **scheduled agentic sweep** that scans the web for **licensed contractors in
Yuma, AZ and the Greater Phoenix metro area** (Phoenix + Mesa, Scottsdale,
Tempe, Chandler, Gilbert, Glendale, Peoria, Surprise, Avondale, Goodyear, Queen
Creek and nearby suburbs) running **current specials/promotions** in
Luke's lines of work (interior & exterior remodel, flooring, paint, cabinetry,
countertops, tile/stone, roofing, doors/windows, landscaping/xeriscape).

- **Purpose:** competitive intelligence (what others are promoting and at what
  price) + sourcing (partner subs, and material/store specials Luke can pass
  into quotes).
- **License check:** verify against the **Arizona ROC (Registrar of
  Contractors)** public license lookup — flag each as verified-active,
  verified-inactive, or unverified.
- **Output:** a structured report (company, city, ROC # + status, services,
  the exact current special, rating/reviews, source URL, date seen) cached in
  the Material & Quote Library and **refreshed daily at 2:00 AM America/Phoenix
  (Arizona time, no DST), 365 days a year** via a scheduled agent.
- **Flags:** specials are volatile (always date-stamp + re-verify before using
  one); respect each site's terms when gathering; the ROC lookup is the source
  of truth for licensing.

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
