import { handleVapiToolCalls } from '../server/vapi-adapter.js'

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

  console.info('Vapi webhook', {
    type,
    callId: message.call?.id || null,
    status: message.status || null,
  })
  res.status(200).json({ received: true, type })
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
