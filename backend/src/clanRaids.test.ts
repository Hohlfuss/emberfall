import test from 'node:test'
import assert from 'node:assert/strict'
import { raidBossDefinitions, simulateRaidAttempt, utcWeekKey, weeklyRaidDefinition, weeklyRaidStats } from './clanRaids.ts'

test('weekly raid changes on Monday at 00:00 UTC', () => {
  assert.equal(utcWeekKey(Date.parse('2026-07-19T23:59:59.999Z')), '2026-07-13')
  assert.equal(utcWeekKey(Date.parse('2026-07-20T00:00:00.000Z')), '2026-07-20')
  assert.notEqual(weeklyRaidDefinition('2026-07-13').id, weeklyRaidDefinition('2026-07-20').id)
  assert.ok(raidBossDefinitions.length >= 4)
})

test('a defeated raid makes the following raid strictly stronger and more rewarding', () => {
  const first = weeklyRaidStats(0)
  const second = weeklyRaidStats(1)
  assert.equal(first.difficulty, 1)
  assert.equal(second.difficulty, 2)
  assert.ok(second.maxHealth > first.maxHealth)
  assert.ok(second.attack > first.attack)
  assert.ok(second.goldReward > first.goldReward)
  assert.ok(second.xpReward > first.xpReward)
  assert.ok(second.clanXpReward > first.clanXpReward)
  assert.ok(first.attack >= 40)
})

test('raid attempts use combat stats without mutating them', () => {
  const player = { maxHealth: 100, attack: 12, defense: 3, attackSpeed: 1_620 }
  const boss = { currentHealth: 1_200, attack: 10, defense: 1, attackSpeed: 2_160 }
  const result = simulateRaidAttempt(player, boss)
  assert.equal(result.damage, 110)
  assert.equal(result.survived, false)
  assert.equal(result.timeline.at(-1)?.playerHealth, 0)
  assert.equal(result.timeline.at(-1)?.bossHealth, 1_090)
  assert.equal(result.timeline.filter(event => event.actor === 'boss')[0]?.damage, 14)
  assert.ok(result.duration > 0)
  assert.deepEqual(player, { maxHealth: 100, attack: 12, defense: 3, attackSpeed: 1_620 })
})

test('the player can finish a weakened shared raid before being knocked out', () => {
  const result = simulateRaidAttempt(
    { maxHealth: 100, attack: 20, defense: 5, attackSpeed: 1_000 },
    { currentHealth: 30, attack: 50, defense: 2, attackSpeed: 2_000 },
  )
  assert.equal(result.damage, 30)
  assert.equal(result.survived, true)
  assert.ok(result.playerHealth > 0)
  assert.equal(result.timeline.at(-1)?.bossHealth, 0)
})
