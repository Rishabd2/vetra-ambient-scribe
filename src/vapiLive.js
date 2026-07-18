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
