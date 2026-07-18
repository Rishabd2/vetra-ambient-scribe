const VAPI_BASE_URL = process.env.VAPI_API_BASE || 'https://api.vapi.ai'

// Inject a message into a LIVE call. The dashboard "Ask" box posts here; we
// look up the call's monitor.controlUrl and push an add-message (so Haley
// actually asks the caller), falling back to a plain "say".
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

  const apiKey = process.env.VAPI_API_KEY
  if (!apiKey) {
    res.status(200).json({ ok: false, error: 'VAPI_API_KEY not set' })
    return
  }

  const body = typeof req.body === 'string' ? parseJson(req.body) : req.body || {}
  const callId = cleanText(body.callId)
  const prompt = cleanText(body.message)
  const mode = body.mode === 'say' ? 'say' : 'add-message'
  if (!callId || !prompt) {
    res.status(400).json({ ok: false, error: 'callId and message are required' })
    return
  }

  // Demo fallback: the seeded 'live-demo' call isn't a real Vapi call, so
  // acknowledge without hitting the control channel (keeps the stage demo
  // working with no active phone call).
  if (callId === 'live-demo') {
    res.status(200).json({ ok: true, mode, injected: prompt, demo: true })
    return
  }

  try {
    // Resolve the live control URL for this call.
    const call = await vapiFetch(`/call/${callId}`, { apiKey })
    const controlUrl = call?.monitor?.controlUrl
    if (!controlUrl) {
      res.status(200).json({ ok: false, error: 'Call has no active control channel (not live).' })
      return
    }

    const payload = mode === 'say'
      ? { type: 'say', content: prompt }
      : {
          type: 'add-message',
          message: {
            role: 'system',
            content: `The clinician is asking you to do this now, mid-call: ${prompt}. Ask the caller naturally and continue the conversation.`,
          },
          triggerResponseEnabled: true,
        }

    const ctrl = await fetch(controlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const text = await ctrl.text()
    if (!ctrl.ok) {
      res.status(200).json({ ok: false, error: text || `Control channel returned ${ctrl.status}` })
      return
    }
    res.status(200).json({ ok: true, mode, injected: prompt })
  } catch (error) {
    res.status(200).json({ ok: false, error: error instanceof Error ? error.message : 'Injection failed' })
  }
}

async function vapiFetch(path, { apiKey }) {
  const response = await fetch(new URL(path.replace(/^\//, ''), ensureTrailingSlash(VAPI_BASE_URL)), {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  })
  const text = await response.text()
  const parsed = parseJson(text)
  if (!response.ok) throw new Error(parsed?.message || text || `Vapi request failed with ${response.status}`)
  return parsed
}
function ensureTrailingSlash(v) { return v.endsWith('/') ? v : `${v}/` }
function parseJson(v) { if (!v) return null; try { return JSON.parse(v) } catch { return null } }
function cleanText(v) { return v === null || v === undefined ? '' : String(v).trim() }
