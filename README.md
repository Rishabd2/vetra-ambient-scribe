# Vetra — the AI-native operating system for veterinary clinics

Vetra turns every incoming conversation into **structured context, a supervised next
step, and clear ownership** — so more opportunities become completed care instead of
getting lost between the phone, the front desk, and the clinical team.

We start with **triage and front-desk automation**, because that is where revenue
leakage begins. Missed calls, poor routing, incomplete intake, and unowned callbacks
quietly cost clinics appointments, new clients, and follow-through. Vetra's voice
agent answers the call, captures the request, surfaces urgency, applies the clinic's
own rules, and hands the right person a clear next action.

That is the wedge. The larger vision is an **AI-native operating layer** that makes
each clinic's protocols executable across the systems it already runs — scheduling,
records, follow-up, referrals, refills, and billing.

**How it works today:** Vetra (voice agent **"Haley,"** built on
[Vapi](https://vapi.ai)) answers the call while the front-desk team watches the
transcript stream **live**. Mid-call they can bump up a question — *"ask if the rabies
vaccine is current"* — and Haley asks it in real time. From there the captured context
flows through the whole workflow: it creates or updates a **patient card**, drafts a
**SOAP note**, derives an **invoice** from that note, and queues **follow-up tasks** —
each one landing in a **Draft** state until a human reviews it.

Every artifact the AI produces is a draft; it only becomes part of the record once a
person reviews and approves it. **The AI drafts everything; the clinic stays the source
of truth.**

> Demo persona: **Dr. Martinez, Urbana Paws Clinic.** Voice agent: **"Haley."**

Live demo: **https://cv-vetra.vercel.app**

---

## The core flow

1. **Vetra answers the call** — the voice agent picks up, and the front desk sees the
   transcript stream in real time from the moment the caller starts talking.
2. **Live, human-in-the-loop Q&A** — mid-call the front-desk worker can push a question
   to the agent (*"ask for vaccination records"*, *"confirm the pet's age"*) and Haley
   asks the caller on the spot, no hold, no callback.
3. **Context flows into the workflow** — the request is captured with urgency scored and
   the clinic's routing rules applied, so nothing sits unowned.
4. **On call-end, everything is auto-generated:**
   - **Patient card** — created for new callers, updated for returning ones (memory means owners never repeat themselves)
   - **SOAP note** (Subjective / Objective / Assessment / Plan)
   - **Invoice**, derived line-by-line from the SOAP plan
   - **Follow-up tasks** (reminders, rechecks, owner messages)
5. **Draft → Reviewed gate** — none of it is final until a human approves. Every screen
   enforces the same review step.

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
