const TOOL_ENDPOINTS = Object.freeze({
  cancelAppointment: '/api/cancel_appointment',
  rescheduleAppointment: '/api/reschedule_appointment',
  bookAppointment: '/api/book_appointment',
  getAvailableSlots: '/api/check_availability_of_slots',
  lookupPatient: '/api/lookup_patient',
})

export async function handleVapiToolCalls(payload, { baseUrl, fetchImpl = fetch } = {}) {
  if (!baseUrl) throw new Error('A baseUrl is required to dispatch Vapi tools.')

  const message = payload?.message || payload || {}
  const toolCalls = Array.isArray(message.toolCallList) ? message.toolCallList : []

  return Promise.all(toolCalls.map((toolCall) => dispatchToolCall(toolCall, { baseUrl, fetchImpl })))
}

async function dispatchToolCall(toolCall, { baseUrl, fetchImpl }) {
  const name = cleanText(toolCall?.function?.name)
  const toolCallId = cleanText(toolCall?.id)
  const endpoint = TOOL_ENDPOINTS[name]

  if (!endpoint) {
    return {
      name,
      toolCallId,
      error: `Unsupported Vapi tool: ${name || 'unnamed tool'}.`,
    }
  }

  let args
  try {
    args = parseArguments(toolCall?.function?.arguments)
  } catch (error) {
    return {
      name,
      toolCallId,
      error: error instanceof Error ? error.message : 'Invalid tool arguments.',
    }
  }

  try {
    const response = await fetchImpl(new URL(endpoint, ensureTrailingSlash(baseUrl)), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    const text = await response.text()
    const parsed = parseJson(text)

    if (!response.ok) {
      return {
        name,
        toolCallId,
        error: cleanText(parsed?.error || parsed?.message || text) ||
          `Vetra endpoint failed with status ${response.status}.`,
      }
    }

    return {
      name,
      toolCallId,
      result: typeof parsed === 'object' && parsed !== null ? JSON.stringify(parsed) : text,
    }
  } catch (error) {
    return {
      name,
      toolCallId,
      error: error instanceof Error ? error.message : 'Unable to reach the Vetra endpoint.',
    }
  }
}

function parseArguments(value) {
  if (value === undefined || value === null || value === '') return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string') throw new Error('Tool arguments must be a JSON object.')

  const parsed = parseJson(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Tool arguments must contain a valid JSON object.')
  }
  return parsed
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
  return value === undefined || value === null ? '' : String(value).trim()
}

function ensureTrailingSlash(value) {
  return String(value).endsWith('/') ? String(value) : `${value}/`
}
