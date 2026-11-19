# Luke's Design Studios — Product Specifications
Version 0.1 | Data-driven design app; RFQ intake security gate required | 2026-11-18

## Product purpose
A guided home/interior design application for exploring spaces, styles, palettes, finishes, indicative budgets, and project summaries/request-for-quotation drafts.

## Verified repository baseline (README)
- Static, data-driven app with catalog JSON, assets, and localStorage.
- Vercel deployment described.
- RFQ upload uses Vercel Blob and optional AES encryption.
- README states malware scanning and AI-generated-content detection are not machine-performed; self-declaration and manual review are used.
- Budget estimates are indicative, not supplier quotes.
- The prior light/dark theme was removed. `styles.css` no longer contains a dark-theme selector; the Theme toggle was removed from `index.html` and `app.js` now clears the legacy saved theme and initializes light mode only.

## UX requirements
Simple for older and less technical users: one screen, one purpose, one obvious next step; large labeled cards; flat navigation; clear Back/Home/Next controls; visible choices and budget assumptions; responsive layouts and keyboard/focus support.

## Functional requirements
1. Browse rooms/spaces, styles, palettes, finishes, and design components.
2. Save selections locally and export/share readable project summaries.
3. Calculate transparent ballpark budgets from versioned assumptions.
4. Prepare RFQ drafts without submitting or committing the customer.
5. Label uploaded files, declarations, and manual review status accurately.
6. Support customer-specific catalog/branding without mutating core product data.

## Security and privacy
RFQ intake must remain paused/fail-closed until storage access controls, encryption, scanning, retention, deletion, and authorization are independently verified. Never claim scanning/detection not implemented. Restrict upload types/sizes; use private storage and controlled access. Keep customer floor plans, photos, addresses, and quotes out of Git.

## Acceptance criteria
Core flow works on supported mobile/desktop browsers; selections persist/export; budgets expose assumptions; RFQ upload is inaccessible to unauthorized users and passes security review before activation; every screen/dialog/menu/loading state is light-only.

## Roadmap (proposed)
Accessible guided mode; verified catalog; versioned pricing; secure RFQ; supplier integrations; customer project accounts.

## CUSTOMER-SPECIFIC REQUIREMENTS
| Field | Customer input |
|---|---|
| Customer / Organization | |
| Primary Contact | |
| Contact Information | |
| Business Requirements | |
| Requested Features | |
| Custom Integrations | |
| Branding / White-labeling | |
| User Roles and Permissions | |
| Security / Compliance Requirements | |
| Hosting / Deployment Requirements | |
| Budget / Contract Reference | |
| Delivery Schedule | |
| Acceptance Criteria | |
| Special Instructions | |
| Customer Approval / Sign-off | |

Customer plans, floor plans, photos, addresses, and quotations are confidential; use a private customer workspace.

## Revision history
| Version | Date | Change | Approval |
|---|---|---|---|
| 0.1 | 2026-11-18 | Initial baseline; RFQ and theme risks recorded | Pending |

## Global owner standards
Light-only UI; transparent estimates; privacy-first intake; no paid services/upgrades without owner approval.

## Light-only UI correction
The prior theme switch and dark palette were removed from `index.html`, `app.js`, and `styles.css`. The application now initializes in light mode only. The deployment for the final theme-toggle removal commit reached READY; full browser interaction testing remains outstanding.
