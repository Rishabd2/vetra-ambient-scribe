import {
  ApiError,
  allowMethods,
  createBooking,
  sendApiError,
  sendJson,
} from '../server/cal/client.js'
import { upsertPatientMemory } from '../server/sample-clinic-data.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  try {
    const input = req.body || {}
    validateBookingInput(input)
    const result = await createBooking(input)
    await upsertPatientMemory({
      ...input,
      appointment_date: result.booking?.date || input.appointment_date,
      appointment_time: result.booking?.time || input.appointment_time,
      booking_status: result.booking?.status || 'booked',
      cal_booking_uid: result.booking?.uid,
      booking: result.booking,
      last_summary: `${firstText(input, ['petName', 'pet_name'], input.pet?.name) || 'Pet'} was booked through Cal.com.`,
      open_followups: 'Confirm visit outcome and update care plan after appointment.',
    })
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    sendJson(res, 200, {
      connected: true,
      booked: true,
      booking: result.booking,
      calRequest: result.calRequest,
      message: result.booking?.uid
        ? `Booked in Cal.com with booking UID ${result.booking.uid}.`
        : 'Booked in Cal.com.',
    })
  } catch (error) {
    sendApiError(res, error)
  }
}

function validateBookingInput(input) {
  const missing = []
  if (!firstText(input, ['ownerName', 'owner_name', 'callerName', 'callee_name', 'name'], input.attendee?.name)) {
    missing.push('owner_name')
  }
  if (!firstText(input, ['petName', 'pet_name'], input.pet?.name)) missing.push('pet_name')
  if (!firstText(input, ['phone', 'phoneNumber', 'contactNumber', 'contact_number', 'caller_phone'], input.attendee?.phoneNumber)) {
    missing.push('contact_number')
  }

  const explicitStart = firstText(input, ['start', 'startIso', 'start_iso', 'slotStart', 'start_time', 'appointment_start'])
  const date = firstText(input, ['date', 'appointment_date', 'preferred_date'])
  const time = firstText(input, ['time', 'appointment_time', 'appointment_request', 'preferred_time'])
  if (!explicitStart && !(date && time)) missing.push('appointment_date_and_time')

  if (missing.length) {
    throw new ApiError(400, `Missing required booking fields: ${missing.join(', ')}. Ask the caller for the missing detail, then call the booking tool again.`)
  }
}

function firstText(input, keys, fallback = '') {
  for (const key of keys) {
    const value = input[key]
    const text = meaningfulText(value)
    if (text) return text
  }
  return meaningfulText(fallback)
}

function meaningfulText(value) {
  if (value === undefined || value === null) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (/^\[[^\]]+\]$/.test(text)) return ''
  if (/^@\{\{[^}]+\}\}$/.test(text)) return ''
  if (/^(undefined|null)$/i.test(text)) return ''
  return text
}
