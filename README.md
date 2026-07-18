# Vetra — Front Desk AI Dashboard

Clean demo dashboard for Vetra's vet-clinic voice agents, now wired for **Ringg.ai call history, transcripts, custom variables and analysis**.

## Run

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # static build in dist/ — deploy anywhere (vercel --prod)
```

## Live Ringg connection

The deployed Vercel app reads live Ringg calls for `vetra_RinggMirror` through `/api/ringg-calls` and merges them into the Calls queue. The browser polls every 8 seconds, so active and completed calls show up without a manual refresh.

Set these environment variables in Vercel:

```bash
RINGG_API_KEY=...
RINGG_AGENT_ID=864b0c36-7b52-4f42-9aeb-77445f37b7b2
RINGG_AGENT_NAME=vetra_RinggMirror
RINGG_HISTORY_LOOKBACK_DAYS=14
RINGG_WEBHOOK_SECRET=...
EMERGENCY_TRANSFER_NUMBER=+918696816868
NEXT_PUBLIC_SUPABASE_URL=https://ngtioksojnxlkdyzqxzw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_PATIENT_MEMORY_TABLE=vetra_patient_memory
VITE_RINGG_AGENT_NAME=vetra_RinggMirror
VITE_RINGG_POLL_MS=8000
```

If `RINGG_API_KEY` is not set, the dashboard stays on the seeded demo data and shows a demo-mode sync message in the header.

## Cal.com booking connection

The dashboard books real appointment slots through server-side Cal.com routes, so the Cal API key is never exposed to the browser. The booking modal reads live availability from `/api/cal/slots`, then confirms the selected slot through `/api/book_appointment`.

Set these environment variables in Vercel:

```bash
CAL_API_KEY=...
CAL_EVENT_TYPE_ID=6001252
CAL_TIMEZONE=America/New_York
```

Optional Cal configuration:

```bash
CAL_FALLBACK_ATTENDEE_EMAIL=frontdesk@example.com
CAL_EVENT_TYPES_API_VERSION=2024-06-14
CAL_SLOTS_API_VERSION=2024-09-04
CAL_BOOKINGS_API_VERSION=2026-02-25
```

For Ringg on-call booking tools, point `book_appiontment` / `book_appointment` at:

```text
https://YOUR_DEPLOYMENT_URL/book_appointment
```

That route rewrites to the same Cal booking handler the dashboard uses.

Emergency handoff uses the custom `notify_emergency_team` endpoint first, then Ringg's built-in `call_transfer` tool. Configure the built-in transfer destination as `Vetra Emergency Routing` with target `+918696816868`. Webcall tests can verify triage and notification, but they do not provide a real phone leg to bridge; a real emergency transfer requires an inbound-enabled Ringg number attached to the assistant.

## Supabase memory

Patient memory, due-care context, and booking references are written to Supabase table `vetra_patient_memory`. Run `supabase/vetra_patient_memory.sql` once in the Supabase SQL editor before relying on durable memory. Without that table, the app can still answer from seeded sample records, but production call memory will not persist.

For webhooks, configure Ringg event subscriptions to call:

```text
https://YOUR_DEPLOYMENT_URL/api/ringg-webhook
```

Start with `all_processing_completed`; add `call_started` or `call_completed` if the UI needs earlier progress events.

## Revenue uplift page

The prospect-facing calculator lives at `/revenue`. It models missed calls, AI completion rate, booking rate, and average case value to estimate monthly and annual revenue recovered by Vetra.

## What's inside

| Page | What it shows |
|---|---|
| **Overview** | Revenue captured / at-risk / missed (24h), needs-action queue, today's AI-booked calendar, last night's emergency handoff timeline |
| **Calls** | Callback queue (Needs action / Unreviewed / Reviewed), urgency-coded; click a row → full transcript drawer with AI summary, next actions, and **Book appointment** |
| **Calendar** | Week view, AI-booked vs staff-booked, bookings from transcripts land here live |
| **Follow-ups** | Automated SMS / WhatsApp / Email sequences per booking & handoff |
| **Patients** | The shared memory layer from Ringg custom variables and seeded demo rows — returning callers never repeat themselves |
| **Agents** | Ringg assistants, their tools, the shared-memory link, and the 7-step call flow (Nº 01–07) |

## The core flow demoed

1. Pet owner calls the small clinic → Priya (triage) collects symptoms, scores urgency
2. Beyond capacity → caller informed, call + context transferred (`owner_name`, `pet_name`, `reported_symptom`)
3. Priya (emergency) at Northside ER opens with the transferred context — nothing repeated
4. Availability confirmed, treatment scheduled
5. Automated follow-ups: confirmation, directions, pre-arrival instructions, reminders, post-treatment check-ins
6. Every call upserts the memory sheet keyed by phone — follow-up calls get full context
7. From any transcript: **Book appointment** → calendar slot grid → confirms, updates revenue metrics, queues the follow-up sequence

Real call executions embedded: `8c1bc359` (John Wick — urgent vomiting), `6a8240e6` → `f90320fc` (Buddy — emergency handoff pair), `b04164f2` (Buddy — Jul 3 booking).

Demo clock is pinned to **June 12, 2026** to match the live call data (`src/data.js`).
