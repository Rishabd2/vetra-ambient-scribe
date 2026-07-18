import { readInput, upsertPatientMemory } from '../server/sample-clinic-data.js'

export default async function handler(req, res) {
  if (!allow(req, res)) return
  const input = readInput(req)
  const saved = {
    phone: input.phone || input.contact_number || input.caller_phone || '',
    owner_name: input.owner_name || '',
    pet_name: input.pet_name || '',
    pet_species: input.pet_species || '',
    pet_age: input.pet_age || '',
    issue_name: input.issue_name || input.symptom_description || '',
    urgency_level: input.urgency_level || '',
    appointment_request: input.appointment_request || '',
    last_summary: input.last_summary || '',
    open_followups: input.open_followups || '',
    escalate: input.escalate === true || String(input.escalate || '').toLowerCase() === 'true',
  }
  const memory = await upsertPatientMemory(saved)

  res.status(200).json({
    saved: Boolean(memory?.persisted),
    memory_key: `${saved.phone || 'unknown'}:${saved.pet_name || 'unknown'}`,
    context: saved,
    memory_backend: memory?.persisted ? 'supabase' : 'seeded_fallback',
    note: memory?.persisted
      ? 'Call context saved to Supabase memory.'
      : 'Supabase memory table is not ready yet; run supabase/vetra_patient_memory.sql to enable durable writes.',
  })
}

function allow(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(204).end()
    return false
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(405).json({ error: 'Method not allowed' })
    return false
  }
  return true
}
