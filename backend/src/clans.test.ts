import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeClanDescription,
  sanitizeClanMessage,
  sanitizeClanName,
  sanitizeClanVisibility,
  sanitizePlayerIdentifier,
} from './clans.ts'

test('clan names preserve useful punctuation and normalize whitespace', () => {
  assert.equal(sanitizeClanName("  Ember's   Guard  "), "Ember's Guard")
  assert.equal(sanitizeClanName('Yövartio'), 'Yövartio')
  assert.throws(() => sanitizeClanName('ab'), /3-30/)
  assert.throws(() => sanitizeClanName('Bad <Clan>'), /only contain/)
})

test('clan fields enforce access modes and safe lengths', () => {
  assert.equal(sanitizeClanVisibility('public'), 'public')
  assert.equal(sanitizeClanVisibility('invite_only'), 'invite_only')
  assert.throws(() => sanitizeClanVisibility('closed'), /public or invite-only/)
  assert.equal(sanitizeClanDescription('  Friendly\n players  '), 'Friendly players')
  assert.throws(() => sanitizeClanDescription('x'.repeat(161)), /160/)
})

test('player identifiers and clan messages are normalized', () => {
  assert.equal(sanitizePlayerIdentifier('  Pena  '), 'Pena')
  assert.equal(sanitizeClanMessage('  hello\n clan  '), 'hello clan')
  assert.throws(() => sanitizeClanMessage(' '.repeat(5)), /between 1 and 240/)
})
