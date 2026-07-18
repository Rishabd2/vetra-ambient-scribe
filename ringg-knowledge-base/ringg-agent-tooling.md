# Ringg Assistant Tooling Notes

Use these deployed URLs after the Vercel deployment is live.

## On-call tools

## Custom variables and web tester

Keep Ringg custom variables minimal:

- none

Do not add `caller_phone` or captured call fields such as `owner_name`, `pet_name`, `contact_number`, `appointment_date`, `appointment_time`, or `start_iso` as assistant-level custom variables. Ringg's web tester treats assistant-level custom variables as pre-call form inputs, so assistant custom variables should stay empty for this MVP.

For API tool bodies:

- Use `dynamic` for values the agent should extract from the live conversation or from prior tool results.
- Use `static` only for constants such as timezone, day count, or fixed urgency values.
- There should be no API body entries with `type: variable` in the web-test MVP. If a real inbound phone call exposes caller ID later, keep patient lookup robust by matching on captured owner and pet name too.

Keep:

lookup_patient
https://YOUR_DEPLOYMENT_URL/lookup_patient
Method: POST
Body:
- caller_phone: type `dynamic`, description `Inbound caller phone if available from the call context; blank in web tests.`
- owner_name: type `dynamic`, description `Owner name stated or corrected by the caller; blank if not known yet.`
- pet_name: type `dynamic`, description `Pet name stated by the caller; blank if not known yet.`

check_availability_of_slots
https://YOUR_DEPLOYMENT_URL/check_availability_of_slots
Method: POST
Body:
- date: type `dynamic`, description `Preferred appointment date/day requested by the caller. Use YYYY-MM-DD if resolved; blank for today/default.`
- time: type `dynamic`, description `Preferred appointment time requested by the caller, if any.`
- days: type `static`, value `7`
- timezone: type `static`, value `America/New_York`

book_appointment
https://YOUR_DEPLOYMENT_URL/book_appointment
Method: POST
Body:
- owner_name: type `dynamic`, description `Owner name from the current conversation.`
- pet_name: type `dynamic`, description `Pet name being booked.`
- contact_number: type `dynamic`, description `Best callback/confirmation number confirmed by the caller.`
- appointment_date: type `dynamic`, description `Date of the selected available slot returned by check_availability_of_slots.`
- appointment_time: type `dynamic`, description `Time of the selected available slot returned by check_availability_of_slots.`
- start_iso: type `dynamic`, description `Exact start or startUtc ISO timestamp for the selected slot returned by check_availability_of_slots.`
- issue_name: type `dynamic`, description `Reason for visit or symptom/service requested.`
- urgency_level: type `dynamic`, description `Emergency, Urgent, or Routine based on the call flow.`
- timezone: type `static`, value `America/New_York`

The backend URL is `/book_appointment`; the professional tool name should be `book_appointment`.

cancel_appointment
https://YOUR_DEPLOYMENT_URL/cancel_appointment
Method: POST
Body:
- cal_booking_uid: type `dynamic`, description `Cal.com booking UID from latest_appointment/cal_booking_uid returned by lookup_patient, or the current call booking result.`
- owner_name: type `dynamic`, description `Owner name from the current conversation.`
- pet_name: type `dynamic`, description `Pet name for the appointment being cancelled.`
- contact_number: type `dynamic`, description `Best callback/confirmation number if known.`
- cancellation_reason: type `dynamic`, description `Brief reason the caller wants to cancel, if stated.`

reschedule_appointment
https://YOUR_DEPLOYMENT_URL/reschedule_appointment
Method: POST
Body:
- cal_booking_uid: type `dynamic`, description `Cal.com booking UID from latest_appointment/cal_booking_uid returned by lookup_patient, or the current call booking result.`
- owner_name: type `dynamic`, description `Owner name from the current conversation.`
- pet_name: type `dynamic`, description `Pet name for the appointment being rescheduled.`
- contact_number: type `dynamic`, description `Best callback/confirmation number if known.`
- appointment_date: type `dynamic`, description `Date of the newly selected available slot returned by check_availability_of_slots.`
- appointment_time: type `dynamic`, description `Time of the newly selected available slot returned by check_availability_of_slots.`
- start_iso: type `dynamic`, description `Exact start or startUtc ISO timestamp for the newly selected slot returned by check_availability_of_slots.`
- rescheduling_reason: type `dynamic`, description `Brief reason the caller wants to reschedule, if stated.`
- timezone: type `static`, value `America/New_York`

check_due_care
https://YOUR_DEPLOYMENT_URL/check_due_care
Method: POST
Body:
- caller_phone: type `dynamic`, description `Inbound caller phone if available from the call context; blank in web tests.`
- owner_name: type `dynamic`, description `Owner name from the current conversation or lookup result.`
- pet_name: type `dynamic`, description `Pet name from the current conversation or lookup result.`

save_call_context
https://YOUR_DEPLOYMENT_URL/save_call_context
Method: POST
Body:
- phone: type `dynamic`, description `Best callback/confirmation number confirmed by the caller.`
- caller_phone: type `dynamic`, description `Inbound caller phone if available from the call context; blank in web tests.`
- owner_name: type `dynamic`, description `Owner name from the current conversation.`
- pet_name: type `dynamic`, description `Pet name from the current conversation.`
- pet_species: type `dynamic`, description `Pet species from the current conversation or lookup result.`
- pet_age: type `dynamic`, description `Pet age from the current conversation or lookup result.`
- issue_name: type `dynamic`, description `Reason for call or symptom/service requested.`
- urgency_level: type `dynamic`, description `Emergency, Urgent, or Routine based on the call flow.`
- appointment_request: type `dynamic`, description `Booked/requested appointment date and time, if any.`
- last_summary: type `dynamic`, description `One or two sentence summary of the call outcome.`
- open_followups: type `dynamic`, description `Any open follow-ups for the clinic team.`
- escalate: type `static`, value `false`

notify_emergency_team
https://YOUR_DEPLOYMENT_URL/notify_emergency_team
Method: POST
Body:
- caller_phone: type `dynamic`, description `Inbound caller phone if available from the call context; blank in web tests.`
- contact_number: type `dynamic`, description `Best callback number captured before emergency transfer, if available.`
- owner_name: type `dynamic`, description `Owner/caller name, if known.`
- pet_name: type `dynamic`, description `Pet name, if known.`
- owner_location: type `dynamic`, description `Caller location if captured during emergency routing.`
- selected_hospital: type `dynamic`, description `Emergency hospital or routing destination; use Vetra Emergency Routing if unspecified.`
- issue_name: type `dynamic`, description `Emergency symptom or red-flag reason.`
- urgency_level: type `static`, value `Emergency`

call_transfer
Built-in Ringg tool, not a custom API URL.
Enable it as an on-call tool with:
- destination label/name: `Vetra Emergency Routing`
- destination target: `+918696816868`
- destination type: `phone_number`
- business hours: `00:00` to `23:59`, timezone `Asia/Kolkata`
- summary before transfer: enabled
- post-transfer behavior: `end_call`

Emergency transfer prerequisite:
- The assistant must have an inbound-enabled Ringg number attached. Webcalls can classify the emergency and run `notify_emergency_team`, but they cannot prove a real bridge transfer because there is no live PSTN call leg.
- In this workspace, Ringg currently reports both available numbers as `is_inbound_enabled: false`. Attempting to attach the Indian workspace number `+912268095634` fails with `Inbound is not enabled for this number.`
- Ask Ringg support or the workspace admin to enable inbound on `+912268095634`, or buy/import an inbound-capable number, then attach it to `vetra_RinggMirror` as the inbound assistant number.

Important: do not type `[owner_name]` or `[appointment_time]` as static values in the Ringg body editor. Static bracket text is sent literally. Use Ringg's dynamic field mode for all conversation/call-context values. Use static mode only for constants.

Remove from on-call tools:

postcall_webhook
https://YOUR_DEPLOYMENT_URL/webhooks/call-completed

Move this URL to Event Subscription / call completed webhook instead of making it an on-call tool.

Optional fallback tool:

clinic_faq
https://YOUR_DEPLOYMENT_URL/clinic_faq

Use this only if the Knowledge Base is not answering basic clinic FAQs well.

## Required Ringg Dashboard Changes

1. Knowledge Base: attach `Vetra Sample Clinic Knowledge Base`.
2. On-call tools: add `check_availability_of_slots`.
3. On-call tools: use the professional tool name `book_appointment`.
4. On-call tools: add `cancel_appointment` and `reschedule_appointment`.
5. On-call tools: enable built-in `call_transfer` for emergency routing to `+918696816868`.
6. On-call tools: remove `postcall_webhook`.
7. Event Subscription: add call-completed webhook `https://YOUR_DEPLOYMENT_URL/webhooks/call-completed`.
8. For every on-call API tool, configure the body mappings above. Empty body mappings are not production-safe.
9. Custom Variables: leave empty so the web tester does not show a pre-call form.
10. Numbers: attach an inbound-enabled Ringg number to `vetra_RinggMirror`. The emergency destination number is `+918696816868`, but the assistant also needs its own inbound-enabled caller number before Ringg can bridge-transfer a live call.

## Prompt patch

Replace "retrieve_previous_memory" with "lookup_patient" in STEP 1.

Before offering a specific routine or urgent appointment time, call check_availability_of_slots with the requested date or day. Only offer slots returned by the tool. If the caller asks for a time that is not returned, say that time is not showing as available and offer the earliest two or three returned slots.

Before creating a booking, call book_appointment with start_iso or date/time, owner_name, pet_name, contact_number, issue_name, and urgency_level. The booking tool validates the Cal.com slot again before creating the booking.

Use the Ringg Knowledge Base for general clinic FAQ, hours, services, policies, records, and emergency routing rules. Use lookup_patient for caller-specific memory because patient memory changes over time and should be deterministic.

After the booking is settled, call check_due_care. If a high-priority due-care item is returned, offer once to add it to the same visit.

For emergencies, do not collect any more details after a red flag appears. Say: "I am routing you to the nearest emergency clinic now. Please stay on the line." Then call notify_emergency_team with whatever is already known, then use Ringg's built-in call_transfer tool to transfer to Vetra Emergency Routing. The transfer destination target is +918696816868.

For cancellations, call lookup_patient first if needed to retrieve cal_booking_uid/latest_appointment, then call cancel_appointment. Only say the booking is cancelled after the tool succeeds.

For rescheduling, call lookup_patient first if needed to retrieve cal_booking_uid/latest_appointment, then call check_availability_of_slots and reschedule_appointment with the exact returned slot date/time/start.
