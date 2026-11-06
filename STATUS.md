# THE WHOLE — Project Status

Master status of Luke's active projects. Last updated: **2026-11-06**.
Phases: **Foundation** → **Core Prototype / Core** → **Active MVP** (in use) → **Pro/Owner tiers → Launch**.

---

## Example entry (full detail) — Home Design Studio

- **Phase:** Active MVP — **deployed & live.**
- **Live:** https://home-design-studio-fieldvision.vercel.app · **Repo:** github.com/Qwerkees/home-design-studio
- **Core function:** Homeowner-facing interior & exterior design decision app. Pick a space (kitchen, living, bath, bedroom, exterior), a style, palette, and real-photo finishes → live design board, ballpark budget, decision summary / shopping list. Data-driven (`data/finishes.json`), static, auto-deploys on every push.
- **Current status:**
  - App complete, responsive, light/dark, smoke-tested (0 console errors).
  - Real-photo finishes backfilling automatically: **17 / 62 done** (flooring, paint, cabinetry complete; countertops in progress). Drip auto-commits + redeploys; ping Luke at 62.
  - Daily **Yuma + Greater-Phoenix contractor-specials sweep** running (2:00 AM MST, 365/yr) with phone-push summary; first report in `research/`.
- **Next:** Free/Pro/Owner tiers → RFQ upload funnel (scan + AI-gen check + 3 options + 36-hr SLA) → materials & logistics engine + Material & Quote Library → Presentation Canvas, Member Rewards, Drive & Navigate. (Full backlog in `PRODUCT.md`.)

---

## Portfolio

| Project | Phase | Core Technical Function & Capabilities | Current Status |
|---------|-------|----------------------------------------|----------------|
| **Home Design Studio** | Active MVP (live) | Homeowner interior/exterior design decision app: real-photo finishes, live board, ballpark budget, decision summary/shopping list. | **Deployed on Vercel**; finishes 17/62 backfilling; daily AZ contractor sweep live; tiers + RFQ funnel next. |
| **FieldVisionX** | Active MVP | Civil construction project intelligence and traffic control suite: digital drafting, spatial data mapping, quantity takeoffs, predictive compliance tracking. | 7-service stack; DTCP traffic-control chunks merged; PRs #72/#78/#79 merged to `main` today. Deploy uses `imresamu/postgis` on ARM64 VPS; last blocker was a VPS SSH timeout (infra, not code). |
| **ForgeTraffic** | Arizona Active MVP | Temporary traffic control division tool encoding Peoria + ADOT jurisdiction profiles to generate machine-readable compliance checklists and device loading lists. | Active in AZ; jurisdiction profiles encoded (per owner). |
| **MASS-SHOT Surveying** | Integration | Local Windows app for drone quarry mapping, photogrammetry, LAS/LAZ point-cloud grid calculations, and volumetric cut/fill estimation, integrated with WebODM. | Repo `qwerkees/mass-shot` in scope; WebODM integration (per owner). |
| **Offline Quote Tracker & Workbook** | Active Core | Browser-local workbook: standalone HTML templates, localStorage persistence, load-failure protection locks for estimates and quotes. | In use as core estimating/quote workbook (per owner). |
| **EL DIABLO** | Core Prototype | Offline desktop/browser companion: speech, head animations, cursor-following, no cloud APIs. | Prototype; runs fully offline (per owner). |
| **SQLite Multi-Dept Inventory Base** | Foundation | Zero-cost local Python + SQLite foundation: Mexican geographic sites, precise unit management, departmental product allocations. | Foundation laid; local-only, zero-cost (per owner). |

---

*"Current Status" is verified where this session has direct evidence (Home Design
Studio, FieldVisionX); items marked "(per owner)" are Luke's descriptions, not
independently verified here. Update as projects advance.*
