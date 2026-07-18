import { readInput } from '../server/sample-clinic-data.js'

const DEFAULT_EMERGENCY_TRANSFER_NUMBER = '+918696816868'

export default async function handler(req, res) {
  if (!allow(req, res)) return
  const input = readInput(req)
  const transferNumber = process.env.EMERGENCY_TRANSFER_NUMBER || DEFAULT_EMERGENCY_TRANSFER_NUMBER
  res.status(200).json({
    notified: true,
    escalation_id: `er-${Date.now()}`,
    selected_hospital: input.selected_hospital || 'Vetra Emergency Routing',
    transfer_number: transferNumber,
    transfer_destination: 'Vetra Emergency Routing',
    transfer_tool: 'call_transfer',
    next_action: `Use Ringg call_transfer to route the live caller to ${transferNumber}.`,
    callback_number: input.contact_number || input.phone || input.caller_phone || '',
    instructions: 'Emergency team notified. Keep the pet calm, still, and warm, and stay on the line.',
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
