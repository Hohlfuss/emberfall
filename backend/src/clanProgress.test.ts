import test from 'node:test'
import assert from 'node:assert/strict'
import { allResources } from '../../frontend/src/gameData.ts'
import { clanContributionMaterialPool, clanProgress, clanXpNeeded, contributionValue, dailyMaterialIndex, utcDate } from './clanProgress.ts'

test('clan XP advances through increasingly expensive levels', () => {
  assert.deepEqual(clanProgress(0), { level: 1, xp: 0, xpNeeded: 200, totalXp: 0 })
  assert.deepEqual(clanProgress(199), { level: 1, xp: 199, xpNeeded: 200, totalXp: 199 })
  assert.equal(clanProgress(200).level, 2)
  assert.ok(clanXpNeeded(3) > clanXpNeeded(2))
})

test('daily clan materials are stable within a UTC day', () => {
  const materials = clanContributionMaterialPool(allResources)
  const first = dailyMaterialIndex('11111111-1111-1111-1111-111111111111', '2026-07-13', materials.length)
  assert.equal(first, dailyMaterialIndex('11111111-1111-1111-1111-111111111111', '2026-07-13', materials.length))
  assert.notEqual(first, dailyMaterialIndex('11111111-1111-1111-1111-111111111111', '2026-07-14', materials.length))
  assert.ok(materials.length > 0)
  assert.ok(materials.every(material => material.skill === 'woodcutting' || material.skill === 'mining'))
  assert.ok(!materials.some(material => material.skill === 'fishing' || material.skill === 'farming'))
  assert.equal(utcDate(Date.parse('2026-07-13T23:59:59Z')), '2026-07-13')
})

test('contribution value is quantity multiplied by material tier', () => {
  assert.equal(contributionValue(25, 4), 100)
  assert.throws(() => contributionValue(0, 4), /positive whole number/)
})
