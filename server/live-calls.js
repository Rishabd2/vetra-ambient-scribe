// Live-call store backed by Supabase. The Vapi webhook writes progressive
// transcript here on every conversation-update; the dashboard reads live rows
// so the transcript is near-real-time (webhook latency, not REST poll lag).
import { getSupabaseMemoryConfig } from './supabase-memory.js'

const TABLE = 'vetra_live_calls'
// Rows older than this with no update are treated as stale (call really ended
// but we missed the end event) so they don't linger as "live" forever.
const STALE_MS = 90 * 1000

function config() {
  const c = getSupabaseMemoryConfig()
  return { enabled: c.enabled, url: c.url, key: c.key }
}

export async function upsertLiveCall(row) {
  const c = config()
  if (!c.enabled) return { ok: false }
  const res = await fetch(new URL(`/rest/v1/${TABLE}?on_conflict=call_id`, c.url), {
    method: 'POST',
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([{ ...row, updated_at: new Date().toISOString() }]),
  })
  return { ok: res.ok }
}

export async function listLiveCalls() {
  const c = config()
  if (!c.enabled) return []
  const res = await fetch(new URL(`/rest/v1/${TABLE}?status=eq.in-progress&order=updated_at.desc`, c.url), {
    headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, Accept: 'application/json' },
  })
  if (!res.ok) return []
  const rows = await res.json().catch(() => [])
  const now = Date.now()
  return (Array.isArray(rows) ? rows : []).filter((r) => now - new Date(r.updated_at).getTime() < STALE_MS)
}

export async function endLiveCall(callId) {
  const c = config()
  if (!c.enabled || !callId) return
  await fetch(new URL(`/rest/v1/${TABLE}?call_id=eq.${encodeURIComponent(callId)}`, c.url), {
    method: 'PATCH',
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'ended', updated_at: new Date().toISOString() }),
  })
}
