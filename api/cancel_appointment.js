import {
  ApiError,
  allowMethods,
  cancelBooking,
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
      throw new ApiError(400, 'No Cal.com booking UID found. Look up the patient first, then ask which appointment they want to cancel.')
    }

    const result = await cancelBooking(bookingUid, input)
    const booking = {
      ...(result.booking || {}),
      uid: result.booking?.uid || bookingUid,
      status: 'cancelled',
      date: result.booking?.date || latest?.appointment?.date || '',
      time: result.booking?.time || latest?.appointment?.time || '',
    }
    await upsertPatientMemory({
      ...input,
      appointment_date: booking.date,
      appointment_time: booking.time,
      booking_status: 'cancelled',
      cal_booking_uid: booking.uid,
      booking,
      cancellation_reason: firstText(input, ['cancellation_reason', 'cancel_reason', 'reason']) || 'Cancelled by caller.',
    })

    res.setHeader('Cache-Control', 'no-store, max-age=0')
    sendJson(res, 200, {
      connected: true,
      cancelled: true,
      canceled: true,
      booking,
      message: `Cancelled Cal.com booking ${booking.uid}.`,
    })
  } catch (error) {
    sendApiError(res, error)
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
