import assert from 'node:assert/strict'
import test from 'node:test'
import { googleUsernameCandidates, verifyGoogleCredential, type GoogleTokenVerifier } from './googleAuth.ts'

test('Google credentials are accepted only for this app and verified email addresses', async () => {
  const verifier: GoogleTokenVerifier = {
    async verifyIdToken(options) {
      assert.equal(options.idToken, 'google-id-token')
      assert.equal(options.audience, 'emberfall-client-id')
      return {
        getPayload: () => ({
          sub: 'google-user-123',
          email: 'Hero.Player@gmail.com',
          email_verified: true,
          name: 'Hero Player',
        }),
      }
    },
  }

  assert.deepEqual(
    await verifyGoogleCredential('google-id-token', 'emberfall-client-id', verifier),
    {
      subject: 'google-user-123',
      email: 'hero.player@gmail.com',
      name: 'Hero Player',
    },
  )
})

test('unverified Google accounts are rejected', async () => {
  const verifier: GoogleTokenVerifier = {
    async verifyIdToken() {
      return {
        getPayload: () => ({
          sub: 'google-user-123',
          email: 'hero@gmail.com',
          email_verified: false,
          name: 'Hero',
        }),
      }
    },
  }

  await assert.rejects(
    verifyGoogleCredential('token', 'client-id', verifier),
    /verified email address/i,
  )
})

test('Google profiles produce valid deterministic username candidates', () => {
  assert.deepEqual(
    googleUsernameCandidates('Hero.Player+game@gmail.com', '109876543210987654321'),
    ['hero.player', 'hero.player-654321', 'hero.player-210987'],
  )
  assert.deepEqual(
    googleUsernameCandidates('!!!@gmail.com', '123456789'),
    ['player-456789', 'player-123456'],
  )
})
