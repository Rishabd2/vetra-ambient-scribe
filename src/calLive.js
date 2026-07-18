export async function fetchCalSlots({ start, days = 10 } = {}) {
  const params = new URLSearchParams({ days: String(days) })
  if (start) params.set('start', start)

  const response = await fetch(`/api/cal/slots?${params}`, {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse(response, 'Unable to load Cal.com slots')
}

export async function createCalBooking({ call, start, date, time, timeZone, kind, ownerName, phone, email }) {
  const response = await fetch('/api/book_appointment', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callId: call.executionId || call.id,
      start,
      date,
      time,
      timeZone,
      kind,
      ownerName,
      phone,
      email,
      petName: call.pet?.name,
      issueName: call.reason,
      urgency: call.urgency,
    }),
  })
  return parseJsonResponse(response, 'Unable to create Cal.com booking')
}

async function parseJsonResponse(response, fallbackMessage) {
  const text = await response.text()
  let payload
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok || payload?.error) {
    const message = payload?.error || payload?.message || text || `${fallbackMessage} (${response.status})`
    const error = new Error(message)
    error.details = payload?.details
    throw error
  }

  return payload || {}
}
