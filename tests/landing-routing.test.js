import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveInitialView } from '../src/navigation.js'

test('public root opens the new landing page while dashboard has a dedicated route', () => {
  assert.equal(resolveInitialView({ pathname: '/', search: '', hash: '' }), 'landing')
  assert.equal(resolveInitialView({ pathname: '/dashboard', search: '', hash: '' }), 'overview')
  assert.equal(resolveInitialView({ pathname: '/', search: '?page=dashboard', hash: '' }), 'overview')
})

test('legacy landing remains available as a rollback surface', () => {
  assert.equal(resolveInitialView({ pathname: '/', search: '?page=legacy', hash: '' }), 'legacyLanding')
  assert.equal(resolveInitialView({ pathname: '/', search: '?page=landing', hash: '' }), 'landing')
})

test('revenue route remains intact', () => {
  assert.equal(resolveInitialView({ pathname: '/revenue', search: '', hash: '' }), 'revenue')
})
