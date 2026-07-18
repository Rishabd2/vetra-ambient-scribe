# Vetra Ambient-Visit Dashboard — Implementation Plan

> **For the implementing agent:** Execute tasks strictly in order, one at a time. After each task: run the verification step, commit, and STOP touching that task. Do not refactor previous tasks unless a verification step fails. Full guardrails in §0.

**Goal:** Rebuild the Vetra dashboard so a live vet visit call streams a transcript, supports mid-call Q&A, and on call-end auto-generates a SOAP note, patient card update, follow-ups/to-dos, and an invoice — each as a Draft the vet approves.

**Architecture:** Extend the existing Vite + React + Tailwind SPA (`src/`). UI phase runs 100% on mock data from a single store; backend phase swaps mocks for Vapi live calls + one `/api/generate` route. No new framework, no router lib (keep the existing view-state pattern), no state library (keep prop-drilled store).

**Tech stack:** React 18, Vite, Tailwind (already configured), existing `src/ui.jsx` primitives (Card, SectionLabel, Avatar). Backend phase: Vercel serverless (`api/`), Vapi Web SDK, one LLM call via `api/generate.js`.

**Repo:** `/Users/rishabdoshi/Downloads/vetra_ringg_hackathon-main`

---

## 0. Agent guardrails (read before Task 1)

These exist so the run doesn't loop or burn tokens.

1. **One task per turn-cycle.** Finish task N (code → verify → commit) before reading anything for task N+1.
2. **Read budget:** before each task, read ONLY the files listed in that task's "Files" block. Never re-read `data.js` (874 lines) or `App.jsx` in full more than once — after first read, use `search_files` with a narrow pattern to find line anchors.
3. **No screenshot-chasing.** Match the described layout, not pixel perfection. Do not iterate on styling more than twice per component.
4. **Loop breaker:** if the same error occurs 3 times, STOP, write the error + attempted fixes into `PROGRESS.md`, and move to the next independent task.
5. **Verification is binary.** Each task has a "Verify" line. If it passes, commit and move on. Do not add extra polish, extra props, extra abstractions (YAGNI).
6. **Progress ledger:** append one line per completed task to `PROGRESS.md` (`Task N done — <commit sha>`). On session restart, read `PROGRESS.md` FIRST and resume — never restart from Task 1.
7. **Never run `npm run build` per task** — `npm run dev` hot-reload + a browser check is enough. Build once at the end of each phase.
8. **Mock data is canonical during Phase A.** Do not wire any network call until Phase B. If tempted to "just add the API now," don't.
9. **Token ceiling per task:** if a single task exceeds ~15 tool calls, stop and log it in PROGRESS.md as blocked; do not brute-force.

---

## Phase A — UI (mock-data first, fully demoable without any backend)

### Task A0: Baseline + branch

**Files:** none (terminal only)

- `cd /Users/rishabdoshi/Downloads/vetra_ringg_hackathon-main && git checkout -b ambient-dashboard && npm install && npm run dev`
- **Verify:** app loads at http://localhost:5180, existing Overview renders.
- Commit nothing yet; create `PROGRESS.md` with a header line. Commit: `chore: progress ledger`.

### Task A1: Rebrand shell

**Objective:** Urbana Paws Clinic + Dr. Martinez, new nav order.

**Files:**
- Modify: `src/App.jsx` (sidebar block ~lines 274-315, header ~320-344, NAV ~27-34)
- Modify: `src/data.js` (CLINICS ~line 4)

**Steps:**
1. Sidebar title → `Vetra / Urbana Paws Clinic`; footer user → `Dr. Martinez / Veterinarian`, avatar initials `DM`.
2. Header subtitle → `Urbana Paws Clinic · {date}`.
3. NAV array → `dashboard (Overview reused), inbox (Calls reused), calendar, timeline (placeholder), patients, notes (NEW Doctor Notes), followups, analytics (placeholder), settings (placeholder)`. Placeholders render `<ComingSoon label/>` (10-line component in `src/ui.jsx`).
4. **Verify:** all nav items click without console errors.
5. Commit: `feat: rebrand shell + new nav`.

### Task A2: Mock visit data module

**Objective:** One canonical mock file powering every new screen — the two vet-native demo encounters.

**Files:**
- Create: `src/mock/visits.js`

Shape (this is the contract every screen consumes — do not deviate later):

```js
export const MOCK_VISITS = [
  {
    id: 'v-bella',
    status: 'live',            // live | draft | reviewed
    startedAt: '2026-07-18T10:02:00',
    patient: {
      id: 'p-bella', name: 'Bella', species: 'Dog', breed: 'Golden Retriever',
      age: '5y', sex: 'F/S', weight: '65 lbs', isNew: false,
      owner: { name: 'Sarah Johnson', phone: '+1 (217) 555-0142' },
      problems: ['Subcutaneous lipoma R shoulder'], medications: [], allergies: [],
    },
    visitType: 'Annual checkup & vaccination',
    doctor: 'Dr. Martinez',
    transcript: [ ['DR','Good morning Sarah, how has Bella been?'], ['OWNER','Great, though I found a small lump near her right shoulder…'], /* ~30 lines total */ ],
    qa: [],                     // {q, a} pairs appended by the Ask box
    soap: {                     // null while live; filled on "end call"
      summary: '…', subjective: ['…'], objective: ['Vitals WNL (HR 80, RR 20, T 101.2°F)','BCS 5/9','…'],
      assessment: ['Healthy adult dog','Lipoma R shoulder — monitor'], plan: ['DHPP + rabies boosters today','Recheck lump in 2 weeks','…'],
    },
    followups: [ { id:'f1', label:'Recheck lump', owner:'Dr. Martinez', due:'2026-08-01', channel:'SMS', done:false } ],
    invoice: {
      status: 'draft',          // draft | finalized
      lines: [ { desc:'Wellness examination', code:'SNOMED 448337001', source:'Plan', qty:1, price:65 },
               { desc:'Rabies vaccination',   code:'CVX 90',           source:'Plan', qty:1, price:28 }, /* … */ ],
      taxRate: 0.08,
    },
  },
  { id: 'v-max', status: 'draft', /* cat, limping on front left leg — full second encounter */ },
  { id: 'v-duke', status: 'reviewed', /* breathing difficulty, Dr. Lee — filler for list depth */ },
]
```

Write Bella + Max fully (real vet content, ~30 transcript lines each, complete SOAP + 4-6 invoice lines); Duke can be shallow.
**Verify:** `node -e "import('./src/mock/visits.js').then(m=>console.log(m.MOCK_VISITS.length))"` prints 3 (or import passes in dev without error).
Commit: `feat: mock visit encounters (dog + cat)`.

### Task A3: Doctor Notes page — layout + list

**Objective:** Two-column shell with Cases & Calls / Live Call Transcripts lists.

**Files:**
- Create: `src/pages/DoctorNotes.jsx`
- Modify: `src/App.jsx` (route the `notes` view)

Left column (w-80): section label `LIVE CALL TRANSCRIPTS` → visits with `status==='live'` (green pulsing LIVE badge, timer text); section `CASES & CALLS` → draft/reviewed visits (amber `Draft` / green `Reviewed` pill, complaint, doctor, date). Clicking selects `selectedId` (local useState, default first live visit).
Right panel: placeholder `Select a case`.
**Verify:** page renders both lists from MOCK_VISITS; selection highlights.
Commit: `feat: doctor notes list layout`.

### Task A4: Doctor Notes — live transcript panel

**Objective:** Streaming transcript simulation + header.

**Files:** Modify: `src/pages/DoctorNotes.jsx`

1. Right-panel header: patient name + `(owner)`, signalment line, doctor, date, LIVE badge.
2. Tabs `[Clinical Notes | Raw Transcript]` (Clinical Notes disabled while live).
3. Transcript area: for a `live` visit, reveal one transcript line every 1.5s from `useEffect` interval (index in state), speaker-labelled rows (`DR:` pine, `OWNER:` ink), auto-scroll to bottom via ref.
4. `End call` button (top-right) — for now just flips `status` to `draft` locally (Task A5 gives it meaning).
**Verify:** lines appear one by one; End call stops the stream.
Commit: `feat: live transcript streaming simulation`.

### Task A5: Doctor Notes — SOAP panel + approve

**Objective:** The call-end transformation moment.

**Files:** Modify: `src/pages/DoctorNotes.jsx`

1. When `status !== 'live'`: render SOAP from `visit.soap` — sections Clinical Summary (paragraph), Subjective/Objective (bullets), Assessment (list), Plan (numbered). Small caption `Generated from transcript`.
2. Badge Draft (amber) / Reviewed (green). Buttons `[PDF] [Approve]`. Approve flips visit → `reviewed` (store action). PDF = `window.print()` for now.
3. `End call` now: flip to `draft`, show a 1.2s `Generating note…` shimmer, then reveal SOAP (content already in mock).
4. Raw Transcript tab shows the full transcript read-only.
**Verify:** End call → shimmer → SOAP appears → Approve → Reviewed badge, item moves to Cases list styling.
Commit: `feat: SOAP panel with draft/approve flow`.

### Task A6: Ask-about-this-patient box (live Q&A)

**Objective:** Mid-call Q&A UI.

**Files:** Modify: `src/pages/DoctorNotes.jsx`

Input pinned under the live transcript + send button. On submit: append `{q, a:null}` to `visit.qa`, show typing dots, after 900ms fill canned answer from a small lookup in `src/mock/visits.js` (`MOCK_ANSWERS`: match on keyword `weight|vaccine|medication`, else generic grounded answer). Render Q&A bubbles above the input.
**Verify:** ask "last weight?" → answer bubble appears referencing 65 lbs.
Commit: `feat: in-call Q&A box`.

### Task A7: Visit store lift

**Objective:** Move visit state to App so Patients/Follow-ups/Invoice share it.

**Files:** Modify: `src/App.jsx`, `src/pages/DoctorNotes.jsx`

`const [visits, setVisits] = useState(MOCK_VISITS)` in App; actions `endVisit(id)`, `approveNote(id)`, `askQuestion(id, q)`, `approveInvoice(id)`, `toggleFollowup(id, fid)` added to the existing `store` object. DoctorNotes consumes store instead of local state.
**Verify:** behavior of A4-A6 unchanged.
Commit: `refactor: lift visit state into app store`.

### Task A8: Patient card page

**Objective:** Real clinical cards, new-vs-existing.

**Files:**
- Create: `src/pages/PatientCard.jsx`
- Modify: `src/pages/Patients.jsx` (grid of patient cards derived from `store.visits` + keep old memory table below as a `Call memory` section)

Card: avatar, name, signalment chips, owner + phone, `NEW PATIENT` tag when `isNew`, Active Problems / Medications / Allergies chip lists, Visit History (visits for this patient, newest first, each linking `→ Doctor Notes` via `store.setView('notes')` + select), tabs `Overview | Notes | Invoices | Follow-ups`.
**Verify:** clicking Bella opens card; her visit appears in history with Draft/Reviewed badge synced to store.
Commit: `feat: patient cards with visit history`.

### Task A9: Invoice view

**Objective:** SOAP-derived invoice with approve gate.

**Files:**
- Create: `src/pages/Invoice.jsx` (rendered inside PatientCard `Invoices` tab AND from a `View invoice` button on the SOAP panel)

Header (patient, owner, date, `Draft`/`Finalized` badge). Table `Description | Code | Source | Qty | Price` — `Source` renders as a small tag (`from Plan`). Totals: subtotal, tax (8%), total. Buttons `[Edit]` (qty/price inline editable) `[Approve & Finalize]` → store `approveInvoice`.
**Verify:** invoice totals compute; Approve flips badge; state persists across nav.
Commit: `feat: invoice draft + finalize`.

### Task A10: Follow-ups from Plan

**Objective:** Extend existing Follow-ups page with visit-generated items.

**Files:** Modify: `src/pages/FollowUps.jsx`

Prepend a `From today's visits` section: rows from `store.visits[].followups` — label, owner, due date, channel chip, Done checkbox (`toggleFollowup`). Keep existing booking sequences below.
**Verify:** checking Done persists via store; Bella's `Recheck lump` visible.
Commit: `feat: visit-derived follow-ups`.

### Task A11: Dashboard tiles

**Objective:** Make the landing view tell the workflow story.

**Files:** Modify: `src/pages/Overview.jsx`

Add a top row of 4 stat cards computed from store: `Visits today`, `Drafts awaiting review`, `Follow-ups due`, `Invoices pending`. Each card clicks through to its page (`store.setView`). Keep existing content below.
**Verify:** counts update when a note/invoice is approved.
Commit: `feat: workflow stat tiles on dashboard`.

### Task A12: Phase A gate

- `npm run build` → must succeed.
- Run the full demo path manually (checklist in §Evaluation E1).
- Fix only blocking issues. Commit: `chore: phase A complete`.

---

## Phase B — Backend (swap mocks for live, one seam at a time)

Every task keeps a mock fallback: if env keys are missing, the UI silently stays on mocks (same pattern as the existing `ringgSync demo` state).

### Task B1: Vapi live call feed

**Files:**
- Create: `api/vapi-calls.js` (GET — list recent calls for `VAPI_ASSISTANT_ID` via `https://api.vapi.ai/call?assistantId=…`, normalize to the visit shape: id, startedAt, status, transcript lines)
- Create: `src/vapiLive.js` (`fetchVapiCalls()`, `VAPI_POLL_MS=8000` — mirror `ringgLive.js`'s contract)
- Modify: `src/App.jsx` (poll effect: replace `fetchRinggCalls` import with `fetchVapiCalls`; merge live visits into `visits` keyed by call id; header text `Vapi live · N calls`)

Env: `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`. **Verify:** with keys set, a real Vapi test call appears in Doctor Notes' live list; without keys, mock mode banner shows.
Commit: `feat: vapi call polling`.

### Task B2: Live transcript streaming

**Files:**
- Create: `api/vapi-webhook.js` (POST — handle `transcript` and `end-of-call-report` events; store latest per-call transcript in Supabase table `vetra_live_transcripts` — reuse `server/supabase-memory.js` client)
- Modify: `src/vapiLive.js` (poll transcripts for live calls)

**Verify:** speaking on a test call updates the transcript panel within one poll cycle. If webhook infra is flaky at the venue, the A4 simulation remains the demo path (guardrail #8 inverse: fallback stays).
Commit: `feat: live transcript via webhook`.

### Task B3: Generation endpoint

**Files:**
- Create: `api/generate.js` — POST `{transcript, patient}` → `{soap, followups, invoiceLines}` in ONE LLM call. System prompt embeds: SOAP section spec + 2 few-shot pairs from `src/reference/soap-examples.json` + the price/code catalog from `src/reference/procedure-codes.json`. Force JSON output (response_format / tool call). Model + key via `LLM_API_KEY`, `LLM_MODEL` env.
- Create: `src/reference/soap-examples.json` (2 trimmed Abridge transcript→note pairs, vet-neutralized wording)
- Create: `src/reference/procedure-codes.json` (~30 entries: `{code, system, desc, price}` — flattened from Abridge Procedure/Immunization/DiagnosticReport codes + common vet items DHPP/rabies/FVRCP/exam/CBC)
- Modify: `src/App.jsx` `endVisit(id)` → POST transcript to `/api/generate`, write result into the visit; on error/timeout (10s) fall back to `visit.soap` mock and toast `Using cached note`.

**Verify:** curl the endpoint with Bella's transcript → valid JSON with all three keys; end-call in UI populates SOAP from the live response.
Commit: `feat: transcript→SOAP+invoice generation`.

### Task B4: Live Q&A endpoint

**Files:**
- Create: `api/ask.js` — POST `{question, transcriptSoFar, patient}` → `{answer}` (single small LLM call, 3-sentence cap in prompt)
- Modify: DoctorNotes ask box → call `/api/ask`, keep the canned-answer fallback on error.

**Verify:** mid-call question returns grounded answer < 4s.
Commit: `feat: live chart-aware Q&A`.

### Task B5: Pinned demo call + stage fallback

**Files:**
- Create: `src/mock/demoScript.js` — the exact Bella call as a scripted playback (`?demo=1` query param starts it: auto-streams transcript, pre-seeded Q&A answer, cached generation result)
- Modify: `App.jsx` `getInitialView` to honor `?demo=1`.

**Verify:** `http://localhost:5180/?demo=1` runs the entire Beat 1→4 flow with zero network. This is the on-stage insurance.
Commit: `feat: pinned demo mode`.

### Task B6: Phase B gate

`npm run build`, deploy to Vercel, set env vars, run E2 evaluation below. Commit: `chore: phase B complete`.

---

## Metrics

Post-implementation, record these in `PROGRESS.md` (they're also the demo health check):

**Product metrics (demo-facing)**
- M1 Time from `End call` → SOAP rendered: target < 5s live, < 1.5s demo mode.
- M2 Time from question submit → Q&A answer: target < 4s live, < 1s canned.
- M3 Transcript latency (spoken word → on screen): target < one poll cycle (8s), stretch 2s via webhook.
- M4 Invoice line coverage: every Plan/Objective billable item appears as a line (manual count on Bella: expect 100% of 4-6 items).
- M5 Zero-console-error demo run.

**Engineering metrics (agent-facing)**
- M6 Tasks completed / tasks attempted (target 18/18; blocked tasks logged, not looped).
- M7 Commits ≈ tasks (one per task ±2).
- M8 No task exceeded the 15-tool-call ceiling (count from PROGRESS.md notes).
- M9 `npm run build` passes at both phase gates.

---

## Evaluation

**E1 — Phase A acceptance (mock mode, run in browser):**
1. Load app → Dashboard tiles show correct counts.
2. Doctor Notes → Bella under LIVE, transcript streams line-by-line.
3. Ask "What was Bella's last weight?" → grounded answer bubble.
4. End call → shimmer → full SOAP renders with Draft badge.
5. Approve → Reviewed; dashboard `Drafts awaiting review` decrements.
6. Patients → Bella card shows visit in history; Invoices tab → draft invoice, lines carry `from Plan` tags, totals correct; Approve & Finalize flips badge.
7. Follow-ups → `Recheck lump` present, checkbox works.
8. All nav items render; no console errors.
PASS = all 8. Any FAIL blocks Phase B.

**E2 — Phase B acceptance (live mode):**
1. Real Vapi test call appears in live list; transcript updates while speaking.
2. End of real call → `/api/generate` SOAP renders (M1 timing logged).
3. `/api/ask` mid-call answer (M2 logged).
4. Kill network / unset keys → app degrades to mock mode with banner, E1 flow still passes.
5. `?demo=1` full scripted run with network disabled.
PASS = all 5.

**E3 — Demo rehearsal:** run the 3-minute script (`/Users/rishabdoshi/Downloads/hackathon-demo-script.md`) against `?demo=1` twice and against live once; log M1-M5 each run.

---

## Files summary

| Action | Path |
|---|---|
| Create | `src/mock/visits.js`, `src/mock/demoScript.js`, `src/pages/DoctorNotes.jsx`, `src/pages/PatientCard.jsx`, `src/pages/Invoice.jsx`, `src/vapiLive.js`, `src/reference/soap-examples.json`, `src/reference/procedure-codes.json`, `api/vapi-calls.js`, `api/vapi-webhook.js`, `api/generate.js`, `api/ask.js`, `PROGRESS.md` |
| Modify | `src/App.jsx`, `src/data.js`, `src/ui.jsx`, `src/pages/Patients.jsx`, `src/pages/FollowUps.jsx`, `src/pages/Overview.jsx`, `README.md` (env vars, B6) |
| Untouched | `ringgLive.js`, `api/ringg-*` (dead but kept for rollback until B6) |

## Risks / open questions

- Vapi webhook needs a public URL — works on Vercel, not localhost; that's why B2 keeps the A4 simulation as fallback and B5 exists.
- LLM JSON drift → force structured output and validate keys server-side; fall back to cached note on any parse failure.
- Venue Wi-Fi → `?demo=1` is the contractual stage path; live mode is the bonus.
- Open: which LLM provider/key for `api/generate.js` (decide before B3; any OpenAI-compatible endpoint works with the planned code).
