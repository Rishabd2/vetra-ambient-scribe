import {
  ApiError,
  allowMethods,
  rescheduleBooking,
  sendApiError,
  sendJson,
} from '../server/cal/client.js'
import { findLatestAppointment, upsertPatientMemory } from '../server/sample-clinic-data.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  try {
    const input = req.body || {}
    const latest = await findLatestAppointment(input)
    const bookingUid = firstText(input, ['cal_booking_uid', 'booking_uid', 'bookingUid'], latest?.appointment?.booking_uid)
    if (!bookingUid) {
      throw new ApiError(400, 'No Cal.com booking UID found. Look up the patient first, then ask which appointment they want to reschedule.')
    }
    validateRescheduleInput(input)

    const result = await rescheduleBooking(bookingUid, input)
    const booking = {
      ...(result.booking || {}),
      status: 'rescheduled',
      previous_booking_uid: bookingUid,
    }
    await upsertPatientMemory({
      ...input,
      appointment_date: booking.date || result.requested?.date,
      appointment_time: booking.time || result.requested?.time,
      booking_status: 'rescheduled',
      cal_booking_uid: booking.uid,
      previous_booking_uid: bookingUid,
      booking,
      rescheduling_reason: firstText(input, ['rescheduling_reason', 'reschedule_reason', 'reason']) || 'Rescheduled by caller.',
    })

    res.setHeader('Cache-Control', 'no-store, max-age=0')
    sendJson(res, 200, {
      connected: true,
      rescheduled: true,
      booking,
      previous_booking_uid: bookingUid,
      message: `Rescheduled Cal.com booking ${bookingUid} to ${booking.date} at ${booking.time}.`,
    })
  } catch (error) {
    sendApiError(res, error)
  }
}

function validateRescheduleInput(input) {
  const explicitStart = firstText(input, ['start', 'startIso', 'start_iso', 'slotStart', 'start_time', 'appointment_start'])
  const date = firstText(input, ['date', 'appointment_date', 'preferred_date'])
  const time = firstText(input, ['time', 'appointment_time', 'appointment_request', 'preferred_time'])
  if (!explicitStart && !(date && time)) {
    throw new ApiError(400, 'Missing required reschedule fields: appointment_date_and_time. Check availability, choose a returned slot, then call reschedule again.')
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
