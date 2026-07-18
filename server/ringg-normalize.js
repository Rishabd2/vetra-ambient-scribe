export const DEFAULT_RINGG_AGENT_ID = '864b0c36-7b52-4f42-9aeb-77445f37b7b2'
export const DEFAULT_RINGG_AGENT_NAME = 'vetra_RinggMirror'

const ACTIVE_STATUSES = new Set(['registered', 'queued', 'initiated', 'ringing', 'ongoing', 'in-progress', 'retry'])
const MISSED_STATUSES = new Set(['failed', 'error', 'cancelled', 'canceled', 'busy', 'no-answer', 'no_answer'])

export function normalizeRinggCall(historyCall = {}, detailPayload = {}, fallbackAgent = {}) {
  const detail = detailPayload?.data || detailPayload || {}
  const call = mergeDeep(historyCall, detail)
  const custom = normalizedObject(
    call.custom_args_values ||
    call.custom_variables ||
    call.customVariables ||
    call.variables ||
    {},
  )
  const platformAnalysis = normalizedObject(call.platform_analysis || call.platformAnalysis || call.analysis_data || {})
  const clientAnalysis = normalizedObject(call.client_analysis || call.clientAnalysis || {})
  const transcript = parseRinggTranscript(
    call.transcript ||
    call.transcription_url ||
    call.transcription ||
    call.messages ||
    [],
  )

  const agent = call.agent || {}
  const agentId = cleanText(call.agent_id || call.agentId || agent.id || fallbackAgent.id || DEFAULT_RINGG_AGENT_ID)
  const agentName = cleanText(
    call.agent_name ||
    call.agentName ||
    agent.agent_name ||
    agent.agent_display_name ||
    fallbackAgent.name ||
    DEFAULT_RINGG_AGENT_NAME,
  )
  const callId = cleanText(call.call_id || call.id || call.callSid || call.call_sid)
  const callState = cleanText(call.call_status || call.status || call.callStatus || 'unknown').toLowerCase()
  const calledAt =
    cleanText(call.called_on || call.call_attempt_time || call.created_at || call.initiation_time || call.initiated_at) ||
    new Date().toISOString()
  const duration = Number(call.call_duration || call.duration || call.conversation_duration || 0)
  const classification = cleanText(
    fromNormalized(clientAnalysis, 'classification') ||
    fromNormalized(platformAnalysis, 'classification') ||
    fromNormalized(custom, 'classification'),
  )
  const keyPoints = arrayFrom(
    fromNormalized(platformAnalysis, 'key_points') ||
    fromNormalized(custom, 'key_points'),
  )
  const actionItems = arrayFrom(
    fromNormalized(platformAnalysis, 'action_items') ||
    fromNormalized(custom, 'action_items'),
  )
  const summary =
    cleanText(fromNormalized(platformAnalysis, 'summary')) ||
    cleanText(fromNormalized(clientAnalysis, 'summary')) ||
    cleanText(call.summary) ||
    keyPoints.join(' ') ||
    cleanText(fromNormalized(custom, 'last_summary')) ||
    summarizeTranscript(transcript) ||
    fallbackSummary(callState, agentName)
  const analysisText = [
    summary,
    keyPoints.join(' '),
    actionItems.join(' '),
  ].filter(Boolean).join(' ')
  const issue = cleanText(fromNormalized(custom, 'issue_name') || fromNormalized(custom, 'symptom_description'))
  const textForInference = [
    classification,
    analysisText,
    fromNormalized(custom, 'urgency_level'),
    fromNormalized(custom, 'open_followups'),
  ].filter(Boolean).join(' ')
  const urgency = inferUrgency(textForInference)
  const booked = getBooking({ custom, classification, calledAt, urgency, analysisText })
  const nextActions = inferNextActions({
    actionItems,
    callState,
    urgency,
    booked,
    custom,
    platformAnalysis,
    agentName,
  })
  const status = mapDashboardStatus(callState, urgency, booked, nextActions)
  const coverage = mapCoverage(callState, urgency, booked, status, duration, nextActions)
  const callerName =
    cleanText(fromNormalized(custom, 'owner_name')) ||
    cleanText(call.callee_name || call.name || fromNormalized(custom, 'callee_name')) ||
    inferCallerName(analysisText) ||
    'Unknown caller'
  const phone =
    cleanText(fromNormalized(custom, 'contact_number')) ||
    cleanText(fromNormalized(custom, 'caller_phone')) ||
    cleanText(fromNormalized(custom, 'mobile_number')) ||
    cleanText(call.inbound_from || call.to_number || call.from_number) ||
    inferPhone(analysisText) ||
    'Unknown number'
  const petName = cleanText(fromNormalized(custom, 'pet_name')) || inferPetName(analysisText) || 'Unknown pet'
  const species = normalizeSpecies(cleanText(fromNormalized(custom, 'pet_species')) || inferSpecies(analysisText))

  return {
    id: shortId(callId),
    executionId: callId,
    source: 'ringg',
    real: true,
    live: ACTIVE_STATUSES.has(callState),
    callState: callState || 'unknown',
    callType: cleanText(call.call_type || call.call_direction || call.callDirection),
    agentId,
    agentName,
    clinic: 'small',
    status,
    urgency,
    coverage,
    caller: {
      name: callerName,
      phone,
    },
    pet: {
      name: petName,
      species,
      breed: normalizeUnknown(fromNormalized(custom, 'pet_breed')),
      age: normalizeUnknown(fromNormalized(custom, 'pet_age')),
    },
    reason: issue || inferReason(summary, urgency, callState, agentName),
    summary,
    receivedAt: calledAt,
    duration,
    estValue: estimateValue(urgency, coverage),
    booked,
    nextActions,
    transcript: transcript.length > 0 ? transcript : liveTranscript(callState, agentName),
    referral: getReferral({ custom, platformAnalysis, classification }),
    recordingUrl: call.recording_url || call.audio_recording || null,
    updatedAt: cleanText(call.updated_at || call.completed_at || call.called_on || call.created_at) || null,
  }
}

export function appointmentsFromCalls(calls) {
  const appointments = new Map()
  calls
    .filter((call) => call.booked)
    .forEach((call) => {
      const appointment = {
      id: `ap-${call.id}-${call.booked.time.replace(':', '')}`,
      date: call.booked.date,
      time: call.booked.time,
      dur: 30,
      pet: call.pet.name,
      owner: call.caller.name,
      kind: call.booked.kind || 'Ringg appointment request',
      source: 'agent',
      callId: call.id,
      executionId: call.executionId,
      }
      const key = `${appointment.date}-${appointment.time}-${normalizeKey(appointment.pet)}`
      const existing = appointments.get(key)
      if (!existing || (isUnknown(existing.owner) && !isUnknown(appointment.owner))) {
        appointments.set(key, appointment)
      }
    })
  return Array.from(appointments.values())
}

export function followupsFromCalls(calls) {
  return calls.flatMap((call) => {
    const steps = []
    const at = call.updatedAt || call.receivedAt

    if (call.referral?.sent) {
      steps.push({ channel: 'Phone', label: call.referral.subject || 'Emergency team notified', at, status: 'sent' })
    }

    if (call.booked) {
      steps.push(
        { channel: 'SMS', label: `Slot confirmation request - ${call.booked.date}, ${call.booked.time}`, at, status: 'scheduled' },
        { channel: 'SMS', label: 'Appointment reminder after clinic confirms', at: `${call.booked.date}T09:00:00+05:30`, status: 'scheduled' },
      )
    }

    ;(call.nextActions || []).filter((action) => !action.done).slice(0, 2).forEach((action) => {
      steps.push({ channel: action.type === 'message' ? 'SMS' : 'Phone', label: action.label, at, status: 'scheduled' })
    })

    if (steps.length === 0) return []
    return [{ id: `fu-${call.id}`, petOwner: `${call.caller.name} · ${call.pet.name}`, callId: call.id, steps }]
  })
}

export function memoryRowsFromCalls(calls) {
  const rows = new Map()
  calls
    .slice()
    .sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt))
    .forEach((call) => {
      const open = (call.nextActions || []).filter((action) => !action.done).map((action) => action.label)
      const key = `${call.caller.phone || call.executionId}-${call.pet.name || call.id}`
      rows.set(key, {
        phone: call.caller.phone,
        caller: call.caller.name,
        pet: call.pet.name,
        species: call.pet.species,
        breed: call.pet.breed,
        age: call.pet.age,
        lastSummary: call.summary,
        openFollowups: open.length > 0 ? open.join(' · ') : '—',
        lastAgent: call.agentName || DEFAULT_RINGG_AGENT_NAME,
        updatedAt: call.updatedAt || call.receivedAt,
      })
    })
  return Array.from(rows.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function inferDashboardDate(calls, appointments) {
  const appointmentDate = appointments.find((appointment) => appointment.date)?.date
  if (appointmentDate) return appointmentDate
  const callDate = calls.find((call) => call.receivedAt)?.receivedAt
  if (callDate) return callDate.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function parseRinggTranscript(value) {
  const rows = parseMaybeJson(value)
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => {
      if (Array.isArray(row) && row.length >= 2) return row
      if (!row || typeof row !== 'object') return null
      const bot = cleanText(row.bot || row.agent || row.assistant)
      const user = cleanText(row.user || row.caller || row.human)
      if (bot) return ['agent', bot]
      if (user) return ['caller', user]
      const role = cleanText(row.role || row.speaker).toLowerCase()
      const text = cleanText(row.content || row.text || row.message)
      if (!text) return null
      return [/bot|agent|assistant/.test(role) ? 'agent' : 'caller', text]
    })
    .filter(Boolean)
}

function getBooking({ custom, classification, calledAt, urgency, analysisText = '' }) {
  const text = cleanText(analysisText)
  const hasCustomBooking = Boolean(
    fromNormalized(custom, 'appointment_time') ||
    fromNormalized(custom, 'appointment_request') ||
    fromNormalized(custom, 'preferred_time') ||
    fromNormalized(custom, 'appointment_date') ||
    fromNormalized(custom, 'preferred_date'),
  )
  if (!hasCustomBooking && !hasConfirmedBookingSignal(classification, text)) return null

  const appointmentText = cleanText(
    fromNormalized(custom, 'appointment_time') ||
    fromNormalized(custom, 'appointment_request') ||
    fromNormalized(custom, 'preferred_time') ||
    inferAppointmentTime(text),
  )
  const appointmentDate = cleanText(
    fromNormalized(custom, 'appointment_date') ||
    fromNormalized(custom, 'preferred_date') ||
    inferAppointmentDate(text, calledAt),
  )

  const date = normalizeDate(appointmentDate, calledAt)
  const time = normalizeTime(appointmentText)
  if (!date || !time) return null

  const kind = urgency === 'urgent'
    ? 'Same-day urgent request'
    : urgency === 'emergency'
      ? 'Emergency intake'
      : 'Routine appointment request'

  return { date, time, kind }
}

function hasConfirmedBookingSignal(classification, text) {
  const label = cleanText(classification)
  const value = cleanText(text)
  if (/booking_scheduled|appointment_scheduled/i.test(label)) return true
  if (/callback_requested|wrong_number|emergency_routed|failed/i.test(label)) return false
  if (/\b(no slot was confirmed|could not be confirmed|not confirmed|not booked|unable to book|failed to book|will reach out|asked for a callback)\b/i.test(value)) {
    return false
  }
  return (
    /\b(?:appointment|visit|slot)\s+(?:is\s+)?(?:booked|confirmed|scheduled|finalized)\b/i.test(value) ||
    /\bbooked\s+(?:for\s+)?[A-Z][A-Za-z'-]+(?:'s)?\b/i.test(value) ||
    /\bconfirmation was sent\b/i.test(value) ||
    /\bcaller selected\b[^.]*\bslot\b/i.test(value)
  )
}

function inferNextActions({ actionItems, callState, urgency, booked, custom, platformAnalysis, agentName }) {
  if (ACTIVE_STATUSES.has(callState)) {
    return [{ id: 'live-monitor', label: `Monitor live ${agentName} call`, type: 'review', done: false }]
  }

  const actions = actionItems.map((label, index) => ({
    id: `ringg-action-${index + 1}`,
    label,
    type: actionType(label),
    done: false,
  }))

  const openFollowups = cleanText(fromNormalized(custom, 'open_followups'))
  if (openFollowups && !/^no|none|false|n\/a|na$/i.test(openFollowups)) {
    actions.push({ id: 'open-followups', label: openFollowups, type: 'callback', done: false })
  }

  const callbackTime = cleanText(
    fromNormalized(platformAnalysis, 'callback_requested_time') ||
    fromNormalized(custom, 'callback_time'),
  )
  if (callbackTime) {
    actions.push({ id: 'callback-requested', label: `Callback requested at ${callbackTime}`, type: 'callback', done: false })
  }

  if (urgency === 'emergency' && actions.length === 0) {
    actions.push(
      { id: 'er-outcome', label: 'Confirm emergency handoff outcome', type: 'callback', done: false },
      { id: 'er-followup', label: 'Send emergency follow-up instructions', type: 'message', done: false },
    )
  }

  if (urgency === 'urgent' && !booked && actions.length === 0) {
    actions.push(
      { id: 'urgent-review', label: 'Review urgent intake', type: 'review', done: false },
      { id: 'urgent-book', label: 'Book same-day visit if needed', type: 'book', done: false },
    )
  }

  return dedupeActions(actions)
}

function getReferral({ custom, platformAnalysis, classification }) {
  const escalate = cleanText(fromNormalized(custom, 'escalate'))
  const needsEmergency =
    /^true|yes|1$/i.test(escalate) ||
    /emergency|handoff|transfer/i.test(classification) ||
    /emergency/i.test(cleanText(fromNormalized(platformAnalysis, 'classification')))

  if (!needsEmergency) return null

  return {
    sent: true,
    subject: 'Emergency team notified',
    text: 'Ringg marked this call for emergency follow-up.',
  }
}

function mapDashboardStatus(callState, urgency, booking, nextActions) {
  if (ACTIVE_STATUSES.has(callState)) return 'unreviewed'
  if (MISSED_STATUSES.has(callState)) return 'reviewed'
  if ((nextActions || []).length > 0) return 'needs_action'
  if (booking) return 'reviewed'
  if (urgency === 'emergency' || urgency === 'urgent') return 'needs_action'
  return 'unreviewed'
}

function mapCoverage(callState, urgency, booking, status, duration, nextActions) {
  if (MISSED_STATUSES.has(callState) || duration < 5) return 'missed'
  if (ACTIVE_STATUSES.has(callState)) return 'at_risk'
  if ((nextActions || []).length > 0 || status === 'needs_action') return 'at_risk'
  if (booking || urgency === 'routine') return 'covered'
  return 'at_risk'
}

function inferUrgency(text) {
  const value = String(text || '').toLowerCase()
  if (/emergency_routed|emergency_transfer|emergency_handoff/.test(value)) return 'emergency'
  if (/urgent_booking_scheduled/.test(value)) return 'urgent'
  if (/routine_booking_scheduled/.test(value)) return 'routine'
  const clinicalText = value.replace(/\b(not an emergency|not emergency|non-emergency|no emergency)\b/g, '')
  if (
    clinicalText.includes('emergency') ||
    clinicalText.includes('escalate=true') ||
    clinicalText.includes('heavy bleeding') ||
    clinicalText.includes('seizure') ||
    clinicalText.includes('collapse') ||
    clinicalText.includes('collapsed') ||
    clinicalText.includes('trouble breathing') ||
    clinicalText.includes('difficulty breathing') ||
    clinicalText.includes('choking') ||
    clinicalText.includes('poison') ||
    clinicalText.includes("can't urinate") ||
    clinicalText.includes('cannot urinate') ||
    clinicalText.includes('blue gums') ||
    clinicalText.includes('unresponsive')
  ) {
    return 'emergency'
  }
  if (
    clinicalText.includes('urgent') ||
    clinicalText.includes('same-day') ||
    clinicalText.includes('same day') ||
    clinicalText.includes('vomit') ||
    clinicalText.includes('blood') ||
    clinicalText.includes('limping') ||
    clinicalText.includes('weak') ||
    clinicalText.includes('pain')
  ) {
    return 'urgent'
  }
  return 'routine'
}

function inferReason(summary, urgency, state, agentName) {
  if (ACTIVE_STATUSES.has(state)) return `${agentName} call in progress`
  const firstSentence = cleanText(summary).split(/[.!?]/)[0]
  if (firstSentence) return truncate(firstSentence, 72)
  return urgency === 'emergency' ? 'Emergency triage call' : `${agentName} intake call`
}

function estimateValue(urgency, coverage) {
  if (coverage === 'missed') return 0
  if (urgency === 'emergency') return 850
  if (urgency === 'urgent') return 240
  return 95
}

function summarizeTranscript(transcript) {
  const callerLine = transcript.find(([role]) => role === 'caller')?.[1]
  if (!callerLine) return ''
  return `Caller said: ${truncate(callerLine, 140)}`
}

function fallbackSummary(status, agentName) {
  return ACTIVE_STATUSES.has(status)
    ? `${agentName} is currently handling this call. Transcript and analysis will update after Ringg finishes processing it.`
    : `${agentName} call loaded from Ringg.`
}

function liveTranscript(status, agentName) {
  return ACTIVE_STATUSES.has(status)
    ? [['agent', `${agentName} is currently on this call. Refresh will update the transcript when Ringg finishes processing it.`]]
    : [['agent', 'No transcript is available for this call yet.']]
}

function inferCallerName(text) {
  const value = String(text || '')
  const patterns = [
    /\bCaller name:\s*([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)/i,
    /\bCaller is\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)/i,
    /\b([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)\s+called\b/,
  ]
  for (const pattern of patterns) {
    const name = cleanInferredName(value.match(pattern)?.[1])
    if (name && !isBlockedName(name)) return name
  }
  return ''
}

function inferPetName(text) {
  const value = String(text || '')
  const patterns = [
    /\b([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)'s\s+(?:appointment|routine|visit|health|symptom|symptoms|concern|vomiting|booking)\b/,
    /\b(?:booked|booking|confirm)\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)'s\b/i,
    /\b(?:about|regarding)\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)(?:'s|\b)/i,
    /\b(?:pet|dog|cat|turtle)\s+(?:named\s+)?([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)/i,
    /\b([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)\s+is\s+(?:a|an|the|\d)/,
    /\b([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)\s+has\s+been\b/,
    /\b(?:pet|dog|cat|turtle),\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)/,
    /\b(?:pet|dog|cat|turtle)\s+named\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)/,
    /named\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)/,
    /for\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?),?\s+(?:a|an|the)\s+(?:[\w-]+\s+){0,5}(?:dog|cat|pet|turtle)/i,
  ]
  for (const pattern of patterns) {
    const match = value.match(pattern)
    const name = cleanInferredName(match?.[1])
    if (name && !isBlockedName(name)) return name
  }
  return ''
}

function inferAppointmentDate(text, fallback) {
  const value = String(text || '')
  const monthMatch = value.match(
    /\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)?,?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i,
  )
  if (monthMatch) {
    const year = monthMatch[3] || fallbackYear(fallback)
    const month = monthNumber(monthMatch[1])
    const day = Number(monthMatch[2])
    if (month && day >= 1 && day <= 31) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  if (/\btomorrow\b/i.test(value)) return addDaysIso(normalizeDate('', fallback), 1)
  if (/\btoday\b/i.test(value)) return normalizeDate('', fallback)

  const weekday = value.match(/\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i)?.[1]
  if (weekday) return nextWeekdayDate(weekday, fallback)

  return ''
}

function inferAppointmentTime(text) {
  const value = String(text || '')
  const candidates = Array.from(value.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi))
  const positive = candidates.filter((match) => {
    const start = Math.max(0, match.index - 80)
    const end = Math.min(value.length, match.index + match[0].length + 80)
    const context = value.slice(start, end)
    return /\b(booked|appointment|visit|slot|selected|confirmed|scheduled)\b/i.test(context)
  })
  const match = (positive.length ? positive : candidates).at(-1)
  if (!match) return ''
  let hour = Number(match[1])
  const minute = Number(match[2] || 0)
  const ampm = match[3].toLowerCase()
  if (ampm === 'pm' && hour < 12) hour += 12
  if (ampm === 'am' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function inferSpecies(text) {
  const value = String(text || '').toLowerCase()
  if (/\bdog\b/.test(value)) return 'Dog'
  if (/\bcat\b/.test(value)) return 'Cat'
  if (/\bturtle\b/.test(value)) return 'Other'
  return ''
}

function inferPhone(text) {
  const match = String(text || '').match(/(?:\+?\d[\d\s().-]{7,}\d)/)
  if (!match) return ''
  return match[0].replace(/[^\d+]/g, '')
}

function cleanInferredName(value) {
  const text = cleanText(value)
  if (!/^[A-Z]/.test(text)) return ''
  return text
    .replace(/'s$/i, '')
    .replace(/[.,;:!?]+$/g, '')
    .trim()
    .split(/\s+/)
    .filter((token) => /^[A-Z][A-Za-z'-]*$/.test(token))
    .join(' ')
}

function isBlockedName(name) {
  return /^(Priya|Pet|Healthcare|Clinic|Ringg|Caller|Owner|The|This|That|They|Team|Emergency|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(cleanText(name))
}

function monthNumber(value) {
  const key = String(value || '').slice(0, 3).toLowerCase()
  return {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  }[key] || 0
}

function fallbackYear(value) {
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date.getUTCFullYear()
  return new Date().getUTCFullYear()
}

function nextWeekdayDate(value, fallback) {
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const target = weekdays.findIndex((day) => String(value || '').toLowerCase().startsWith(day))
  if (target < 0) return ''
  const baseIso = normalizeDate('', fallback)
  const base = new Date(`${baseIso}T00:00:00Z`)
  if (Number.isNaN(base.getTime())) return ''
  const offset = (target - base.getUTCDay() + 7) % 7 || 7
  return addDaysIso(baseIso, offset)
}

function addDaysIso(date, amount) {
  const [year, month, day] = String(date).split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + amount))
  return next.toISOString().slice(0, 10)
}

function normalizeSpecies(value) {
  const text = cleanText(value)
  if (!text) return 'Unknown'
  if (/^dog$/i.test(text)) return 'Dog'
  if (/^cat$/i.test(text)) return 'Cat'
  return text[0].toUpperCase() + text.slice(1).toLowerCase()
}

function actionType(label) {
  const text = String(label || '').toLowerCase()
  if (/book|appointment|slot|schedule/.test(text)) return 'book'
  if (/text|sms|message|send/.test(text)) return 'message'
  if (/review|verify|confirm/.test(text)) return 'review'
  return 'callback'
}

function dedupeActions(actions) {
  const seen = new Set()
  return actions.filter((action) => {
    const key = normalizeKey(action.label)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeDate(dateText, fallback) {
  const text = cleanText(dateText)
  if (text) {
    const inferred = inferAppointmentDate(text, fallback)
    if (inferred) return inferred
    const parsed = new Date(text)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    const iso = text.match(/\d{4}-\d{2}-\d{2}/)?.[0]
    if (iso) return iso
  }

  const fallbackDate = new Date(fallback)
  if (!Number.isNaN(fallbackDate.getTime())) return fallbackDate.toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function normalizeTime(value) {
  const text = cleanText(value).toLowerCase()
  if (!text || /flexible|none|unknown|n\/a|na/.test(text)) return ''
  const inferred = inferAppointmentTime(text)
  if (inferred) return inferred
  const time = text.match(/\b(\d{1,2}):(\d{2})\b/) || (/^\d{1,2}$/.test(text) ? text.match(/^(\d{1,2})$/) : null)
  if (!time) return ''
  let hour = Number(time[1])
  const minute = Number(time[2] || 0)
  if (hour > 23 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function normalizedObject(value) {
  const object = parseMaybeJson(value)
  if (!object || typeof object !== 'object' || Array.isArray(object)) return {}
  return Object.fromEntries(
    Object.entries(object).map(([key, item]) => [normalizeKey(key), item]),
  )
}

function fromNormalized(object, key) {
  return object?.[normalizeKey(key)]
}

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function arrayFrom(value) {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) {
    return parsed.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') return cleanText(item.text || item.label || item.description || item.action || JSON.stringify(item))
      return cleanText(item)
    }).filter(Boolean)
  }
  if (typeof parsed === 'string') {
    return parsed
      .split(/\n+|;\s*/)
      .map((item) => item.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
  }
  return []
}

function parseMaybeJson(value) {
  if (!value) return value
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function mergeDeep(base, override) {
  const merged = { ...(base || {}), ...(override || {}) }
  if (base?.agent || override?.agent) merged.agent = { ...(base?.agent || {}), ...(override?.agent || {}) }
  if (base?.platform_analysis || override?.platform_analysis) {
    merged.platform_analysis = { ...(base?.platform_analysis || {}), ...(override?.platform_analysis || {}) }
  }
  if (base?.client_analysis || override?.client_analysis) {
    merged.client_analysis = { ...(base?.client_analysis || {}), ...(override?.client_analysis || {}) }
  }
  return merged
}

function normalizeUnknown(value) {
  const cleaned = cleanText(value)
  if (!cleaned || /^unknown$/i.test(cleaned) || /^nil$/i.test(cleaned) || /^none$/i.test(cleaned)) return ''
  return cleaned
}

function isUnknown(value) {
  const cleaned = cleanText(value)
  return !cleaned || /^unknown\b/i.test(cleaned)
}

function cleanText(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function shortId(id) {
  return String(id || `call-${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 8)
}

function truncate(value, length) {
  const text = cleanText(value)
  return text.length > length ? `${text.slice(0, length - 1)}...` : text
}
