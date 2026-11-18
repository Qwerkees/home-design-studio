# Luke's Home Design Studio — Security & Commercial Readiness Audit

Audit date: 2026-11-18
Audited source ref: `feature/simplified-navigation`
Audited preview commit: `69bb60d3149614e07f96486fb932b4566c59bf67`
Production baseline observed: `main` at `c4281803abd1e40c54b4ea3c770bbda428769830`

## Current verified state

- GitHub repository: `Qwerkees/home-design-studio` (currently public).
- Vercel project: `home-design-studio`.
- The newest inspected deployment is a READY preview from `feature/simplified-navigation`; it is not the production deployment.
- Production remains on `main`. Do not treat preview READY as a production release.
- The app is a static, data-driven design planner with local-browser persistence, a 357-finish catalog on the observed production baseline, English/Spanish interface strings, and a Free photo/video request funnel.
- The repository contains Node's built-in test runner suite (`node --test tests/*.test.js`).

## Release blockers / high-priority findings

### 1. Customer media is currently public-link storage

The Free upload flow uses the Vercel Blob client upload SDK. Its upload authorization route allows media types and size limits, and the shared server helper accepts only `*.public.blob.vercel-storage.com` URLs. Public Blob URLs are readable by anyone who has the URL. The Free page currently describes files as securely stored and says they are never posted publicly; that wording is stronger than the actual access model.

**Required decision:** use a private-storage architecture for customer photos/videos, or obtain explicit, informed consent that the files are stored as public-link media. Do not describe public-link storage as private.

Vercel documents private Blob stores for sensitive user content. Private delivery requires authenticated server-side access through a Function. The present direct client-upload path must be redesigned and tested against the current SDK's private-upload capabilities before promising private media.

References:
- https://vercel.com/docs/vercel-blob/private-storage
- https://vercel.com/docs/vercel-blob/security
- https://vercel.com/docs/vercel-blob/client-upload

### 2. RFQ metadata is also written with public access

`api/rfq.js` stores the RFQ JSON with `access: 'public'`. It contains contact details, notes, and media references. Encryption is optional in `.env.example`; without a valid `LDS_DATA_KEY`, the JSON is plaintext at a public URL. Random suffixes make URLs harder to guess but do not make public objects private.

**Required fix:** move RFQ records to a private store and retrieve them only through an authenticated owner/admin path. If any temporary public-store design is retained, encryption must be mandatory and fail closed on a missing or malformed key; this is a temporary mitigation, not a substitute for private access control.

### 3. Automated scanning is optional, not guaranteed

`api/_lib.js` calls VirusTotal only when `VIRUSTOTAL_API_KEY` exists and calls Sightengine only when its credentials exist. Without those credentials, files are marked unscanned / unchecked and require manual review. AI-generated detection is a probabilistic signal, not proof of provenance.

**Required fix:** make the review state explicit in the owner workflow, show scan status per file, and never imply that every upload has been scanned. Keep manual review as the fallback.

### 4. Public repository visibility

GitHub currently reports this repository as public while `package.json` says `UNLICENSED` and the README describes the project as proprietary. This does not automatically grant reuse rights, but it exposes the source to public viewing. Repository visibility should be reviewed before commercial launch. Do not change visibility without owner approval.

### 5. Vercel deployment protection needs an external access test

The Vercel project reports SSO protection enabled for `all_except_custom_domains`. The user-facing `*.vercel.app` addresses may therefore require team authentication. Test the production and preview URLs in a signed-out browser before treating them as public customer links. Do not change protection settings without owner approval.

### 6. Commercial foundations are not implemented yet

The current app has no customer authentication, cloud-synced projects, tenant isolation, subscription billing, entitlement enforcement, or monthly/annual plan lifecycle. User selections currently persist in localStorage only.

## Recommended implementation sequence

1. Resolve media and RFQ privacy architecture before collecting real customer submissions.
2. Add an owner-only RFQ inbox with authentication, authorization, audit trail, retention/deletion controls, and safe file delivery.
3. Add automated tests for upload authorization, malformed/missing encryption keys, file verification, rate limits, owner-only access, and data deletion.
4. Run the full existing test suite and browser-based acceptance tests on the preview deployment.
5. Add commercial architecture without activating paid billing: plan catalog, feature-entitlement service, usage counters, subscription state machine, cancellation/grace-period handling, and billing-provider adapter. Keep the Free tier useful; define monthly and annual paid plans. No provider connection or charge until explicitly approved.
6. Add account-backed project save/share, PDF export, and clear privacy/retention controls.
7. Verify signed-out access, mobile layouts, accessibility, and error handling; then request approval before production promotion.

## Guardrails

- Do not add paid services, enable paid upgrades, or create billable resources without approval.
- Do not put secrets or customer data in the browser bundle or Git repository.
- Keep this application independent from other apps: its own repository, storage, credentials, deployment, and customer records.
- Keep the production branch untouched until the preview passes security and functional checks.
- Preserve the homeowner-facing design workflow and the existing finish catalog while improving the underlying architecture.


## Implementation progress on `audit/privacy-commercial-readiness`

The following changes have been committed on this branch and opened as draft PR #31:

- Browser uploads request `access: 'private'`; the token endpoint restricts paths to the `uploads/` folder and retains the existing file-type and size limits.
- The server verifies private Blob objects using authenticated SDK reads and magic-byte inspection.
- RFQ JSON is written with `access: 'private'`; malformed optional encryption keys now fail closed.
- Owner webhook messages contain only RFQ ID, space, and file count — no name, contact details, notes, or media URLs.
- A single-owner inbox is implemented at `/admin` with password login, signed eight-hour HttpOnly/Secure/SameSite=Strict sessions, owner-only RFQ listing, and authenticated media streaming.
- Owner authentication requires `LDS_ADMIN_PASSWORD` (16+ characters) and `LDS_SESSION_SECRET` (32+ characters) in Vercel Environment Variables. No values are stored in GitHub.
- Private media is not sent to URL-based third-party scanners. The UI explicitly says that automated malware and AI-image checks are not enabled; manual review is required.
- CI was expanded to test this branch and syntax-check all API routes.

## Still required before accepting real customer requests

1. Connect a Vercel Blob store configured for **private access** and confirm the existing project environment variable points to it. No store was created or changed in this work.
2. Configure the two owner-inbox secrets and optionally a separate encryption key in Vercel Environment Variables.
3. Confirm the Vercel SDK client-upload flow creates private blobs in the connected private store; test a real upload, server verification, RFQ persistence, inbox listing, and authenticated media viewing.
4. Re-run and confirm the complete GitHub Actions test suite on the latest branch commit. The first CI run exposed five test failures; the affected tests were revised, but a clean post-fix CI result has not yet been observed.
5. Verify the preview in a signed-out browser and on a mobile device.
6. Review and merge PR #31 only after those checks. Production has not been modified.
