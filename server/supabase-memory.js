const DEFAULT_MEMORY_TABLE = 'vetra_patient_memory'

export function getSupabaseMemoryConfig() {
  const url = cleanText(
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL,
  )
  const key = cleanText(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY,
  )

  return {
    enabled: Boolean(url && key),
    url,
    key,
    table: cleanText(process.env.SUPABASE_PATIENT_MEMORY_TABLE) || DEFAULT_MEMORY_TABLE,
  }
}

export async function listMemoryRows() {
  const config = getSupabaseMemoryConfig()
  if (!config.enabled) return { connected: false, rows: [], error: 'Supabase memory env vars are not configured.' }

  const response = await supabaseFetch(config, `/${config.table}?select=*&order=updated_at.desc`)
  if (!response.ok) return { connected: false, rows: [], error: response.message, details: response.body }
  return { connected: true, rows: Array.isArray(response.body) ? response.body : [] }
}

export async function upsertMemoryRow(row) {
  const config = getSupabaseMemoryConfig()
  if (!config.enabled) return { connected: false, rows: [], error: 'Supabase memory env vars are not configured.' }

  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
  }
  const response = await supabaseFetch(config, `/${config.table}?on_conflict=memory_key`, {
    method: 'POST',
    body: [payload],
    prefer: 'resolution=merge-duplicates,return=representation',
  })
  if (!response.ok) return { connected: false, rows: [], error: response.message, details: response.body }
  return { connected: true, rows: Array.isArray(response.body) ? response.body : [] }
}

export async function upsertMemoryRows(rows) {
  const config = getSupabaseMemoryConfig()
  if (!config.enabled) return { connected: false, rows: [], error: 'Supabase memory env vars are not configured.' }
  if (!rows.length) return { connected: true, rows: [] }

  const now = new Date().toISOString()
  const response = await supabaseFetch(config, `/${config.table}?on_conflict=memory_key`, {
    method: 'POST',
    body: rows.map((row) => ({ ...row, updated_at: row.updated_at || now })),
    prefer: 'resolution=merge-duplicates,return=representation',
  })
  if (!response.ok) return { connected: false, rows: [], error: response.message, details: response.body }
  return { connected: true, rows: Array.isArray(response.body) ? response.body : [] }
}

async function supabaseFetch(config, path, { method = 'GET', body, prefer } = {}) {
  const url = new URL(`/rest/v1${path}`, config.url)
  const response = await fetch(url, {
    method,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const parsed = parseJson(text)
  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
    message: parsed?.message || parsed?.error || text || `Supabase request failed with ${response.status}`,
  }
}

function parseJson(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function cleanText(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}
