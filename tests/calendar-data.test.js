import test from 'node:test'
import assert from 'node:assert/strict'

import { NOW, SEED_APPOINTMENTS } from '../src/data.js'

test('demo calendar opens in July 2026 with only July bookings', () => {
  assert.equal(NOW.toISOString().slice(0, 7), '2026-07')
  assert.ok(SEED_APPOINTMENTS.length > 0)
  assert.ok(
    SEED_APPOINTMENTS.every((appointment) => appointment.date.startsWith('2026-07-')),
    'every seeded appointment should be in July 2026',
  )
})
