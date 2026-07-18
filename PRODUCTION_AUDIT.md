# Production Audit: Vercel + Supabase + Ringg.ai

## Target Architecture

- Vercel hosts the React dashboard and all serverless API/tool endpoints.
- Supabase stores durable patient memory, due-care context, and Cal.com booking references.
- Ringg.ai calls Vercel tool endpoints for lookup, booking, cancellation, rescheduling, due-care checks, context saving, and emergency notification.
- Cal.com remains the live scheduling source of truth.

## Fixed In This Pass

- Moved non-route helper modules out of `/api` so Vercel does not count them as Serverless Functions.
- Collapsed duplicate Cal and webhook entrypoints so the project stays within the Vercel Hobby limit of twelve functions.
- Removed `/tmp` JSON patient-memory persistence.
- Added Supabase REST-backed patient memory helpers.
- Added Supabase migration SQL at `supabase/vetra_patient_memory.sql`.
- Kept compatibility rewrites for existing dashboard/Ringg paths.

## Required Supabase Setup

Run `supabase/vetra_patient_memory.sql` once in the Supabase SQL editor.

The provided key is a publishable/anon key, so code cannot create the table automatically. The migration currently allows anon select/insert/update for MVP tool usage. For real clinic PHI, replace that with a server-only `SUPABASE_SERVICE_ROLE_KEY` in Vercel and stricter RLS.

## Required Vercel Environment

- `RINGG_API_KEY`
- `RINGG_AGENT_ID`
- `RINGG_AGENT_NAME`
- `RINGG_HISTORY_LOOKBACK_DAYS`
- `EMERGENCY_TRANSFER_NUMBER`
- `CAL_API_KEY`
- `CAL_EVENT_TYPE_ID`
- `CAL_TIMEZONE`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_PATIENT_MEMORY_TABLE`
- `VITE_RINGG_AGENT_NAME`
- `VITE_RINGG_POLL_MS`

## Ringg.ai Reconfiguration After Deploy

Replace every ngrok URL with the final Vercel production URL:

- `/lookup_patient`
- `/check_availability_of_slots`
- `/book_appointment`
- `/cancel_appointment`
- `/reschedule_appointment`
- `/check_due_care`
- `/save_call_context`
- `/notify_emergency_team`
- `/webhooks/call-completed`

Keep `postcall_webhook` out of on-call tools; use Event Subscription instead.

## Known External Blocker

Emergency phone transfer still requires an inbound-enabled Ringg number attached to `vetra_RinggMirror`. Webcall tests can trigger emergency classification and notification, but they cannot prove a real PSTN bridge transfer.
