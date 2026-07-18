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
      due: false,
      items: [],
      message: 'No due-care record found for this patient.',
    })
    return
  }

  const items = match.pet.due_care || []
  const highest = items.find((item) => item.priority === 'high') || items[0] || null
  res.status(200).json({
    due: Boolean(highest),
    pet_name: title(match.pet.pet_name),
    highest_priority_item: highest,
    items,
    spoken_offer: highest
      ? `${title(match.pet.pet_name)} is also due for ${highest.item}. You can offer to add it to the same visit once the booking is settled.`
      : '',
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
