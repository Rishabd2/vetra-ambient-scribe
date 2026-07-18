import {
  allowMethods,
  clampNumber,
  getAvailableSlots,
  getCalConfig,
  queryParam,
  sendApiError,
  sendJson,
  todayInTimeZone,
  addDaysIso,
  normalizeDateOnly,
} from '../../server/cal/client.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  const config = getCalConfig()
  const timeZone = queryParam(req.query.timeZone || req.query.timezone) || config.timeZone
  if (!config.apiKey) {
    sendJson(res, 200, {
      connected: false,
      eventType: {},
      timeZone,
      days: [],
      slots: [],
      slotsByDate: {},
      message: 'Set CAL_API_KEY to load live Cal.com slots.',
    })
    return
  }

  const start = normalizeDateOnly(queryParam(req.query.start || req.query.date)) || todayInTimeZone(timeZone)
  const days = clampNumber(req.query.days, 1, 31, 10)
  const end = normalizeDateOnly(queryParam(req.query.end)) || addDaysIso(start, days - 1)
  const duration = queryParam(req.query.duration)

  try {
    const result = await getAvailableSlots({ start, end, timeZone, duration })
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    sendJson(res, 200, {
      connected: true,
      eventType: result.eventType,
      timeZone: result.timeZone,
      start: result.start,
      end: result.end,
      days: result.days,
      slots: result.slots,
      slotsByDate: result.slotsByDate,
    })
  } catch (error) {
    sendApiError(res, error)
  }
}
