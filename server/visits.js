// Completed-visit store: on call-end we turn Vapi's structuredData + transcript
// into a draft visit (SOAP note, patient fields, derived invoice, follow-ups)
// and persist to Supabase. Patients + Doctor Notes read these back.
import { getSupabaseMemoryConfig } from './supabase-memory.js'

const TABLE = 'vetra_visits'

function cfg() {
  const c = getSupabaseMemoryConfig()
  return { enabled: c.enabled, url: c.url, key: c.key }
}

// Flat price book for deriving invoice lines from the plan/reason.
const PRICE_BOOK = [
  { match: /new patient|new client|establish/i, code: 'EXAM-NEW', desc: 'New patient exam', price: 75 },
  { match: /exam|check[- ]?up|wellness|visit|recheck/i, code: 'EXAM', desc: 'Office / wellness exam', price: 55 },
  { match: /vaccin|rabies|booster|fvrcp|dhpp/i, code: 'VAX', desc: 'Vaccination', price: 35 },
  { match: /dental|teeth|cleaning|tartar/i, code: 'DENT', desc: 'Dental assessment', price: 90 },
  { match: /x-?ray|radiograph|imaging/i, code: 'RAD', desc: 'Radiographs', price: 120 },
  { match: /blood|panel|lab|test/i, code: 'LAB', desc: 'Bloodwork / lab panel', price: 85 },
  { match: /ear|otitis|itch|skin|derm/i, code: 'DERM', desc: 'Dermatology / ear workup', price: 65 },
  { match: /abscess|wound|laceration|injur|limp|lameness/i, code: 'TX', desc: 'Wound / lameness treatment', price: 110 },
]

export function buildVisit({ callId, structured = {}, summary = '', transcript = [] }) {
  const s = structured.soap || {}
  const reason = clean(structured.reason)
  const plan = clean(s.plan)
  const assessment = clean(s.assessment)

  // Invoice lines: always the exam; add matches from reason+plan+assessment.
  const hay = `${reason} ${plan} ${assessment}`
  const seen = new Set()
  const lines = []
  const baseExam = structured.is_new_patient ? PRICE_BOOK[0] : PRICE_BOOK[1]
  lines.push({ code: baseExam.code, description: baseExam.desc, qty: 1, price: baseExam.price, source: 'from Reason' })
  seen.add(baseExam.code)
  for (const item of PRICE_BOOK.slice(2)) {
    if (item.match.test(hay) && !seen.has(item.code)) {
      lines.push({ code: item.code, description: item.desc, qty: 1, price: item.price, source: 'from Plan' })
      seen.add(item.code)
    }
  }
  const subtotal = lines.reduce((t, l) => t + l.qty * l.price, 0)
  const tax = Math.round(subtotal * 0.08 * 100) / 100

  return {
    call_id: callId,
    owner_name: clean(structured.owner_name),
    pet_name: clean(structured.pet_name) || 'Unknown pet',
    species: clean(structured.species),
    breed: clean(structured.breed),
    age: clean(structured.age),
    is_new_patient: Boolean(structured.is_new_patient),
    reason,
    summary: clean(summary),
    soap: {
      summary: clean(summary) || reason,
      subjective: clean(s.subjective),
      objective: clean(s.objective),
      assessment,
      plan,
    },
    invoice: { lines, subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 },
    followups: Array.isArray(structured.followups) ? structured.followups.filter(Boolean) : [],
    transcript,
    status: 'draft',
  }
}

export async function upsertVisit(visit) {
  const c = cfg()
  if (!c.enabled) return { ok: false }
  const res = await fetch(new URL(`/rest/v1/${TABLE}?on_conflict=call_id`, c.url), {
    method: 'POST',
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([{ ...visit, updated_at: new Date().toISOString() }]),
  })
  return { ok: res.ok }
}

export async function listVisits() {
  const c = cfg()
  if (!c.enabled) return []
  const res = await fetch(new URL(`/rest/v1/${TABLE}?select=*&order=created_at.desc`, c.url), {
    headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, Accept: 'application/json' },
  })
  if (!res.ok) return []
  return res.json().catch(() => [])
}

function clean(v) {
  return v === undefined || v === null ? '' : String(v).trim()
}
