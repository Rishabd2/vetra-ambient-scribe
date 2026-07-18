import { findPatient, getInputValue, readInput } from '../server/sample-clinic-data.js'

export default async function handler(req, res) {
  if (!allow(req, res)) return
  const input = readInput(req)
  const match = await findPatient({
    phone: getInputValue(input, ['caller_phone', 'phone', 'contact_number', 'mobile_number']),
    ownerName: getInputValue(input, ['owner_name', 'ownerName', 'caller_name', 'name']),
    petName: getInputValue(input, ['pet_name', 'petName']),
  })

  if (!match) {
    res.status(200).json({
      found: false,
      previous_memory: '',
      message: 'No patient memory record found. Collect owner and pet details fresh.',
    })
    return
  }

  const { owner, pet, confidence } = match
  const latestAppointment = (pet.appointments || [])
    .filter((appointment) => !['cancelled', 'canceled'].includes(String(appointment.status || '').toLowerCase()))
    .sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a))[0] || null
  res.status(200).json({
    found: true,
    match_confidence: confidence,
    memory_backend: 'supabase_or_seed',
    owner_name: title(owner.owner_name),
    phone: owner.phone,
    pet_name: title(pet.pet_name),
    pet_species: title(pet.pet_species),
    pet_breed: title(pet.pet_breed),
    pet_age: pet.pet_age,
    prior_issue: pet.prior_issue,
    last_summary: pet.last_summary,
    open_followups: pet.open_followups,
    cal_booking_uid: latestAppointment?.booking_uid || '',
    latest_appointment: latestAppointment,
    previous_memory: `${title(pet.pet_name)} is a ${pet.pet_age} ${pet.pet_species}. ${pet.last_summary} ${pet.open_followups}`,
  })
}

function allow(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    res.status(204).end()
    return false
  }
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    res.status(405).json({ error: 'Method not allowed' })
    return false
  }
  return true
}

function title(value) {
  return String(value || '').replace(/\b\w/g, (char) => char.toUpperCase())
}

function appointmentSortValue(appointment) {
  const parsed = new Date(`${appointment.date || ''}T${appointment.time || '00:00'}:00Z`).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}
