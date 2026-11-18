# LUKE'S Design Studio

A homeowner-facing **interior & exterior design decision** app. Pick a space
(kitchen, living room, bathroom, bedroom, or the exterior), choose a style,
tune the palette and finishes from **real-photo swatches**, and walk away with a
live design board, a **ballpark budget**, and a **decision summary / shopping
list** you can hand to a contractor.

No build step, no framework — a static site that reads its catalog from
`data/finishes.json`. Deploys anywhere (Vercel, Netlify, S3, GitHub Pages).

## Run it locally

It fetches `data/finishes.json`, so serve it over HTTP (don't open the file
directly):

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL.

## Project layout

```
index.html            App shell
styles.css            Tokens, light/dark themes, layout
app.js                Logic — reads data/finishes.json, renders, costs, summary
data/finishes.json    The catalog: spaces, styles, categories, finishes  ← edit this
assets/
  rooms/              Room/exterior photos used on the space cards
  finishes/           Real-photo finish swatches (one file per finish)
vercel.json           Static-deploy config
```

## Editing the catalog (no code needed)

Everything the app shows comes from `data/finishes.json`:

- **Add or change a finish** — edit the relevant array under `finishes`. Each
  option is `{ "id", "label", "img"?, "color", "lo"?, "hi"? }`.
  - `img` — a file in `assets/finishes/`. When present, the swatch shows that
    **real photo**. When absent, it falls back to the `color` chip (hex or any
    CSS gradient).
  - `lo` / `hi` — dollars per square foot, for area-priced categories
    (flooring, paint, siding, roof). Other categories price from the
    category's `base` range scaled by project size.
- **Upgrade a chip to a photo** — drop a square image in `assets/finishes/`
  and set that finish's `img` to the filename. No code change.
- **Styles** — each entry under `styles` has a 5-color `colors` palette and a
  `defaults` map (one finish id per category) that seeds a room when the style
  is picked.

## Imagery status

- **Rooms (5):** real photos — kitchen, living room, bathroom, bedroom, Southwest exterior.
- **Finishes:** flooring has 4 real-photo textures (oak LVP, wide-plank oak,
  walnut, porcelain). The rest currently show clean color/gradient chips and
  are **ready to be swapped** for real photos (set each finish's `img`).
- Photos are generated with an image model and committed as files here so they
  stay editable/replaceable. Generating the full set is gated on image-service
  credits.

## Roadmap

- Backfill real-photo swatches for every finish (paint, cabinetry, counters,
  fixtures, textiles, siding, trim, doors, roof, garage, landscaping).
- **AI visual preview** — render the chosen style + finishes onto a room/home
  image (needs a small backend to call the image model; keep keys server-side).
- Save / share a plan (shareable link, PDF export of the decision summary).
- Brand skin + lead capture, if used as a remodel-service front door.

## Notes

- Ballpark figures are rough **Arizona, 2026** planning ranges (materials +
  typical install) — not a quote. Always confirm with a local contractor bid.
- Per-viewer choices persist in `localStorage` only.

---
© 2026 Salvador Alcantar. Proprietary — see `LICENSE`.

## Free-tier upload → RFQ funnel

`/free` (`free.html` + `free.js`) lets a homeowner upload photos/videos of a
space and request 3 design options back within 36 hours — no account.

- **Front end:** static page; files upload **client → Vercel Blob** (so large
  videos bypass the serverless body limit), authorized by `/api/blob-upload`.
  A mandatory self-declaration ("real and mine, not AI-generated") gates submit.
- **Back end (Vercel serverless, `/api`):**
  - `api/blob-upload.js` — mints a scoped **private** Blob upload token (type + 75 MB cap).
  - `api/rfq.js` — verifies private uploads server-side, stores the RFQ in a
    **private** Blob object (`rfqs/<id>.json`), and sends a minimal owner ping.
  - `api/_lib.js` — validates private Blob paths, inspects file magic bytes,
    rejects malformed encryption keys, and strips customer PII from webhooks.
  - `/admin` — single-owner inbox protected by a signed HttpOnly session; it
    lists RFQs and streams private media only after owner authentication.
  - `api/admin/*` — password login, logout, RFQ listing, and authenticated
    private-media delivery.
- **Config** (`.env.example`): connect a Vercel Blob store configured for
  **private access** and set `BLOB_READ_WRITE_TOKEN`; optionally set
  `RFQ_NOTIFY_WEBHOOK` for a minimal ping, `LDS_DATA_KEY` for extra AES-256-GCM
  encryption, `LDS_ADMIN_PASSWORD` (16+ characters), and `LDS_SESSION_SECRET`
  (32+ characters) for the owner inbox. A public-only Blob store is not an
  acceptable fallback.

**Honest status:** uploaded files and RFQ records are designed for private
storage; the project still needs a connected private Blob store and an
private Blob store and owner-inbox secrets configured before real customer
submissions should be accepted. URL-based VirusTotal and Sightengine checks are deliberately
not sent private customer files; they remain queued for manual review. The
customer page states that automated checks are not enabled.
