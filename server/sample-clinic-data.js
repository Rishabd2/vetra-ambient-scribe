import {
  getSupabaseMemoryConfig,
  listMemoryRows,
  upsertMemoryRow,
  upsertMemoryRows,
} from './supabase-memory.js'

export const SAMPLE_PATIENTS = [
  {
    owner_name: 'maya shah',
    phone: '44790221168',
    pets: [
      {
        pet_name: 'bruno',
        pet_species: 'cat',
        pet_breed: 'bengal',
        pet_age: '3 years',
        prior_issue: 'limping',
        last_summary: 'Bruno was discussed for limping and an urgent same-day visit request. Caller prefers clear SMS confirmation.',
        open_followups: 'Vaccination reminder due; confirm whether limping has improved.',
        due_care: [
          { item: 'FVRCP booster', priority: 'high', due_date: '2026-06-24', note: 'Offer to add vaccine review to the same visit if clinically appropriate.' },
          { item: 'Weight check', priority: 'medium', due_date: '2026-07-10', note: 'Track appetite and activity after limping episode.' },
        ],
      },
      {
        pet_name: 'buddy',
        pet_species: 'dog',
        pet_breed: 'mixed breed',
        pet_age: '4 years',
        prior_issue: 'morning limp',
        last_summary: 'Buddy had a mild morning limp and owner was flexible on appointment timing.',
        open_followups: 'Ask owner to bring any prior X-ray records if available.',
        due_care: [
          { item: 'Annual wellness exam', priority: 'medium', due_date: '2026-07-01', note: 'Can be combined with orthopedic recheck.' },
        ],
      },
    ],
  },
  {
    owner_name: 'maya sharma',
    phone: '1555010102',
    pets: [
      {
        pet_name: 'bruno',
        pet_species: 'dog',
        pet_breed: 'labrador',
        pet_age: '4 years',
        prior_issue: 'regular checkup',
        last_summary: 'Bruno came in for a regular checkup and the owner prefers simple SMS confirmation.',
        open_followups: 'None.',
        due_care: [
          { item: 'Annual wellness exam', priority: 'medium', due_date: '2026-07-05', note: 'Can be combined with any sick or limping visit.' },
          { item: 'Rabies vaccine review', priority: 'medium', due_date: '2026-07-20', note: 'Confirm vaccine history before administering.' },
        ],
      },
    ],
  },
  {
    owner_name: 'laksharaj',
    phone: '918696816868',
    pets: [
      {
        pet_name: 'john wick',
        pet_species: 'dog',
        pet_breed: 'portuguese water dog',
        pet_age: '4 years',
        prior_issue: 'vomiting with blood specks',
        last_summary: 'Vomiting with blood specks for about twelve hours. Priya recommended same-day evaluation.',
        open_followups: 'Book same-day urgent visit if owner calls back.',
        due_care: [
          { item: 'GI recheck', priority: 'high', due_date: '2026-06-15', note: 'Ask whether vomiting, appetite, and hydration improved.' },
        ],
      },
    ],
  },
  {
    owner_name: 'grace lin',
    phone: '14087725566',
    pets: [
      {
        pet_name: 'noodle',
        pet_species: 'cat',
        pet_breed: 'ragdoll',
        pet_age: '3 years',
        prior_issue: 'reduced appetite',
        last_summary: 'Noodle skipped two meals but was alert and drinking. Same-day sick visit was scheduled.',
        open_followups: 'Post-visit appetite check-in.',
        due_care: [
          { item: 'Appetite recheck', priority: 'high', due_date: '2026-06-16', note: 'Escalate if not eating, hiding, vomiting, or lethargic.' },
        ],
      },
    ],
  },
  {
    owner_name: 'daniel okafor',
    phone: '16282447731',
    pets: [
      {
        pet_name: 'luna',
        pet_species: 'dog',
        pet_breed: 'beagle',
        pet_age: '2 years',
        prior_issue: 'dark chocolate ingestion',
        last_summary: 'Luna may have eaten dark chocolate. Weight is about twenty-two pounds; vet review was requested.',
        open_followups: 'Confirm toxicity assessment and whether same-day exam is needed.',
        due_care: [
          { item: 'Toxin exposure follow-up', priority: 'high', due_date: '2026-06-15', note: 'Ask about vomiting, tremors, restlessness, or diarrhea.' },
        ],
      },
    ],
  },
  {
    owner_name: 'priya nair',
    phone: '14156639012',
    pets: [
      {
        pet_name: 'mochi',
        pet_species: 'cat',
        pet_breed: 'domestic shorthair',
        pet_age: '5 years',
        prior_issue: 'annual booster reminder',
        last_summary: 'Mochi is due for annual FVRCP booster and routine wellness review.',
        open_followups: 'Owner prefers morning appointments.',
        due_care: [
          { item: 'FVRCP booster', priority: 'high', due_date: '2026-06-15', note: 'Can be handled during a routine wellness slot.' },
        ],
      },
    ],
  },
  {
    owner_name: 'meera shah',
    phone: '14153320917',
    pets: [
      {
        pet_name: 'simba',
        pet_species: 'cat',
        pet_breed: 'maine coon',
        pet_age: '7 years',
        prior_issue: 'straining to urinate',
        last_summary: 'Male cat straining without urine and lethargic. This is an emergency red-flag history.',
        open_followups: 'If urinary signs recur, route to emergency immediately.',
        due_care: [
          { item: 'Urinary recheck', priority: 'high', due_date: '2026-06-18', note: 'Do not delay if unable to urinate.' },
        ],
      },
    ],
  },
  {
    owner_name: 'john desire',
    phone: '14479021168',
    pets: [
      {
        pet_name: 'buddy',
        pet_species: 'dog',
        pet_breed: 'golden labrador',
        pet_age: '5 years',
        prior_issue: 'hind-leg injury',
        last_summary: 'Buddy was transferred to Northside ER for possible imaging, then booked for an orthopedic recheck.',
        open_followups: 'Bring discharge notes and any imaging reports.',
        due_care: [
          { item: 'Orthopedic recheck', priority: 'high', due_date: '2026-07-03', note: 'Review gait, pain, and medication response.' },
        ],
      },
    ],
  },
]

let runtimePatients = null
let supabaseSeedAttempted = false

export const SAMPLE_FAQS = [
  {
    topic: 'hours',
    answer: 'Maple Street Vet Clinic is open Monday through Friday from 8 AM to 6 PM and Saturday from 9 AM to 3 PM. Emergency calls are routed to Northside Emergency and Specialty after hours.',
    keywords: ['hour', 'open', 'close', 'saturday', 'after hour'],
  },
  {
    topic: 'walk-ins',
    answer: 'Walk-ins depend on the day and urgency. Booking ahead lets the team prepare for the pet, but emergencies should be routed immediately.',
    keywords: ['walk in', 'walk-in', 'no appointment', 'drop in'],
  },
  {
    topic: 'pricing',
    answer: 'Exam and treatment costs depend on what the veterinarian recommends. The team can review options and estimates before treatment.',
    keywords: ['price', 'cost', 'fee', 'estimate', 'expensive'],
  },
  {
    topic: 'services',
    answer: 'The clinic handles wellness exams, vaccinations, dental cleanings, sick visits, dermatology checks, senior bloodwork, microchips, and routine medication refills.',
    keywords: ['service', 'treat', 'vaccination', 'dental', 'microchip', 'refill'],
  },
  {
    topic: 'emergency',
    answer: 'For breathing trouble, collapse, seizure, heavy bleeding, suspected poison, inability to urinate, severe trauma, pale or blue gums, or unresponsiveness, route to emergency immediately.',
    keywords: ['emergency', 'seizure', 'collapse', 'bleeding', 'poison', 'urinate', 'trauma', 'breathing'],
  },
  {
    topic: 'records',
    answer: 'Owners should bring prior records, vaccine history, current medications, and any discharge notes or imaging from emergency visits.',
    keywords: ['record', 'paperwork', 'x-ray', 'xray', 'medication', 'vaccine history'],
  },
  {
    topic: 'location',
    answer: 'The sample clinic is Maple Street Vet Clinic. For emergency routing, the partner hospital is Northside Emergency and Specialty.',
    keywords: ['location', 'address', 'where', 'directions'],
  },
  {
    topic: 'cancellation',
    answer: 'For cancellations or rescheduling, retrieve the latest appointment and use the live Cal.com tools when a booking reference is available. If no booking reference is available, collect the request and tell the owner the team will follow up.',
    keywords: ['cancel', 'reschedule', 'move appointment'],
  },
]

export async function findPatient({ phone, ownerName, petName } = {}) {
  const phoneKey = digits(phone)
  const ownerKey = normalize(ownerName)
  const petKey = normalize(petName)
  const records = await getPatientRecords()

  const scored = records.map((owner) => {
    const phoneMatch = phoneKey && digits(owner.phone).endsWith(phoneKey.slice(-10))
    const ownerMatch = ownerKey && normalize(owner.owner_name).includes(ownerKey)
    const petMatch = petKey && owner.pets.some((pet) => normalize(pet.pet_name).includes(petKey))
    return {
      owner,
      score: Number(Boolean(phoneMatch)) * 4 + Number(Boolean(ownerMatch)) * 2 + Number(Boolean(petMatch)) * 3,
    }
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score)

  const match = scored[0]?.owner
  if (!match) return null
  const pet = petKey
    ? match.pets.find((item) => normalize(item.pet_name).includes(petKey)) || match.pets[0]
    : match.pets[0]

  return { owner: match, pet, confidence: scored[0].score >= 4 ? 'high' : 'medium' }
}

export async function findLatestAppointment(input = {}) {
  const match = await findPatient({
    phone: input.phone || input.contact_number || input.caller_phone || input.mobile_number,
    ownerName: input.owner_name || input.ownerName || input.caller_name || input.name,
    petName: input.pet_name || input.petName || input.pet?.name,
  })
  if (!match) return null

  const active = (match.pet.appointments || [])
    .filter((appointment) => !['cancelled', 'canceled'].includes(normalize(appointment.status)))
    .sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a))

  return active[0] ? { ...match, appointment: active[0] } : null
}

export async function upsertPatientMemory(input = {}) {
  const records = await getPatientRecords()
  const ownerName = cleanMeaningful(input.owner_name || input.ownerName || input.caller_name || input.name)
  const phone = cleanMeaningful(input.phone || input.contact_number || input.contactNumber || input.caller_phone || input.mobile_number)
  const petName = cleanMeaningful(input.pet_name || input.petName || input.pet?.name)
  if (!ownerName && !phone && !petName) return null

  const phoneKey = digits(phone)
  const ownerKey = normalize(ownerName)
  let owner = ownerKey ? records.find((item) => normalize(item.owner_name) === ownerKey) : null
  if (!owner && !ownerKey) owner = records.find((item) => phoneKey && digits(item.phone).endsWith(phoneKey.slice(-10)))
  if (!owner) {
    owner = { owner_name: ownerName || 'unknown owner', phone: phoneKey || phone || '', pets: [] }
    records.push(owner)
  }

  if (ownerName) owner.owner_name = ownerName.toLowerCase()
  if (phoneKey) owner.phone = phoneKey

  const petKey = normalize(petName)
  let pet = owner.pets.find((item) => petKey && normalize(item.pet_name) === petKey)
  if (!pet) {
    pet = {
      pet_name: petName || 'unknown pet',
      pet_species: '',
      pet_breed: '',
      pet_age: '',
      prior_issue: '',
      last_summary: '',
      open_followups: '',
      due_care: [],
      appointments: [],
    }
    owner.pets.push(pet)
  }

  applyIfMeaningful(pet, 'pet_name', petName)
  applyIfMeaningful(pet, 'pet_species', input.pet_species || input.petSpecies)
  applyIfMeaningful(pet, 'pet_breed', input.pet_breed || input.petBreed)
  applyIfMeaningful(pet, 'pet_age', input.pet_age || input.petAge)
  applyIfMeaningful(pet, 'prior_issue', input.prior_issue || input.issue_name || input.symptom_description)
  applyIfMeaningful(pet, 'last_summary', input.last_summary || input.summary)
  applyIfMeaningful(pet, 'open_followups', input.open_followups || input.openFollowups)

  const appointment = normalizeAppointment(input)
  if (appointment) {
    pet.appointments ||= []
    const existing = findStoredAppointment(pet.appointments, appointment)
    if (existing) {
      Object.assign(existing, appointment)
    } else {
      pet.appointments.push(appointment)
    }
    updateAppointmentSummary(pet, appointment, input)
  }

  const persisted = await persistPatientRecord(owner, pet)
  return { owner, pet, persisted }
}

export function findFaq(question = '') {
  const text = normalize(question)
  if (!text) return null
  const match = SAMPLE_FAQS
    .map((faq) => ({
      faq,
      score: faq.keywords.reduce((score, keyword) => score + Number(text.includes(normalize(keyword))), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]
  return match?.faq || null
}

export function readInput(req) {
  return {
    ...(req.query || {}),
    ...(req.body && typeof req.body === 'object' ? req.body : {}),
  }
}

export function getInputValue(input, keys) {
  for (const key of keys) {
    const value = input[key]
    if (isMeaningful(value)) return value
  }
  return ''
}

export function digits(value) {
  return String(value || '').replace(/\D/g, '')
}

export function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

async function getPatientRecords() {
  if (runtimePatients) return runtimePatients
  runtimePatients = await loadPatientRecords()
  return runtimePatients
}

async function loadPatientRecords() {
  const supabase = await listMemoryRows()
  if (supabase.connected && supabase.rows.length > 0) {
    return rowsToPatientRecords(supabase.rows)
  }

  if (getSupabaseMemoryConfig().enabled && supabase.connected && !supabaseSeedAttempted) {
    supabaseSeedAttempted = true
    const seed = flattenPatientRecords(SAMPLE_PATIENTS)
    const seeded = await upsertMemoryRows(seed)
    if (seeded.connected && seeded.rows.length > 0) {
      return rowsToPatientRecords(seeded.rows)
    }
  }

  return structuredClone(SAMPLE_PATIENTS)
}

async function persistPatientRecord(owner, pet) {
  const result = await upsertMemoryRow(patientToRow(owner, pet))
  return result.connected
}

function flattenPatientRecords(records) {
  return records.flatMap((owner) => (
    (owner.pets || []).map((pet) => patientToRow(owner, pet))
  ))
}

function rowsToPatientRecords(rows) {
  const owners = new Map()
  rows.forEach((row) => {
    const ownerKey = normalize(row.owner_name || row.phone || row.memory_key)
    if (!owners.has(ownerKey)) {
      owners.set(ownerKey, {
        owner_name: row.owner_name || 'unknown owner',
        phone: row.phone || '',
        pets: [],
      })
    }
    const owner = owners.get(ownerKey)
    if (row.phone && !owner.phone) owner.phone = row.phone
    owner.pets.push({
      pet_name: row.pet_name || 'unknown pet',
      pet_species: row.pet_species || '',
      pet_breed: row.pet_breed || '',
      pet_age: row.pet_age || '',
      prior_issue: row.prior_issue || '',
      last_summary: row.last_summary || '',
      open_followups: row.open_followups || '',
      due_care: Array.isArray(row.due_care) ? row.due_care : [],
      appointments: Array.isArray(row.appointments) ? row.appointments : [],
    })
  })
  return Array.from(owners.values())
}

function patientToRow(owner, pet) {
  return {
    memory_key: memoryKey(owner, pet),
    phone: digits(owner.phone),
    owner_name: cleanMeaningful(owner.owner_name),
    pet_name: cleanMeaningful(pet.pet_name) || 'unknown pet',
    pet_species: cleanMeaningful(pet.pet_species),
    pet_breed: cleanMeaningful(pet.pet_breed),
    pet_age: cleanMeaningful(pet.pet_age),
    prior_issue: cleanMeaningful(pet.prior_issue),
    last_summary: cleanMeaningful(pet.last_summary),
    open_followups: cleanMeaningful(pet.open_followups),
    due_care: Array.isArray(pet.due_care) ? pet.due_care : [],
    appointments: Array.isArray(pet.appointments) ? pet.appointments : [],
  }
}

function memoryKey(owner, pet) {
  const phone = digits(owner.phone)
  const ownerName = normalize(owner.owner_name) || 'unknown-owner'
  const petName = normalize(pet.pet_name) || 'unknown-pet'
  return `${phone || ownerName}:${petName}`
}

function applyIfMeaningful(target, key, value) {
  const cleaned = cleanMeaningful(value)
  if (cleaned) target[key] = cleaned
}

function normalizeAppointment(input) {
  const date = cleanMeaningful(input.appointment_date || input.date || input.booking?.date)
  const time = cleanMeaningful(input.appointment_time || input.time || input.booking?.time)
  const bookingUid = cleanMeaningful(input.cal_booking_uid || input.booking_uid || input.booking?.uid)
  const previousBookingUid = cleanMeaningful(input.previous_booking_uid || input.rescheduled_from_uid || input.booking?.rescheduledFromUid)
  if (!date && !time && !bookingUid) return null
  return {
    date,
    time,
    booking_uid: bookingUid,
    previous_booking_uid: previousBookingUid,
    status: cleanMeaningful(input.booking_status || input.booking?.status) || 'booked',
  }
}

function findStoredAppointment(appointments, appointment) {
  if (appointment.booking_uid) {
    const byUid = appointments.find((item) => item.booking_uid === appointment.booking_uid)
    if (byUid) return byUid
  }
  if (appointment.previous_booking_uid) {
    const byPreviousUid = appointments.find((item) => item.booking_uid === appointment.previous_booking_uid)
    if (byPreviousUid) return byPreviousUid
  }
  return appointments.find((item) => (
    item.date === appointment.date &&
    item.time === appointment.time &&
    (!item.booking_uid || !appointment.booking_uid)
  ))
}

function updateAppointmentSummary(pet, appointment, input) {
  const status = normalize(appointment.status)
  const petName = titleCase(pet.pet_name)
  if (status === 'cancelled' || status === 'canceled') {
    pet.last_summary = `${petName}'s appointment was cancelled. ${cleanMeaningful(input.cancellation_reason) || 'Cancellation handled through Cal.com.'}`
    pet.open_followups = 'Offer to rebook if the owner wants another appointment.'
    return
  }
  if (status === 'rescheduled') {
    pet.last_summary = `${petName}'s appointment was rescheduled to ${appointment.date} at ${appointment.time}.`
    pet.open_followups = 'Confirm the owner received the updated appointment details.'
    return
  }
  pet.last_summary = `${petName} was booked for ${appointment.date} at ${appointment.time}. ${cleanMeaningful(input.issue_name) || 'Appointment request handled.'}`
  pet.open_followups = 'Confirm visit completion and update care plan after the appointment.'
}

function appointmentSortValue(appointment) {
  const date = cleanMeaningful(appointment.date)
  const time = cleanMeaningful(appointment.time) || '00:00'
  const parsed = new Date(`${date}T${time}:00Z`).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function isMeaningful(value) {
  return Boolean(cleanMeaningful(value))
}

function cleanMeaningful(value) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (/^\[[^\]]+\]$/.test(text)) return ''
  if (/^@\{\{[^}]+\}\}$/.test(text)) return ''
  if (/^(undefined|null|unknown|n\/a|na)$/i.test(text)) return ''
  return text
}

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (char) => char.toUpperCase())
}
