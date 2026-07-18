import { normalizeRinggCall } from '../server/ringg-normalize.js'

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

  const secret = process.env.RINGG_WEBHOOK_SECRET
  if (secret) {
    const expected = `Bearer ${secret}`
    const received = req.headers.authorization || ''
    if (received !== expected) {
      res.status(401).json({ error: 'Unauthorized webhook' })
      return
    }
  }

  const payload = typeof req.body === 'string' ? parseJson(req.body) : req.body
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ error: 'Invalid webhook payload' })
    return
  }

  const normalized = normalizeRinggCall(payload, payload, {
    id: payload.agent_id,
    name: payload.agent_name,
  })

  console.info('Ringg webhook received', {
    event_type: payload.event_type,
    call_id: payload.call_id,
    status: payload.status,
    normalized_status: normalized.status,
  })

  res.status(200).json({
    received: true,
    event_type: payload.event_type || null,
    call_id: payload.call_id || null,
  })
}

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
