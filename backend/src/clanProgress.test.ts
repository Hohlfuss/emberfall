import test from 'node:test'
import assert from 'node:assert/strict'
import { clanProgress, clanXpNeeded, contributionValue, dailyMaterialIndex, utcDate } from './clanProgress.ts'

test('clan XP advances through increasingly expensive levels', () => {
  assert.deepEqual(clanProgress(0), { level: 1, xp: 0, xpNeeded: 200, totalXp: 0 })
  assert.deepEqual(clanProgress(199), { level: 1, xp: 199, xpNeeded: 200, totalXp: 199 })
  assert.equal(clanProgress(200).level, 2)
  assert.ok(clanXpNeeded(3) > clanXpNeeded(2))
})

test('daily clan materials are stable within a UTC day', () => {
  const first = dailyMaterialIndex('11111111-1111-1111-1111-111111111111', '2026-07-13', 40)
  assert.equal(first, dailyMaterialIndex('11111111-1111-1111-1111-111111111111', '2026-07-13', 40))
  assert.notEqual(first, dailyMaterialIndex('11111111-1111-1111-1111-111111111111', '2026-07-14', 40))
  assert.equal(utcDate(Date.parse('2026-07-13T23:59:59Z')), '2026-07-13')
})

test('contribution value is quantity multiplied by material tier', () => {
  assert.equal(contributionValue(25, 4), 100)
  assert.throws(() => contributionValue(0, 4), /positive whole number/)
})
