const CAL_BASE_URL = process.env.CAL_API_BASE || 'https://api.cal.com/v2'

export const CAL_API_VERSIONS = {
  eventTypes: process.env.CAL_EVENT_TYPES_API_VERSION || '2024-06-14',
  slots: process.env.CAL_SLOTS_API_VERSION || '2024-09-04',
  bookings: process.env.CAL_BOOKINGS_API_VERSION || '2026-02-25',
}

export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

export function getCalConfig() {
  const eventTypeId = Number(cleanText(process.env.CAL_EVENT_TYPE_ID))
  return {
    apiKey: cleanText(process.env.CAL_API_KEY),
    timeZone: cleanText(process.env.CAL_TIMEZONE || process.env.CAL_TIME_ZONE) || 'America/New_York',
    eventTypeId: Number.isFinite(eventTypeId) && eventTypeId > 0 ? eventTypeId : null,
    eventTypeSlug: cleanText(process.env.CAL_EVENT_TYPE_SLUG),
    username: cleanText(process.env.CAL_USERNAME),
    teamSlug: cleanText(process.env.CAL_TEAM_SLUG),
    organizationSlug: cleanText(process.env.CAL_ORGANIZATION_SLUG || process.env.CAL_ORG_SLUG),
  }
}

export function requireCalConfig() {
  const config = getCalConfig()
  if (!config.apiKey) {
    throw new ApiError(400, 'Set CAL_API_KEY in the server environment before using Cal.com.')
  }
  if (!config.eventTypeId && !(config.eventTypeSlug && (config.username || config.teamSlug))) {
    throw new ApiError(400, 'Set CAL_EVENT_TYPE_ID, or CAL_EVENT_TYPE_SLUG plus CAL_USERNAME/CAL_TEAM_SLUG.')
  }
  return config
}

export async function listEventTypes() {
  const config = requireCalConfig()
  const body = await calFetch('/event-types', {
    apiVersion: CAL_API_VERSIONS.eventTypes,
    query: { sortCreatedAt: 'desc' },
    config,
  })

  return {
    eventTypes: Array.isArray(body?.data) ? body.data.map(normalizeEventType) : [],
    raw: body,
  }
}

export async function getAvailableSlots({ start, end, timeZone, duration } = {}) {
  const config = requireCalConfig()
  const zone = cleanText(timeZone) || config.timeZone
  const startDate = normalizeDateOnly(start) || todayInTimeZone(zone)
  const endDate = normalizeDateOnly(end) || addDaysIso(startDate, 9)
  const query = {
    ...eventTypeQuery(config),
    start: startDate,
    end: endDate,
    timeZone: zone,
    format: 'range',
  }
  if (duration) query.duration = String(duration)

  const body = await calFetch('/slots', {
    apiVersion: CAL_API_VERSIONS.slots,
    query,
    config,
  })
  const slots = normalizeSlots(body?.data || {}, zone)

  return {
    eventType: eventTypeSummary(config),
    timeZone: zone,
    start: startDate,
    end: endDate,
    days: dateRange(startDate, endDate),
    slots,
    slotsByDate: groupSlotsByDate(slots),
    raw: body,
  }
}

export async function createBooking(input = {}, { validateAvailability = true } = {}) {
  const config = requireCalConfig()
  const requested = resolveRequestedStart(input, config)

  if (validateAvailability) {
    const availability = await getAvailableSlots({
      start: requested.date,
      end: requested.date,
      timeZone: requested.timeZone,
      duration: input.duration || input.lengthInMinutes,
    })
    const matchedSlot = availability.slots.find((slot) => sameMinute(slot.startUtc, requested.startUtc))
    if (!matchedSlot) {
      throw new ApiError(409, 'Requested Cal.com slot is no longer available.', {
        requested,
        availableSlots: availability.slots.slice(0, 12),
      })
    }
  }

  const payload = buildBookingPayload(input, requested, config)
  const body = await calFetch('/bookings', {
    method: 'POST',
    apiVersion: CAL_API_VERSIONS.bookings,
    body: payload,
    config,
  })

  return {
    booking: normalizeBooking(body?.data, requested),
    calRequest: {
      eventType: eventTypeSummary(config),
      start: payload.start,
      attendee: {
        name: payload.attendee.name,
        email: payload.attendee.email,
        phoneNumber: payload.attendee.phoneNumber || '',
        timeZone: payload.attendee.timeZone,
      },
    },
    raw: body,
  }
}

export async function cancelBooking(bookingUid, input = {}) {
  const config = requireCalConfig()
  const uid = cleanText(bookingUid)
  if (!uid) throw new ApiError(400, 'Provide cal_booking_uid to cancel an appointment.')

  const body = await calFetch(`/bookings/${encodeURIComponent(uid)}/cancel`, {
    method: 'POST',
    apiVersion: CAL_API_VERSIONS.bookings,
    body: compactObject({
      cancellationReason: cleanText(input.cancellation_reason || input.cancel_reason || input.reason) ||
        'Cancelled by caller through Vetra',
      cancelSubsequentBookings: input.cancel_subsequent_bookings === true ||
        String(input.cancel_subsequent_bookings || '').toLowerCase() === 'true' ||
        undefined,
    }),
    config,
  })

  return {
    booking: normalizeBookingStatus(body?.data, { status: 'cancelled' }),
    raw: body,
  }
}

export async function rescheduleBooking(bookingUid, input = {}, { validateAvailability = true } = {}) {
  const config = requireCalConfig()
  const uid = cleanText(bookingUid)
  if (!uid) throw new ApiError(400, 'Provide cal_booking_uid to reschedule an appointment.')

  const requested = resolveRequestedStart(input, config)
  if (validateAvailability) {
    const availability = await getAvailableSlots({
      start: requested.date,
      end: requested.date,
      timeZone: requested.timeZone,
      duration: input.duration || input.lengthInMinutes,
    })
    const matchedSlot = availability.slots.find((slot) => sameMinute(slot.startUtc, requested.startUtc))
    if (!matchedSlot) {
      throw new ApiError(409, 'Requested Cal.com reschedule slot is no longer available.', {
        requested,
        availableSlots: availability.slots.slice(0, 12),
      })
    }
  }

  const body = await calFetch(`/bookings/${encodeURIComponent(uid)}/reschedule`, {
    method: 'POST',
    apiVersion: CAL_API_VERSIONS.bookings,
    body: compactObject({
      start: requested.startUtc,
      rescheduledBy: cleanText(input.rescheduled_by || input.owner_email || input.email) || 'booking@vetra.ai',
      reschedulingReason: cleanText(input.rescheduling_reason || input.reschedule_reason || input.reason) ||
        'Rescheduled by caller through Vetra',
      emailVerificationCode: cleanText(input.email_verification_code),
    }),
    config,
  })

  return {
    booking: normalizeBookingStatus(body?.data, {
      status: 'rescheduled',
      date: requested.date,
      time: requested.time,
      start: requested.startUtc,
      rescheduledFromUid: uid,
    }),
    requested,
    raw: body,
  }
}

export function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload)
}

export function sendApiError(res, error) {
  if (error instanceof ApiError) {
    sendJson(res, error.statusCode, {
      connected: false,
      error: error.message,
      details: error.details,
    })
    return
  }

  sendJson(res, 500, {
    connected: false,
    error: error instanceof Error ? error.message : 'Cal.com request failed',
  })
}

export function allowMethods(req, res, methods) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', [...methods, 'OPTIONS'].join(', '))
    res.status(204).end()
    return false
  }

  if (!methods.includes(req.method)) {
    res.setHeader('Allow', [...methods, 'OPTIONS'].join(', '))
    res.status(405).json({ error: 'Method not allowed' })
    return false
  }

  return true
}

export function queryParam(value) {
  return Array.isArray(value) ? value[0] : value
}

export function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

export function todayInTimeZone(timeZone) {
  return dateParts(new Date(), timeZone).date
}

export function addDaysIso(date, amount) {
  const [year, month, day] = String(date).split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + amount))
  return next.toISOString().slice(0, 10)
}

export function normalizeDateOnly(value) {
  const text = cleanText(value)
  if (!text) return ''
  const iso = text.match(/\d{4}-\d{2}-\d{2}/)?.[0]
  if (iso) return iso
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return ''
}

function eventTypeQuery(config) {
  if (config.eventTypeId) return { eventTypeId: String(config.eventTypeId) }
  return compactObject({
    eventTypeSlug: config.eventTypeSlug,
    username: config.username,
    teamSlug: config.teamSlug,
    organizationSlug: config.organizationSlug,
  })
}

function eventTypeBody(config) {
  if (config.eventTypeId) return { eventTypeId: config.eventTypeId }
  return compactObject({
    eventTypeSlug: config.eventTypeSlug,
    username: config.username,
    teamSlug: config.teamSlug,
    organizationSlug: config.organizationSlug,
  })
}

function eventTypeSummary(config) {
  return compactObject({
    id: config.eventTypeId,
    slug: config.eventTypeSlug,
    username: config.username,
    teamSlug: config.teamSlug,
    organizationSlug: config.organizationSlug,
  })
}

async function calFetch(path, { method = 'GET', apiVersion, query, body, config }) {
  const url = new URL(path.replace(/^\//, ''), ensureTrailingSlash(CAL_BASE_URL))
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })

  const response = await fetch(url, {
    method,
    headers: compactObject({
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'application/json',
      'Content-Type': body ? 'application/json' : undefined,
      'cal-api-version': apiVersion,
    }),
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  const parsed = parseJson(text)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      cleanText(parsed?.message || parsed?.error?.message || parsed?.error || text) ||
        `Cal.com request failed with ${response.status}`,
      parsed || text,
    )
  }

  return parsed || {}
}

function buildBookingPayload(input, requested, config) {
  const ownerName = cleanText(
    input.ownerName ||
    input.owner_name ||
    input.callerName ||
    input.callee_name ||
    input.attendee?.name ||
    input.name,
  ) || 'Pet owner'
  const phoneNumber = normalizePhone(
    input.phone ||
    input.phoneNumber ||
    input.contactNumber ||
    input.contact_number ||
    input.caller_phone ||
    input.attendee?.phoneNumber,
  )
  const email = cleanText(input.email || input.owner_email || input.attendeeEmail || input.attendee?.email) ||
    fallbackEmail({ ownerName, phoneNumber, callId: input.callId || input.call_id || input.ringgCallId })
  const petName = cleanText(input.petName || input.pet_name || input.pet?.name)
  const issueName = cleanText(input.issueName || input.issue_name || input.reason || input.symptom_description)
  const urgency = cleanText(input.urgency || input.urgency_level)
  const kind = cleanText(input.kind || input.visitType || input.appointment_kind) || 'Pet clinic appointment'
  const duration = Number(input.duration || input.lengthInMinutes)

  return compactObject({
    ...eventTypeBody(config),
    start: requested.startUtc,
    attendee: compactObject({
      name: ownerName,
      email,
      phoneNumber,
      timeZone: requested.timeZone,
      language: 'en',
    }),
    lengthInMinutes: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    metadata: compactObject({
      source: 'vetra_dashboard',
      ringg_call_id: cleanText(input.callId || input.call_id || input.ringgCallId),
      pet_name: petName,
      issue_name: issueName,
      urgency,
      visit_type: kind,
      owner_phone: phoneNumber,
    }),
  })
}

function resolveRequestedStart(input, config) {
  const timeZone = cleanText(input.timeZone || input.timezone || config.timeZone) || config.timeZone
  const explicitStart = cleanText(
    input.start ||
    input.startIso ||
    input.start_iso ||
    input.slotStart ||
    input.start_time ||
    input.appointment_start,
  )
  if (explicitStart) {
    const parsed = new Date(explicitStart)
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiError(400, 'Booking start must be a valid ISO date-time.')
    }
    const startUtc = parsed.toISOString()
    return {
      startUtc,
      timeZone,
      ...dateParts(parsed, timeZone),
    }
  }

  const date = normalizeDateOnly(input.date || input.appointment_date || input.preferred_date)
  const time = normalizeTime(input.time || input.appointment_time || input.appointment_request || input.preferred_time)
  if (!date || !time) {
    throw new ApiError(400, 'Provide a booking start, or both date and time.')
  }

  const startUtc = zonedDateTimeToUtc(date, time, timeZone)
  return {
    startUtc,
    timeZone,
    date,
    time,
  }
}

function normalizeEventType(eventType) {
  return {
    id: eventType.id,
    title: eventType.title || eventType.slug || `Event type ${eventType.id}`,
    slug: eventType.slug,
    duration: eventType.lengthInMinutes,
    bookingUrl: eventType.bookingUrl,
    hidden: Boolean(eventType.hidden),
  }
}

function normalizeSlots(data, timeZone) {
  return Object.entries(data || {}).flatMap(([dateKey, values]) => {
    if (!Array.isArray(values)) return []
    return values.map((item) => {
      const start = typeof item === 'string' ? item : item?.start
      const end = typeof item === 'string' ? '' : item?.end
      const parsedStart = new Date(start)
      if (!start || Number.isNaN(parsedStart.getTime())) return null
      const local = dateParts(parsedStart, timeZone)
      return compactObject({
        id: `${local.date}-${local.time}`,
        date: local.date || dateKey,
        time: local.time,
        label: formatSlotLabel(parsedStart, timeZone),
        start,
        startUtc: parsedStart.toISOString(),
        end,
        endUtc: end && !Number.isNaN(new Date(end).getTime()) ? new Date(end).toISOString() : '',
      })
    }).filter(Boolean)
  }).sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc))
}

function normalizeBooking(data, requested) {
  const booking = Array.isArray(data) ? data[0] : data || {}
  const start = booking.start || requested.startUtc
  const parsedStart = new Date(start)
  const local = Number.isNaN(parsedStart.getTime()) ? requested : dateParts(parsedStart, requested.timeZone)
  return compactObject({
    id: booking.id,
    uid: booking.uid,
    status: booking.status,
    title: booking.title,
    start,
    end: booking.end,
    date: local.date,
    time: local.time,
    duration: booking.duration,
    eventTypeId: booking.eventTypeId || booking.eventType?.id,
  })
}

function normalizeBookingStatus(data, overrides = {}) {
  const booking = Array.isArray(data) ? data[0] : data || {}
  const start = booking.start || overrides.start
  const parsedStart = new Date(start)
  const local = Number.isNaN(parsedStart.getTime())
    ? { date: overrides.date, time: overrides.time }
    : dateParts(parsedStart, cleanText(overrides.timeZone) || getCalConfig().timeZone)
  return compactObject({
    id: booking.id,
    uid: booking.uid || booking.rescheduledToUid || overrides.uid,
    status: overrides.status || booking.status,
    title: booking.title,
    start,
    end: booking.end,
    date: local.date,
    time: local.time,
    duration: booking.duration,
    eventTypeId: booking.eventTypeId || booking.eventType?.id,
    cancellationReason: booking.cancellationReason,
    reschedulingReason: booking.reschedulingReason,
    rescheduledFromUid: booking.rescheduledFromUid || overrides.rescheduledFromUid,
    rescheduledToUid: booking.rescheduledToUid,
  })
}

function groupSlotsByDate(slots) {
  return slots.reduce((groups, slot) => {
    ;(groups[slot.date] ||= []).push(slot)
    return groups
  }, {})
}

function dateRange(start, end) {
  const dates = []
  let cursor = normalizeDateOnly(start)
  const last = normalizeDateOnly(end) || cursor
  while (cursor && cursor <= last && dates.length < 45) {
    dates.push(cursor)
    cursor = addDaysIso(cursor, 1)
  }
  return dates
}

function zonedDateTimeToUtc(date, time, timeZone) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0)
  const offset = getTimeZoneOffsetMs(new Date(guess), timeZone)
  let utc = guess - offset
  const correctedOffset = getTimeZoneOffsetMs(new Date(utc), timeZone)
  if (correctedOffset !== offset) utc = guess - correctedOffset
  return new Date(utc).toISOString()
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  const asUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(value.hour),
    Number(value.minute),
    Number(value.second),
  )
  return asUtc - date.getTime()
}

function dateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}`,
  }
}

function formatSlotLabel(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function normalizeTime(value) {
  const text = cleanText(value).toLowerCase()
  if (!text || /flexible|none|unknown|n\/a|na/.test(text)) return ''
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

function normalizePhone(value) {
  const text = cleanText(value)
  if (!text || /unknown|none|declined/i.test(text)) return ''
  if (text.startsWith('+')) return `+${text.replace(/[^\d]/g, '')}`
  const digits = text.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

function fallbackEmail({ ownerName, phoneNumber, callId }) {
  const configured = cleanText(process.env.CAL_FALLBACK_ATTENDEE_EMAIL)
  if (configured) return configured
  const safeId = cleanText(phoneNumber || callId || ownerName || 'caller')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40) || 'caller'
  return `booking+${safeId}@vetra.ai`
}

function sameMinute(a, b) {
  const left = new Date(a).getTime()
  const right = new Date(b).getTime()
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false
  return Math.floor(left / 60000) === Math.floor(right / 60000)
}

function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function parseJson(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function cleanText(value) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  if (/^\[[^\]]+\]$/.test(text)) return ''
  if (/^@\{\{[^}]+\}\}$/.test(text)) return ''
  if (/^(undefined|null)$/i.test(text)) return ''
  return text
}
