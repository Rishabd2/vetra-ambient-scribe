export const VAPI_AGENT_LABEL = import.meta.env.VITE_VAPI_ASSISTANT_NAME || 'Haley · Urbana Paws'
export const VAPI_POLL_MS = Number(import.meta.env.VITE_VAPI_POLL_MS || 8000)

export async function fetchVapiCalls() {
  const response = await fetch('/api/vapi-calls', { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Vapi sync failed with ${response.status}`)
  }
  return response.json()
}

// Completed visits generated at call-end (SOAP + invoice + follow-ups).
export async function fetchVisits() {
  const response = await fetch('/api/visits', { headers: { Accept: 'application/json' } })
  if (!response.ok) return { connected: false, visits: [] }
  return response.json()
}

// Map a Supabase visit row → the frontend visit shape (DoctorNotes/Patients/Invoice).
export function visitRowToVisit(r) {
  const soap = r.soap || {}
  const toLines = (text) => String(text || '').split(/[\n•;]+/).map((s) => s.trim()).filter(Boolean)
  const inv = r.invoice || {}
  return {
    id: `v-${r.call_id}`.slice(0, 40),
    status: r.status || 'draft',
    startedAt: r.created_at,
    visitType: r.reason || 'Phone intake',
    doctor: 'Dr. Martinez',
    live: false,
    fromCall: true,
    patient: {
      id: `p-${(r.pet_name || 'pet').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: r.pet_name || 'Unknown pet',
      species: r.species || '',
      breed: r.breed || '',
      age: r.age || '',
      sex: '',
      weight: '',
      isNew: Boolean(r.is_new_patient),
      owner: { name: r.owner_name || 'Caller', phone: '' },
      problems: soap.assessment ? toLines(soap.assessment) : [],
      medications: [],
      allergies: [],
    },
    transcript: (r.transcript || []).map(([who, text]) => [who === 'caller' ? 'OWNER' : 'DR', text]),
    qa: [],
    soap: {
      summary: soap.summary || r.summary || '',
      subjective: toLines(soap.subjective),
      objective: toLines(soap.objective),
      assessment: toLines(soap.assessment),
      plan: toLines(soap.plan),
    },
    followups: (r.followups || []).map((label, i) => ({
      id: `fu-${r.call_id}-${i}`, label, owner: 'Dr. Martinez', due: '', channel: 'Phone', done: false,
    })),
    invoice: {
      status: 'draft',
      taxRate: 0.08,
      lines: (inv.lines || []).map((l, i) => ({
        id: `li-${r.call_id}-${i}`, desc: l.description, code: l.code, source: l.source || 'Plan', qty: l.qty || 1, price: l.price || 0,
      })),
    },
  }
}

export function getDashboardDate(calls) {
  const latest = calls.find((call) => call.receivedAt)?.receivedAt
  return latest ? latest.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

// Merge live calls onto current state, preserving local review/action edits.
export function mergeVapiCalls(currentCalls, liveCalls) {
  const liveById = new Map(liveCalls.map((call) => [call.vapiId || call.id, call]))
  const merged = currentCalls.map((existing) => {
    const key = existing.vapiId || existing.id
    const fresh = liveById.get(key)
    if (!fresh) return existing
    liveById.delete(key)
    return mergeCall(existing, fresh)
  })
  return [...liveById.values(), ...merged].sort(
    (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt),
  )
}

export function appointmentsFromCalls() {
  return []
}

export function followupsFromCalls(calls) {
  return calls
    .filter((c) => (c.nextActions || []).some((a) => !a.done))
    .map((c) => ({
      id: `fu-${c.id}`,
      petOwner: `${c.caller.name} · ${c.pet.name}`,
      callId: c.id,
      steps: (c.nextActions || []).filter((a) => !a.done).map((a) => ({
        channel: 'SMS', label: a.label, at: c.updatedAt || c.receivedAt, status: 'scheduled',
      })),
    }))
}

export function memoryRowsFromCalls(calls) {
  const rows = new Map()
  calls.forEach((call) => {
    rows.set(`${call.caller.phone}-${call.id}`, {
      phone: call.caller.phone,
      caller: call.caller.name,
      pet: call.pet.name,
      species: call.pet.species,
      breed: call.pet.breed,
      age: call.pet.age,
      lastSummary: call.summary,
      openFollowups: '—',
      lastAgent: call.agentName || VAPI_AGENT_LABEL,
      updatedAt: call.updatedAt || call.receivedAt,
    })
  })
  return Array.from(rows.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

function mergeCall(existing, fresh) {
  const userReviewed = Boolean(existing.reviewedAt) && !(existing.nextActions || []).some((a) => !a.done)
  return {
    ...existing,
    ...fresh,
    status: userReviewed ? existing.status : fresh.status,
    coverage: userReviewed ? existing.coverage : fresh.coverage,
    reviewedAt: userReviewed ? existing.reviewedAt : fresh.reviewedAt,
    // Keep the fuller transcript if the live poll briefly returns fewer turns.
    transcript: (fresh.transcript || []).length >= (existing.transcript || []).length
      ? fresh.transcript
      : existing.transcript,
    nextActions: existing.nextActions?.length ? existing.nextActions : fresh.nextActions,
  }
}
