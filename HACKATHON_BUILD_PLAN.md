# Vetra Hackathon — Build Plan

Goal: turn the current repo into the demo we pitch — a live vet visit call that, on hang-up, auto-produces a SOAP note, a patient card (new or updated), follow-ups/to-dos, and an invoice built from the SOAP note. Vet reviews and approves.

---

## 1. Where we are vs. where we need to be

### What the current repo actually is (`vetra_ringg_hackathon-main`)
A **front-desk call-triage dashboard**, not a clinical/ambient-scribe app.

- Nav: Overview, Calls, Calendar, Follow-ups, Patients, Agents
- Live data via **Ringg.ai** (`src/ringgLive.js`, polls `/api/ringg-calls` every 8s), Cal.com booking (`src/calLive.js`), Supabase memory (`server/supabase-memory.js`)
- Clinic = "Maple Street Vet Clinic", user = "Debra B. · Practice Manager"
- "Patients" page = a phone-keyed memory table, **not** clinical patient cards
- Focus = inbound call → urgency triage → booking → SMS/WhatsApp follow-up sequences

### What the target looks like (the screenshots you shared — a more built-out Vetra)
- Nav: Dashboard, Inbox, Calendar, Clinic Timeline, Patients, **Doctor Notes**, Follow-ups, **Analytics**, Settings
- Clinic = "Urbana Paws Clinic", user = "Dr. Martinez · Veterinarian"
- **Doctor Notes** = the SOAP hub: a "Cases & Calls" list + a "Live Call Transcripts" list (LIVE badges), and a right panel with **Clinical Summary → Subjective → Objective → (Assessment/Plan)**, tabs "Clinical Notes | Raw Transcript", Draft/Reviewed badges, PDF export. Patient carries real signalment: "Bella (Golden Retriever, 5y, F/S, 65 lbs)".
- Clinic Timeline = kanban of visit stages
- Analytics = call/revenue KPIs + charts
- Settings = clinic info + hours

### The three things NEITHER version has (our differentiators)
1. **Real-time in-call Q&A** — ask a chart-aware question while the call is live.
2. **Invoice auto-populated from the SOAP note** — nowhere in the repo or screenshots.
3. A clean **call-ends → everything generates → vet approves** moment as one flow.

---

## 2. Agent change: Ringg → Vapi

We are on a **Vapi** agent now, not Ringg. This touches the live layer only; the UI/store stays the same shape.

- [ ] Add `src/vapiLive.js` mirroring `ringgLive.js` (same exported names: `fetchCalls`, `callsFromX`, `appointmentsFromCalls`, `followupsFromCalls`, poll interval) so `App.jsx` swaps one import.
- [ ] Add `api/vapi-calls.js` (list/pull calls + transcripts) and `api/vapi-webhook.js` (replaces `ringg-webhook.js`). Vapi sends `end-of-call-report`, `transcript`, `status-update`, `function-call` events — map these to our call objects.
- [ ] Live transcript: subscribe to Vapi's streaming transcript (client SDK `@vapi-ai/web` or webhook `transcript` events) so the Doctor Notes "LIVE" transcript actually streams. This is what powers Demo Beat 1 & 2.
- [ ] Env: replace `RINGG_*` with `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`. Update `README.md` and `.env` notes.
- [ ] Keep Ringg files in place but unused (fast rollback) until Vapi is proven, then delete.
- [ ] Header/status text: "N agents live · Vapi" instead of Ringg wording (`src/App.jsx` ~line 337).

Keep Cal.com + Supabase as-is; they're agent-agnostic.

---

## 3. Key pages to build / change

Priority order = demo impact.

### A. Doctor Notes + SOAP  (NEW — highest priority)
New page `src/pages/DoctorNotes.jsx`. Matches the screenshot.
- Left column: **Cases & Calls** (finished visits, Draft/Reviewed badge) + **Live Call Transcripts** (LIVE badge, streaming).
- Right panel: SOAP note — **Clinical Summary, Subjective, Objective, Assessment, Plan**; tabs **Clinical Notes | Raw Transcript**; header with patient + signalment, doctor, date; **Draft/Reviewed** badge; **PDF** + **Approve** buttons.
- On call end: transcript → SOAP generator fills this panel automatically (see §5).
- Add to `NAV` in `App.jsx`.

### B. Invoice from SOAP  (NEW — core differentiator, nobody else has it)
New `src/pages/Invoice.jsx` (or a tab inside Doctor Notes / patient card).
- Auto-generate line items from the SOAP note's Assessment/Plan + Objective (exam, vaccines, labs, procedures, meds).
- Each line item = description + code + qty + price; subtotal/tax/total; **Draft → vet approves**.
- Map procedures/labs to codes using the Abridge FHIR coded resources as the reference catalog (see §4).

### C. Patient Card  (UPGRADE existing Patients page)
Current Patients = memory table. Upgrade to real **patient cards**:
- Signalment (species, breed, age, sex/neuter, weight), owner, active problems, meds, visit history, attached SOAP notes + invoices.
- **New vs existing**: on call end, match by phone/pet → create a new card or append the visit to the existing one.
- Keep the phone-keyed memory table as one tab ("Call memory") inside the card view.

### D. Follow-ups / To-dos  (EXTEND existing)
Already exists (`FollowUps.jsx`). Extend so follow-ups + to-dos are **generated from the SOAP Plan** (rechecks, med reminders, callbacks), each with an owner + due date, not only from bookings.

### E. Live Call view  (NEW or fold into Doctor Notes)
The on-stage centerpiece: live call status + streaming transcript + a **"Ask about this patient"** box (real-time chart-aware Q&A). Can live inside Doctor Notes' live transcript panel.

### F. Rebrand + shell polish
- Clinic → "Urbana Paws Clinic", user → "Dr. Martinez · Veterinarian" (`App.jsx`, `data.js`).
- Add nav items to match target (Dashboard, Inbox, Clinic Timeline, Doctor Notes, Analytics, Settings) — build the ones that carry the demo (Doctor Notes, Analytics); Inbox/Timeline/Settings can be light or reuse existing (Calls≈Inbox, Overview≈Dashboard).

### G. Nice-to-have (only if time)
- Clinic Timeline kanban, Analytics charts, Settings page — these are in the screenshots but are **not** on the demo critical path. Build last.

---

## 4. Abridge data — where and how we use it

**What it is:** 25 synthetic **human** FHIR encounters (`~/Downloads/synthetic-ambient-fhir-25`), each = transcript + SOAP note + after-visit summary + FHIR (Patient, Encounter, Condition, Observation, Procedure w/ SNOMED, DiagnosticReport w/ LOINC, Immunization, MedicationRequest).

**We do NOT ship it as patient data** (it's human medicine). We use it three ways:

1. **Few-shot / reference for the SOAP generator (§5).** The 25 transcript→note pairs are gold examples of the exact SOAP shape we want. Use 2–3 as few-shot prompt examples so our generator outputs the same structure.
2. **Coding catalog for the invoice (§3B).** The SNOMED-coded Procedures and LOINC-coded labs are the line-item → code → billable-service reference. Extract a `codes.json` catalog from the FHIR and map SOAP mentions to it.
3. **Structural schema reference.** The FHIR record shape (Condition/Observation/Procedure grouping) informs our patient-card + encounter model.

**Changes to make to Abridge data:**
- [ ] Extract a compact `src/reference/soap-examples.json` — 2–3 (transcript, note) pairs, trimmed, for few-shot.
- [ ] Extract `src/reference/procedure-codes.json` — flatten all Procedure/DiagnosticReport/Immunization codes (SNOMED/LOINC/CVX + display) into a lookup, add a demo `price` to each for invoicing.
- [ ] **Vet-ify the visible demo surface**: hand-author **1–2 veterinary encounters** (dog + cat) that look native — species, signalment, weight-based dosing, vet procedures/vaccines (e.g., DHPP, rabies, spay). Abridge stays behind the scenes as the structural/coding reference + eval set. Do **not** clone all 25 into fake-vet.
- [ ] Keep the human FHIR files out of `src/` runtime bundles; put derived JSON only.

---

## 5. The generation pipeline (the engine behind the demo)

`src/lib/generateFromTranscript.js`:
- Input: finished transcript (+ patient context if existing).
- Output (one call, or staged): `{ soap, patientCardPatch, followUps[], todos[], invoiceDraft }`.
- Implementation options:
  - **Live LLM** (OpenAI/Anthropic) via a server route `api/generate.js` — real, impressive, but needs a key + latency handling.
  - **Deterministic/canned** for the pinned demo transcript — instant, zero-risk on stage.
  - **Recommended: both** — real generation wired, but a pinned demo call with cached output as fallback so the stage demo never stalls.
- Few-shot from Abridge soap-examples; invoice lines matched against procedure-codes.json.
- Real-time Q&A: `api/ask.js` — takes question + current transcript + patient context, returns grounded answer.

---

## 6. Human-approval gate (keep it — it's a feature)
Every generated artifact (SOAP, invoice, follow-ups) renders as **Draft** with an **Approve** button. Approving flips to **Reviewed** and (for invoice) "Finalized". This matches Vetra's "clinic owns judgment, Vetra owns the handoff" positioning and defuses the "is the AI diagnosing/billing on its own?" Q&A. Reuse the existing `markReviewed` pattern in `App.jsx`.

---

## 7. Build order (so the demo is always runnable)

1. **Rebrand shell + Vapi live layer** — Urbana Paws, Dr. Martinez, Vapi calls + streaming transcript. (Foundation.)
2. **Doctor Notes + SOAP page** — list + SOAP panel, transcript→SOAP generator with Abridge few-shot. (Demo Beat 3 core.)
3. **Invoice from SOAP** — codes.json catalog, line-item generation, approve. (Differentiator.)
4. **Patient card upgrade** — new-vs-existing, visit history. (Demo Beat 3.)
5. **Live Q&A box** — real-time chart-aware answer. (Demo Beat 2, our originality.)
6. **Follow-ups/to-dos from SOAP Plan.** (Demo Beat 3.)
7. **Approve gate wired across all artifacts.** (Demo Beat 4.)
8. **Pinned demo call + cached fallback.** (Stage safety.)
9. If time: Analytics, Clinic Timeline, Settings, Inbox polish.

---

## 8. Open decisions before we start
1. Invoice: fully auto-populated (higher wow) vs draft-with-approval (on-brand, safer). Plan assumes **draft-with-approval**.
2. Generation: live LLM, canned, or both-with-fallback. Plan assumes **both**.
3. Do we keep the existing Ringg triage/booking flow as a secondary tab, or fully pivot the app to the ambient-scribe story? Plan assumes **pivot the hero flow to ambient scribe**, keep booking as supporting.
4. Which 2 species/visits to hand-author as the vet-native demo encounters (suggest: dog annual wellness + vaccines; cat limping/exam).
