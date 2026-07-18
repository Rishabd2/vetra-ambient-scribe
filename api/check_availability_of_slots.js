import {
  addDaysIso,
  allowMethods,
  getAvailableSlots,
  normalizeDateOnly,
  sendApiError,
  sendJson,
  todayInTimeZone,
} from '../server/cal/client.js'
import { getInputValue, readInput } from '../server/sample-clinic-data.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return
  const input = readInput(req)
  const timeZone = getInputValue(input, ['timeZone', 'timezone']) || process.env.CAL_TIMEZONE || 'America/New_York'
  const start = resolveDate(getInputValue(input, ['date', 'start', 'preferred_date', 'appointment_date', 'day']), timeZone)
  const days = clamp(getInputValue(input, ['days', 'lookahead_days']), 1, 14, 7)
  const end = normalizeDateOnly(getInputValue(input, ['end', 'end_date'])) || addDaysIso(start, days - 1)
  const requestedTime = normalizeTime(getInputValue(input, ['time', 'preferred_time', 'appointment_time']))

  try {
    const result = await getAvailableSlots({ start, end, timeZone })
    const slots = result.slots.slice(0, 80)
    const requestedDateSlots = result.slotsByDate[start] || []
    const requestedAvailable = requestedTime
      ? requestedDateSlots.some((slot) => slot.time === requestedTime)
      : null
    const unavailableDates = result.days.filter((day) => (result.slotsByDate[day] || []).length === 0)

    sendJson(res, 200, {
      connected: true,
      timeZone: result.timeZone,
      start: result.start,
      end: result.end,
      requested_time: requestedTime || '',
      requested_time_available: requestedAvailable,
      available_slots: slots.map((slot) => ({
        date: slot.date,
        time: slot.time,
        start: slot.start,
        startUtc: slot.startUtc,
        label: formatSlot(slot.startUtc, result.timeZone),
      })),
      slot_count_by_date: Object.fromEntries(result.days.map((day) => [day, (result.slotsByDate[day] || []).length])),
      unavailable_dates: unavailableDates,
      next_available: slots[0] || null,
      spoken_summary: summarizeSlots(slots, result.timeZone, requestedTime, requestedAvailable),
    })
  } catch (error) {
    sendApiError(res, error)
  }
}

function resolveDate(value, timeZone) {
  const text = String(value || '').trim().toLowerCase()
  const today = todayInTimeZone(timeZone)
  if (!text || text === 'today') return today
  if (text === 'tomorrow') return addDaysIso(today, 1)
  const iso = normalizeDateOnly(text)
  if (iso) return iso

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const target = weekdays.findIndex((day) => text.includes(day))
  if (target >= 0) {
    const current = new Date(`${today}T00:00:00Z`).getUTCDay()
    const offset = (target - current + 7) % 7 || 7
    return addDaysIso(today, offset)
  }

  return today
}

function summarizeSlots(slots, timeZone, requestedTime, requestedAvailable) {
  if (requestedTime && requestedAvailable === false) {
    const alternatives = slots.slice(0, 3).map((slot) => formatSlot(slot.startUtc, timeZone)).join('; ')
    return alternatives
      ? `${requestedTime} is not available. Earliest alternatives are ${alternatives}.`
      : `${requestedTime} is not available, and no alternate slots were returned.`
  }
  if (requestedTime && requestedAvailable) return `${requestedTime} is available.`
  if (slots.length === 0) return 'No available slots were returned for this date range.'
  return `Earliest available slots are ${slots.slice(0, 3).map((slot) => formatSlot(slot.startUtc, timeZone)).join('; ')}.`
}

function formatSlot(startUtc, timeZone) {
  const date = new Date(startUtc)
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function normalizeTime(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return ''
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
  if (!match) return ''
  let hour = Number(match[1])
  const minute = Number(match[2] || 0)
  const ampm = match[3]
  if (ampm === 'pm' && hour < 12) hour += 12
  if (ampm === 'am' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function clamp(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}
