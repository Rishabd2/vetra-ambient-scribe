import assert from 'node:assert/strict'
import test from 'node:test'

import { handleVapiToolCalls } from '../server/vapi-adapter.js'

const BASE_URL = 'https://cv-vetra.vercel.app'

test('dispatches Vapi tool calls to the matching Vetra endpoint', async () => {
  const requests = []
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options })
    return new Response(JSON.stringify({ found: false, message: 'No patient found.' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const results = await handleVapiToolCalls({
    message: {
      type: 'tool-calls',
      toolCallList: [{
        id: 'call-1',
        type: 'function',
        function: {
          name: 'lookupPatient',
          arguments: { phone: '+15555550100', pet_name: 'Milo' },
        },
      }],
    },
  }, { baseUrl: BASE_URL, fetchImpl })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, `${BASE_URL}/api/lookup_patient`)
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    phone: '+15555550100',
    pet_name: 'Milo',
  })
  assert.equal(results[0].toolCallId, 'call-1')
  assert.equal(results[0].name, 'lookupPatient')
  assert.match(results[0].result, /No patient found/)
})

test('parses stringified function arguments', async () => {
  let body
  const fetchImpl = async (_url, options) => {
    body = JSON.parse(options.body)
    return new Response(JSON.stringify({ connected: true }), { status: 200 })
  }

  await handleVapiToolCalls({
    message: {
      type: 'tool-calls',
      toolCallList: [{
        id: 'call-2',
        function: {
          name: 'getAvailableSlots',
          arguments: '{"date":"2026-07-20"}',
        },
      }],
    },
  }, { baseUrl: BASE_URL, fetchImpl })

  assert.deepEqual(body, { date: '2026-07-20' })
})

test('returns a Vapi tool error for unsupported functions without calling downstream APIs', async () => {
  let called = false
  const results = await handleVapiToolCalls({
    message: {
      type: 'tool-calls',
      toolCallList: [{ id: 'call-3', function: { name: 'unknownTool', arguments: {} } }],
    },
  }, {
    baseUrl: BASE_URL,
    fetchImpl: async () => {
      called = true
      return new Response('{}')
    },
  })

  assert.equal(called, false)
  assert.equal(results[0].toolCallId, 'call-3')
  assert.match(results[0].error, /Unsupported Vapi tool/)
})

test('wraps downstream API failures as Vapi tool errors', async () => {
  const results = await handleVapiToolCalls({
    message: {
      type: 'tool-calls',
      toolCallList: [{
        id: 'call-4',
        function: { name: 'bookAppointment', arguments: { pet_name: 'Milo' } },
      }],
    },
  }, {
    baseUrl: BASE_URL,
    fetchImpl: async () => new Response(JSON.stringify({ error: 'Missing owner_name' }), { status: 400 }),
  })

  assert.equal(results[0].toolCallId, 'call-4')
  assert.match(results[0].error, /Missing owner_name/)
})
