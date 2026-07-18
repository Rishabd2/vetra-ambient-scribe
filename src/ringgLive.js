export const RINGG_AGENT_LABEL = import.meta.env.VITE_RINGG_AGENT_NAME || 'vetra_RinggMirror'
export const RINGG_POLL_MS = Number(import.meta.env.VITE_RINGG_POLL_MS || 8000)

export async function fetchRinggCalls() {
  const response = await fetch('/api/ringg-calls', {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Ringg sync failed with ${response.status}`)
  }

  return response.json()
}

export function getDashboardDate(calls) {
  const latest = calls.find((call) => call.receivedAt)?.receivedAt
  return latest ? latest.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

export function mergeRinggCalls(currentCalls, liveCalls) {
  const liveByExecution = new Map(liveCalls.map((call) => [call.executionId || call.id, call]))
  const merged = currentCalls.map((existing) => {
    const key = existing.executionId || existing.id
    const fresh = liveByExecution.get(key)
    if (!fresh) return existing
    liveByExecution.delete(key)
    return mergeCall(existing, fresh)
  })

  return [...liveByExecution.values(), ...merged].sort(
    (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt),
  )
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
      rows.set(`${call.caller.phone}-${call.pet.name}-${call.executionId}`, {
        phone: call.caller.phone,
        caller: call.caller.name,
        pet: call.pet.name,
        species: call.pet.species,
        breed: call.pet.breed,
        age: call.pet.age,
        lastSummary: call.summary,
        openFollowups: open.length > 0 ? open.join(' · ') : '—',
        lastAgent: call.agentName || RINGG_AGENT_LABEL,
        updatedAt: call.updatedAt || call.receivedAt,
      })
    })
  return Array.from(rows.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

function mergeCall(existing, fresh) {
  const locallyReviewed = Boolean(existing.reviewedAt) || (existing.source === 'ringg' && existing.status === 'reviewed')
  const openLocalActions = (existing.nextActions || []).some((action) => !action.done)
  const userTouchedActions = locallyReviewed || (existing.source === 'ringg' && (existing.nextActions || []).some(
    (action) => action.done || String(action.id || '').startsWith('a-'),
  ))
  const userReviewed = locallyReviewed && !openLocalActions
  const reviewedCoverage = existing.coverage === 'at_risk' ? 'covered' : existing.coverage

  return {
    ...existing,
    ...fresh,
    status: userReviewed ? existing.status : fresh.status,
    coverage: userReviewed ? reviewedCoverage : fresh.coverage,
    reviewedAt: userReviewed ? existing.reviewedAt : fresh.reviewedAt,
    booked: existing.booked || fresh.booked,
    nextActions: userTouchedActions ? existing.nextActions : fresh.nextActions,
  }
}

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function isUnknown(value) {
  const cleaned = String(value || '').trim()
  return !cleaned || /^unknown\b/i.test(cleaned)
}
