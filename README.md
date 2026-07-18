# Vetra — Veterinary Ambient Scribe & Front-Desk AI

Vetra is an **ambient AI scribe and front-desk copilot for veterinary clinics.** A
voice agent (built on [Vapi](https://vapi.ai)) sits in on the exam-room visit, and
Vetra turns that live conversation into finished clinical work — a SOAP note, an
updated patient chart, follow-up tasks, and a SOAP-derived invoice — while the vet
just talks to the pet owner.

Every artifact the AI produces lands in a **Draft state and only becomes part of the
record once the vet reviews and approves it.** The AI drafts everything; the
clinician stays the source of truth.

> Demo persona: **Dr. Martinez, Urbana Paws Clinic.** Voice agent: **"Haley."**

Live demo: **https://cv-vetra.vercel.app**

---

## The core flow

1. **Live visit** — the exam-room voice agent joins the call; Vetra streams the
   transcript in real time.
2. **In-call, chart-aware Q&A** — during the visit the vet can ask the assistant
   questions ("last vaccination date?", "is this lump new?") and get answers grounded
   in the patient's chart.
3. **On call-end, everything is auto-generated:**
   - **SOAP note** (Subjective / Objective / Assessment / Plan)
   - **Patient card** update (vitals, problems, meds, history)
   - **Follow-up tasks** (reminders, rechecks, owner messages)
   - **Invoice**, derived line-by-line from the SOAP plan
4. **Draft → Reviewed gate** — none of it is final until the vet approves. Every
   screen enforces the same review step.

---

## Tech stack

| Layer      | Choice                                        |
|------------|-----------------------------------------------|
| Frontend   | React 19 + Vite 8                             |
| Styling    | Tailwind CSS 4 (`@tailwindcss/vite`)          |
| Voice      | Vapi (live calls, transcripts, in-call control)|
| Bookings   | Cal.com (server-side, key never hits browser) |
| Memory     | Supabase (`vetra_patient_memory` table)       |
| Hosting    | Vercel (static SPA + serverless `/api` fns)   |

The app runs fully on **seeded mock data** out of the box (`src/data.js`,
`src/mock/visits.js`) so it demos with zero backend config. Live Vapi / Cal.com /
Supabase wiring switches on only when the corresponding env vars are present.

---

## Run locally

```bash
npm install
npm run dev        # Vite dev server (auto-ports; typically http://localhost:5173)
npm run build      # static production build → dist/
npm run preview    # serve the production build locally
npm run lint       # eslint
```

No environment variables are required for the mock-data demo.

---

## Project structure

```
src/
  App.jsx              # shell, routing, state, live-poll loop
  data.js              # seeded calls / appointments / follow-ups
  mock/visits.js       # canonical mock visit contract (SOAP, chart, transcript)
  vapiLive.js          # Vapi call fetch + normalization (client)
  calLive.js           # Cal.com booking (client)
  pages/               # Dashboard, Inbox (Calls), Calendar, Patients,
                       # Doctor Notes, Follow-ups, Analytics, Settings,
                       # Landing2, RevenueUplift, Invoice, CallDrawer, BookingModal
server/                # Vapi/Cal/Supabase normalization + adapter helpers
api/                   # Vercel serverless functions (see below)
supabase/              # vetra_patient_memory.sql schema
tests/                 # vapi-adapter tests
```

### Pages

| Page               | What it shows |
|--------------------|---------------|
| **Dashboard**      | Clinic-day overview: needs-action queue, today's schedule, revenue at a glance |
| **Inbox**          | Call/visit queue (Needs action / Unreviewed / Reviewed); open a row for the full transcript drawer |
| **Calendar**       | Week view of appointments; create / edit / reschedule |
| **Clinic Timeline**| Chronological view of clinic activity |
| **Patients**       | Persistent patient memory — returning owners never repeat themselves |
| **Doctor Notes**   | Ambient-generated SOAP notes with the Draft → Reviewed approval gate |
| **Follow-ups**     | Auto-drafted follow-up sequences per visit |
| **Analytics**      | Clinic metrics |
| **Settings**       | Clinic / agent configuration |

### Serverless API (`/api`, 9 functions — under Vercel Hobby's 12-fn cap)

`vapi-calls`, `vapi-webhook`, `vapi-say`, `lookup_patient`, `book_appointment`,
`cancel_appointment`, `reschedule_appointment`, `check_availability_of_slots`,
plus `cal/` slot helpers. `vercel.json` rewrites the Vapi tool endpoints
(`/book_appointment`, `/webhooks/vapi`, etc.) to these handlers.

---

## Optional live integrations

Set these in Vercel (or a local `.env`, which is git-ignored) to move off mock data.

**Vapi (voice):**
```bash
VAPI_API_KEY=...
VAPI_ASSISTANT_ID=...
VAPI_ASSISTANT_NAME=Haley
VAPI_WEBHOOK_SECRET=...
VITE_VAPI_ASSISTANT_NAME=Haley
VITE_VAPI_POLL_MS=2000
```

**Cal.com (bookings — server-side only, key never exposed to the browser):**
```bash
CAL_API_KEY=...
CAL_EVENT_TYPE_ID=...
CAL_TIMEZONE=America/Chicago
```

**Supabase (durable patient memory):**
```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
SUPABASE_PATIENT_MEMORY_TABLE=vetra_patient_memory
```
Run `supabase/vetra_patient_memory.sql` once in the Supabase SQL editor before
relying on persistent memory. Without it, the app answers from seeded records.

If a given integration's keys are absent, that surface falls back to seeded demo
data automatically — the dashboard always renders.

---

## Deploy

Deployed on Vercel as a static SPA plus serverless functions.

```bash
vercel --prod
```

---

## Design principle

**AI drafts everything; the vet approves everything.** Every generated artifact —
SOAP note, patient-card update, follow-up, invoice — starts as a Draft and requires
an explicit clinician review before it counts. That gate is the product.
