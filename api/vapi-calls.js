import {
  DEFAULT_VAPI_ASSISTANT_ID,
  DEFAULT_VAPI_ASSISTANT_NAME,
  appointmentsFromCalls,
  followupsFromCalls,
  inferDashboardDate,
  memoryRowsFromCalls,
  normalizeVapiCall,
} from '../server/vapi-normalize.js'
import { listLiveCalls } from '../server/live-calls.js'

const VAPI_BASE_URL = process.env.VAPI_API_BASE || 'https://api.vapi.ai'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS')
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.VAPI_API_KEY
  const assistantId =
    cleanText(queryParam(req.query.assistantId)) ||
    cleanText(process.env.VAPI_ASSISTANT_ID) ||
    DEFAULT_VAPI_ASSISTANT_ID
  const agent = { id: assistantId, name: process.env.VAPI_ASSISTANT_NAME || DEFAULT_VAPI_ASSISTANT_NAME }
  const limit = clampNumber(req.query.limit, 1, 100, 20)

  if (!apiKey) {
    res.status(200).json({
      connected: false,
      agent,
      calls: [],
      message: 'Set VAPI_API_KEY in Vercel to load live calls.',
    })
    return
  }

  try {
    const params = new URLSearchParams({ assistantId, limit: String(limit) })
    const raw = await vapiFetch(`/call?${params}`, { apiKey })
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []

    // In-progress calls: the list payload lags, so re-fetch each live call's
    // detail (progressive transcript + monitor.controlUrl) in parallel.
    const liveIds = list
      .filter((c) => ['in-progress', 'ringing', 'forwarding', 'queued'].includes(c.status))
      .map((c) => c.id)
    const details = await Promise.all(
      liveIds.map((id) => vapiFetch(`/call/${id}`, { apiKey }).catch(() => null)),
    )
    const detailById = new Map(details.filter(Boolean).map((d) => [d.id, d]))
    const calls = list
      .map((item) => normalizeVapiCall(detailById.get(item.id) || item, agent))
      // Drop empty/silent completed calls where no real pet name was captured
      // (they'd show as "Pet · Caller" noise). Live calls are always kept.
      .filter((c) => c.live || (c.pet?.name && c.pet.name !== 'Pet'))

    // Live calls from Supabase (written by the webhook in near-real-time).
    // Merge/override so an in-progress call shows instantly with fresh turns,
    // even before it appears in the REST list.
    const live = await listLiveCalls().catch(() => [])
    const liveNorm = live.map((r) => liveRowToCall(r, agent))
    const liveIdSet = new Set(liveNorm.map((c) => c.vapiId))
    const merged = [...liveNorm, ...calls.filter((c) => !liveIdSet.has(c.vapiId))]

    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.status(200).json({
      connected: true,
      agent,
      syncedAt: new Date().toISOString(),
      dashboardDate: inferDashboardDate(merged),
      calls: merged,
      appointments: appointmentsFromCalls(merged),
      followups: followupsFromCalls(merged),
      memoryRows: memoryRowsFromCalls(merged),
    })
  } catch (error) {
    res.status(500).json({
      connected: false,
      agent,
      calls: [],
      error: error instanceof Error ? error.message : 'Unable to load Vapi calls',
    })
  }
}

async function vapiFetch(path, { apiKey }) {
  const response = await fetch(new URL(path.replace(/^\//, ''), ensureTrailingSlash(VAPI_BASE_URL)), {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  })
  const text = await response.text()
  const body = parseJson(text)
  if (!response.ok) {
    throw new Error(body?.message || text || `Vapi request failed with ${response.status}`)
  }
  return body
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}
function queryParam(value) {
  return Array.isArray(value) ? value[0] : value
}
function parseJson(value) {
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}
function cleanText(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}
function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// A Supabase live-call row → the dashboard call shape (marked live).
function liveRowToCall(r, agent) {
  const transcript = Array.isArray(r.transcript) ? r.transcript : []
  const reason = transcript.find(([w]) => w === 'caller')?.[1]?.slice(0, 90) || 'Live call in progress…'
  return {
    id: String(r.call_id).slice(0, 8),
    vapiId: r.call_id,
    executionId: r.call_id,
    source: 'vapi',
    live: true,
    callState: 'in-progress',
    status: 'needs_action',
    urgency: 'routine',
    coverage: 'at_risk',
    caller: { name: r.caller_name || 'Live caller', phone: r.caller_phone || 'Web call' },
    pet: { name: r.pet_name || 'Pet', species: '', breed: '', age: '' },
    reason,
    summary: r.summary || 'Live call in progress…',
    receivedAt: r.started_at || r.updated_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
    duration: 0,
    estValue: 0,
    recordingUrl: null,
    agentName: agent.name,
    transcript,
    nextActions: [],
  }
}
