// Vapi call → dashboard call-object normalizer, plus the derived collections
// (appointments / follow-ups / patient memory) the dashboard consumes.

export const DEFAULT_VAPI_ASSISTANT_ID = '98ef7647-8552-40fa-a547-2c8a733b3e3e'
export const DEFAULT_VAPI_ASSISTANT_NAME = 'Haley · Urbana Paws'

const URGENT = /(emergency|seizure|collapse|bleeding|breathing|not breathing|toxin|poison|hit by|unconscious|choking)/i

// Map a raw Vapi call into the shape the UI already understands.
export function normalizeVapiCall(call, assistant = {}) {
  const id = String(call.id || '')
  const shortId = id.slice(0, 8)
  const started = call.startedAt || call.createdAt || null
  const ended = call.endedAt || null
  const live = call.status === 'in-progress' || call.status === 'ringing' || call.status === 'forwarding'
  const summary = call.analysis?.summary || call.summary || ''
  const transcript = transcriptFromCall(call)
  const phone = call.customer?.number || call.phoneNumber?.number || 'Web call'
  const reason = firstOwnerLine(transcript) || (summary ? summary.split('.')[0] : 'Inbound call')
  const urgency = URGENT.test(`${summary} ${reason}`) ? 'emergency' : 'routine'

  return {
    id: shortId || id,
    vapiId: id,
    executionId: id,
    source: 'vapi',
    live,
    callState: call.status || 'ended',
    status: live ? 'needs_action' : 'unreviewed',
    urgency,
    coverage: live ? 'at_risk' : 'covered',
    caller: { name: 'Caller', phone },
    pet: { name: 'Pet', species: '', breed: '', age: '' },
    reason,
    summary: summary || (live ? 'Live call in progress…' : 'Call completed.'),
    receivedAt: started || new Date().toISOString(),
    updatedAt: ended || started || new Date().toISOString(),
    duration: durationSeconds(started, ended),
    estValue: 0,
    recordingUrl: call.recordingUrl || null,
    agentName: assistant.name || DEFAULT_VAPI_ASSISTANT_NAME,
    transcript,
    nextActions: [],
  }
}

// Vapi returns a plain-text `transcript` and/or a `messages[]` array. Prefer
// messages (role-tagged); fall back to parsing the "AI:/User:" text blob.
export function transcriptFromCall(call) {
  const msgs = Array.isArray(call.messages) ? call.messages : []
  const turns = msgs
    .filter((m) => m.role === 'user' || m.role === 'bot' || m.role === 'assistant')
    .map((m) => [m.role === 'user' ? 'caller' : 'agent', cleanText(m.message || m.content)])
    .filter(([, text]) => text)
  if (turns.length) return turns

  const raw = cleanText(call.transcript)
  if (!raw) return []
  return raw
    .split(/\n+/)
    .map((line) => {
      const m = /^(AI|Bot|Assistant|User|Customer|Human)\s*:\s*(.*)$/i.exec(line.trim())
      if (!m) return null
      const who = /^(user|customer|human)$/i.test(m[1]) ? 'caller' : 'agent'
      return [who, m[2]]
    })
    .filter(Boolean)
}

export function appointmentsFromCalls() {
  return []
}

export function followupsFromCalls() {
  return []
}

export function memoryRowsFromCalls(calls) {
  return calls.map((c) => ({
    phone: c.caller.phone,
    caller: c.caller.name,
    pet: c.pet.name,
    species: c.pet.species,
    breed: c.pet.breed,
    age: c.pet.age,
    lastSummary: c.summary,
    openFollowups: '—',
    lastAgent: c.agentName,
    updatedAt: c.updatedAt || c.receivedAt,
  }))
}

export function inferDashboardDate(calls) {
  const latest = calls.find((c) => c.receivedAt)?.receivedAt
  return latest ? latest.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

function firstOwnerLine(transcript) {
  const line = transcript.find(([who]) => who === 'caller')
  return line ? line[1].slice(0, 90) : ''
}

function durationSeconds(start, end) {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Number.isFinite(s) && Number.isFinite(e) && e > s ? Math.round((e - s) / 1000) : 0
}

function cleanText(value) {
  return value === undefined || value === null ? '' : String(value).trim()
}
