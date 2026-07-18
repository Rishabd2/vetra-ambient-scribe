import {
  DEFAULT_RINGG_AGENT_ID,
  DEFAULT_RINGG_AGENT_NAME,
  appointmentsFromCalls,
  followupsFromCalls,
  inferDashboardDate,
  memoryRowsFromCalls,
  normalizeRinggCall,
} from '../server/ringg-normalize.js'

const RINGG_BASE_URL = process.env.RINGG_API_BASE || 'https://prod-api.ringg.ai/ca/api/v0'
const AGENT_LOOKUP_TTL_MS = 5 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

let agentLookupCache = { at: 0, agents: [] }

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

  const apiKey = process.env.RINGG_API_KEY
  const requestedAgentName =
    cleanText(queryParam(req.query.agentName)) ||
    cleanText(process.env.RINGG_AGENT_NAME) ||
    DEFAULT_RINGG_AGENT_NAME
  const configuredAgentId =
    cleanText(queryParam(req.query.agentId)) ||
    cleanText(process.env.RINGG_AGENT_ID) ||
    DEFAULT_RINGG_AGENT_ID
  const pageSize = clampNumber(req.query.limit, 1, 50, 20)
  const lookbackDays = clampNumber(req.query.days, 1, 90, Number(process.env.RINGG_HISTORY_LOOKBACK_DAYS || 14))
  const detailLimit = clampNumber(req.query.detailLimit, 0, 50, pageSize)
  let agent = { id: configuredAgentId, name: requestedAgentName }

  if (!apiKey) {
    res.status(200).json({
      connected: false,
      agent,
      calls: [],
      message: `Set RINGG_API_KEY in Vercel to load live ${agent.name} calls.`,
    })
    return
  }

  try {
    agent = await resolveAgent({ apiKey, requestedAgentName, configuredAgentId })
    if (!agent.id) {
      res.status(502).json({
        connected: false,
        agent: { id: '', name: requestedAgentName },
        calls: [],
        error: `Ringg assistant "${requestedAgentName}" was not found for this API key.`,
      })
      return
    }

    const history = await fetchRinggHistory({ apiKey, agentId: agent.id, pageSize, lookbackDays })
    const detailById = await fetchDetailsForHistory({ apiKey, history, detailLimit })
    const calls = history.map((item) => {
      const detail = detailById.get(item.id || item.call_id) || {}
      return normalizeRinggCall(item, detail, agent)
    })
    const appointments = appointmentsFromCalls(calls)
    const followups = followupsFromCalls(calls)
    const memoryRows = memoryRowsFromCalls(calls)

    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.status(200).json({
      connected: true,
      agent,
      syncedAt: new Date().toISOString(),
      dashboardDate: inferDashboardDate(calls, appointments),
      calls,
      appointments,
      followups,
      memoryRows,
    })
  } catch (error) {
    res.status(500).json({
      connected: false,
      agent,
      calls: [],
      error: error instanceof Error ? error.message : 'Unable to load Ringg calls',
    })
  }
}

async function resolveAgent({ apiKey, requestedAgentName, configuredAgentId }) {
  const agents = await listAgents(apiKey).catch(() => [])
  const configuredMatch = agents.find((item) => item.id === configuredAgentId)
  if (configuredMatch) {
    return { id: configuredMatch.id, name: agentDisplayName(configuredMatch) || requestedAgentName }
  }

  const targetName = normalizeName(requestedAgentName)
  const nameMatch = targetName
    ? agents.find((item) => normalizeName(agentDisplayName(item)) === targetName) ||
      agents.find((item) => normalizeName(agentDisplayName(item)).includes(targetName))
    : null

  if (nameMatch?.id) {
    return { id: nameMatch.id, name: agentDisplayName(nameMatch) || requestedAgentName }
  }

  return { id: configuredAgentId, name: requestedAgentName }
}

async function listAgents(apiKey) {
  const now = Date.now()
  if (now - agentLookupCache.at < AGENT_LOOKUP_TTL_MS && agentLookupCache.agents.length > 0) {
    return agentLookupCache.agents
  }

  const body = await ringgFetch('/agent/all', { apiKey })
  const agents = Array.isArray(body?.data?.agents)
    ? body.data.agents
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.agents)
        ? body.agents
        : []
  agentLookupCache = { at: now, agents }
  return agents
}

async function fetchRinggHistory({ apiKey, agentId, pageSize, lookbackDays }) {
  const end = new Date()
  const start = new Date(end.getTime() - lookbackDays * DAY_MS)
  const searchParams = new URLSearchParams({
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    limit: String(pageSize),
    offset: '0',
    agent_id: agentId,
  })

  const body = await ringgFetch(`/calling/history?${searchParams}`, { apiKey })
  return Array.isArray(body?.calls)
    ? body.calls
    : Array.isArray(body?.data?.calls)
      ? body.data.calls
      : []
}

async function fetchDetailsForHistory({ apiKey, history, detailLimit }) {
  const entries = await Promise.all(
    history.slice(0, detailLimit).map(async (call) => {
      const id = call.id || call.call_id
      if (!id) return null
      try {
        const searchParams = new URLSearchParams({ id, send_analysis: 'true' })
        const detail = await ringgFetch(`/calling/call-details?${searchParams}`, { apiKey })
        return [id, detail?.data || detail]
      } catch {
        return [id, {}]
      }
    }),
  )
  return new Map(entries.filter(Boolean))
}

async function ringgFetch(path, { apiKey }) {
  const response = await fetch(new URL(path.replace(/^\//, ''), ensureTrailingSlash(RINGG_BASE_URL)), {
    headers: {
      'X-API-KEY': apiKey,
      Accept: 'application/json',
    },
  })
  const text = await response.text()
  const body = parseJson(text)

  if (!response.ok) {
    throw new Error(body?.detail || body?.message || text || `Ringg request failed with ${response.status}`)
  }

  return body || {}
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function agentDisplayName(agent) {
  return cleanText(agent.agent_display_name || agent.agent_name || agent.name)
}

function normalizeName(value) {
  return cleanText(value).toLowerCase().replace(/[\s-]+/g, '_')
}

function queryParam(value) {
  return Array.isArray(value) ? value[0] : value
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
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}
