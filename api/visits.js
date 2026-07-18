import { listVisits } from '../server/visits.js'

// Completed visits (SOAP + invoice + follow-ups) generated at call-end and
// stored in Supabase. The dashboard merges these with its mock demo data.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const rows = await listVisits()
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.status(200).json({ connected: true, visits: Array.isArray(rows) ? rows : [] })
  } catch (error) {
    res.status(200).json({ connected: false, visits: [], error: error instanceof Error ? error.message : 'Failed to load visits' })
  }
}
