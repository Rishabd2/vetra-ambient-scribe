# PROGRESS — Ambient Dashboard Implementation

Ledger: one line per completed task. On restart, read this FIRST and resume from the next unchecked task. Never restart from A0.

Dev server: `npm run dev` → http://localhost:5173/ (Vite auto-port; plan said 5180 but Vite picked 5173).

## Phase A — UI (mock-first)
- [x] A0 — baseline: git init, branch `ambient-dashboard`, npm install, dev server verified (Overview + nav render, no errors)
- [x] A1 — rebrand shell: Urbana Paws / Dr. Martinez, 9-item nav (Dashboard/Inbox/Calendar/Clinic Timeline/Patients/Doctor Notes/Follow-ups/Analytics/Settings), ComingSoon placeholders. Verified in browser, 0 JS errors.
- [x] A2 — mock visits: src/mock/visits.js with Bella (dog wellness, live, 26 lines), Max (cat abscess, draft, new patient), Duke (frenchie, reviewed). MOCK_ANSWERS + answerFor(). node import verified.
- [x] A3-A7 — Doctor Notes (built together; store lifted FIRST to avoid churn — reorder noted). src/pages/DoctorNotes.jsx: two-col list (Cases & Calls / Live Call Transcripts), streaming transcript (1.5s/line), in-call Q&A box (keyword-grounded), End call→shimmer→SOAP (5 sections + "Generated from transcript"), Draft→Approve→Reviewed, PDF(print). Visit state + actions in App store (endVisit/approveNote/askQuestion/resolveAnswer/approveInvoice/updateInvoiceLine/toggleFollowup/selectVisit). Verified full flow in browser, 0 JS errors. NOTE: browser_click races with streaming re-render (refs remap); JS .click() confirms handlers fire correctly — cosmetic test-harness issue only.
- [x] A8 — Patient cards: src/pages/Patients.jsx reworked to patient tiles (derived from visits, NEW tag), detail view with problem/med/allergy chips, 4 tabs (overview/notes/invoices/follow-ups), visit history w/ Open note→. Legacy call-memory table retained below. Verified Bella/Max/Duke tiles + Max detail in browser.
- [x] A9 — Invoice: src/pages/Invoice.jsx, SOAP-derived line items with "from {section}" source tags, editable qty/price while draft, subtotal/tax/total, Approve & Finalize → Finalized badge persists. Verified Max invoice ($174.96) + finalize.
- [x] A10 — Follow-ups: FollowUps.jsx prepends "From today's visits" section (7 tasks from Bella/Max/Duke SOAP plans, checkbox toggle w/ strike-through via toggleFollowup), keeps existing "Automated messaging sequences". Verified toggle in browser, 0 JS errors.

## Phase B — Backend
(pending Phase A)

## Metrics / notes
- (log blocked tasks, tool-call overruns, and metric readings here)
