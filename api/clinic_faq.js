import { findFaq, getInputValue, readInput } from '../server/sample-clinic-data.js'

export default async function handler(req, res) {
  if (!allow(req, res)) return
  const input = readInput(req)
  const question = getInputValue(input, ['question', 'query', 'caller_question', 'text'])
  const faq = findFaq(question)

  if (!faq) {
    res.status(200).json({
      found: false,
      answer: "I don't have that information right now, but our team will reach out to you shortly.",
      source: 'sample_clinic_faq',
    })
    return
  }

  res.status(200).json({
    found: true,
    topic: faq.topic,
    answer: faq.answer,
    source: 'sample_clinic_faq',
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
