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
  const d = extractDetails(transcript, summary)
  const reason = d.reason || firstOwnerLine(transcript) || (summary ? summary.split('.')[0] : 'Inbound call')
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
    caller: { name: d.owner || (live ? 'Live caller' : 'Caller'), phone },
    pet: { name: d.pet || 'Pet', species: d.species || '', breed: d.breed || '', age: d.age || '' },
    reason,
    summary: summary || (live ? 'Live call in progress…' : 'Call completed.'),
    receivedAt: started || new Date().toISOString(),
    updatedAt: ended || started || new Date().toISOString(),
    duration: durationSeconds(started, ended),
    estValue: 0,
    recordingUrl: call.recordingUrl || call.artifact?.recordingUrl || null,
    controlUrl: call.monitor?.controlUrl || null,
    agentName: assistant.name || DEFAULT_VAPI_ASSISTANT_NAME,
    transcript,
    nextActions: [],
  }
}

// Pull owner/pet/species/age/reason out of the caller's turns + AI summary.
// Heuristic but resilient; the summary is the most structured signal.
export function extractDetails(transcript, summary = '') {
  const callerText = transcript.filter(([w]) => w === 'caller').map(([, t]) => t).join(' ')
  const hay = `${summary} ${transcript.map(([, t]) => t).join(' ')}`
  const out = {}

  // Owner name: prefer the summary's "X called" (most reliable), else the
  // caller stating it. Reject filler like "My Name" / "Calling To".
  const ownerFromSummary = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+called\b/.exec(summary)
  const ownerFromCaller = /\b(?:my name is|this is|i am|i'm|name's|it's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i.exec(callerText)
  const ownerRaw = (ownerFromSummary && ownerFromSummary[1]) || (ownerFromCaller && ownerFromCaller[1])
  if (ownerRaw && isNameLike(ownerRaw)) out.owner = titleCase(ownerRaw)

  // Species
  const species = /\b(dog|cat|puppy|kitten|rabbit|bird|canary|reptile|bearded dragon|ferret|hamster|guinea pig)\b/i.exec(hay)
  if (species) out.species = normalizeSpecies(species[1])

  // Pet name: "for my dog, X" / "dog's name is X" / "appointment for X"
  const pet =
    /(?:dog|cat|puppy|kitten|pet|rabbit|bird)(?:'s)?(?:\s+name)?(?:\s+is|,|\s+called|\s+named)?\s+([A-Z][a-z]+)/.exec(hay)
    || /\bfor\s+(?:my\s+\w+\s+)?([A-Z][a-z]+)\b/.exec(summary)
  if (pet && isNameLike(pet[1])) out.pet = titleCase(pet[1])

  // Breed
  const breed = /\b(golden retriever|labrador|german shepherd|bulldog|poodle|beagle|dachshund|corgi|husky|maine coon|persian|siamese|bengal|ragdoll|portuguese water dog|holland lop)\b/i.exec(hay)
  if (breed) out.breed = titleCase(breed[1])

  // Age: "5 years old", "5-year-old", "he's 5"
  const age = /\b(\d{1,2})[\s-]*(?:years?|yrs?|yr)[\s-]*old\b/i.exec(hay) || /\b(\d{1,2})[\s-]*year[\s-]*old\b/i.exec(hay)
  if (age) out.age = `${age[1]}y`

  // Reason: prefer a symptom/purpose clause from the summary
  const reason = /\bfor\s+(?:a\s+|an\s+)?([^.,]+?(?:appointment|visit|check[- ]?up|exam|vaccination|cleaning|injury|limping|pain|wellness)[^.,]*)/i.exec(summary)
    || /\b(?:who is|because|due to)\s+([^.,]+)/i.exec(summary)
  if (reason) out.reason = capitalize(reason[1].trim().slice(0, 80))

  return out
}

function titleCase(s) {
  return String(s).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}
function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
function normalizeSpecies(s) {
  const l = s.toLowerCase()
  if (l === 'puppy') return 'Dog'
  if (l === 'kitten') return 'Cat'
  if (l === 'canary') return 'Bird'
  if (l === 'bearded dragon') return 'Reptile'
  return titleCase(l)
}
function isNameLike(w) {
  const word = String(w).trim().split(/\s+/)[0].toLowerCase()
  const STOP = new Set([
    'the', 'a', 'an', 'my', 'his', 'her', 'your', 'our', 'is', 'was', 'old', 'new',
    'patient', 'appointment', 'visit', 'him', 'it', 'calling', 'call', 'to', 'of', 'for',
    'about', 'with', 'and', 'but', 'so', 'she', 'he', 'they', 'here', 'there', 'today',
    'yes', 'no', 'okay', 'hi', 'hello', 'thanks', 'thank', 'please', 'sorry', 'name',
    'owner', 'caller', 'pet', 'dog', 'cat', 'clinic', 'doctor', 'vet',
  ])
  return word.length >= 2 && !STOP.has(word)
}

// Vapi returns a plain-text `transcript` and/or a `messages[]` array (both also
// mirrored under `artifact`). Prefer messages (role-tagged); fall back to the
// "AI:/User:" text blob.
export function transcriptFromCall(call) {
  const msgs = Array.isArray(call.messages) && call.messages.length
    ? call.messages
    : (call.artifact?.messages || [])
  const turns = msgs
    .filter((m) => m.role === 'user' || m.role === 'bot' || m.role === 'assistant')
    .map((m) => [m.role === 'user' ? 'caller' : 'agent', cleanText(m.message || m.content)])
    .filter(([, text]) => text)
  if (turns.length) return turns

  const raw = cleanText(call.transcript || call.artifact?.transcript)
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
