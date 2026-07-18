import { handleVapiToolCalls } from '../server/vapi-adapter.js'
import { upsertLiveCall, endLiveCall } from '../server/live-calls.js'

// Single Vapi server endpoint (configured on the assistant + tools as
// /webhooks/vapi). Handles tool-call dispatch and acknowledges other events.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const secret = process.env.VAPI_WEBHOOK_SECRET
  if (secret) {
    const received = req.headers['x-vapi-secret'] || req.headers.authorization || ''
    if (received !== secret && received !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'Unauthorized webhook' })
      return
    }
  }

  const payload = typeof req.body === 'string' ? parseJson(req.body) : req.body
  const message = payload?.message
  if (!message || typeof message !== 'object') {
    res.status(400).json({ error: 'Invalid webhook payload' })
    return
  }

  const type = message.type || 'unknown'

  if (type === 'tool-calls' || Array.isArray(message.toolCallList)) {
    const results = await handleVapiToolCalls(payload, { baseUrl: requestBaseUrl(req) })
    res.status(200).json({ results })
    return
  }

  // Live transcript pipeline: persist progressive state so the dashboard can
  // read it near-real-time (webhook latency, not REST poll lag).
  const call = message.call || {}
  const callId = call.id
  try {
    if (callId && (type === 'conversation-update' || type === 'transcript' || type === 'status-update')) {
      const status = message.status || call.status
      if (type === 'status-update' && (status === 'ended' || message.endedReason)) {
        await endLiveCall(callId)
      } else {
        const turns = turnsFromMessage(message)
        const d = extractLive(turns)
        await upsertLiveCall({
          call_id: callId,
          status: 'in-progress',
          caller_name: d.owner || '',
          caller_phone: call.customer?.number || '',
          pet_name: d.pet || '',
          transcript: turns,
          summary: message.summary || '',
          started_at: call.startedAt || call.createdAt || new Date().toISOString(),
        })
      }
    }
    if (callId && (type === 'end-of-call-report' || type === 'hang')) {
      await endLiveCall(callId)
    }
  } catch (err) {
    console.error('live-call persist failed', err?.message)
  }

  res.status(200).json({ received: true, type })
}

// Build [role,text] turns from whatever transcript shape the event carries.
function turnsFromMessage(message) {
  const msgs = Array.isArray(message.artifact?.messages)
    ? message.artifact.messages
    : Array.isArray(message.messages)
      ? message.messages
      : Array.isArray(message.conversation)
        ? message.conversation
        : []
  const turns = msgs
    .filter((m) => ['user', 'bot', 'assistant'].includes(m.role))
    .map((m) => [m.role === 'user' ? 'caller' : 'agent', String(m.message || m.content || '').trim()])
    .filter(([, t]) => t)
  if (turns.length) return turns
  // Single-line transcript event: {role, transcript}
  if (message.transcript && message.role) {
    return [[message.role === 'user' ? 'caller' : 'agent', String(message.transcript).trim()]]
  }
  return []
}

function extractLive(turns) {
  const callerText = turns.filter(([w]) => w === 'caller').map(([, t]) => t).join(' ')
  const out = {}
  const owner = /\b(?:my name is|this is|i am|i'm|name's)\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/i.exec(callerText)
  if (owner) {
    const first = owner[1]
    const last = owner[2] && !/^(and|is|my|the|but|so|he|she|here|calling)$/i.test(owner[2]) ? ` ${owner[2]}` : ''
    if (!/^(my|name)$/i.test(first)) out.owner = `${first}${last}`
  }
  const pet = /\b(?:dog|cat|puppy|kitten|pet)(?:'s)?(?:\s+name)?(?:\s+is|,|\s+called|\s+named)?\s+([A-Z][a-z]+)/.exec(callerText)
  if (pet) out.pet = pet[1]
  return out
}

function parseJson(value) {
  try { return JSON.parse(value) } catch { return null }
}
function requestBaseUrl(req) {
  const proto = firstHeader(req.headers['x-forwarded-proto'])
  const host = firstHeader(req.headers['x-forwarded-host']) || firstHeader(req.headers.host)
  const protocol = proto || (String(host).includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}
function firstHeader(value) {
  return Array.isArray(value) ? value[0] : value
}
