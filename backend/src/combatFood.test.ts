import assert from 'node:assert/strict'
import test from 'node:test'
import { AUTO_EAT_COOLDOWN_MS, autoEatReady, deathGoldPenalty, healOverTimeProgress, stackedHealOverTimeTiming, upgradedFoodHealing } from './combatFood.ts'

test('death removes ten percent of current whole gold', () => {
  assert.equal(deathGoldPenalty(0), 0)
  assert.equal(deathGoldPenalty(9), 0)
  assert.equal(deathGoldPenalty(10), 1)
  assert.equal(deathGoldPenalty(999), 99)
  assert.equal(deathGoldPenalty(10_000), 1_000)
})

test('healing power adds ten percent per rank', () => {
  assert.equal(upgradedFoodHealing(15, 0), 15)
  assert.equal(upgradedFoodHealing(15, 1), 17)
  assert.equal(upgradedFoodHealing(100, 5), 150)
  assert.equal(upgradedFoodHealing(325, 10), 650)
})

test('heal over time applies only newly earned healing and completes at its end', () => {
  const effect = { totalHealing: 20, appliedHealing: 0, startedAt: 1_000, endsAt: 5_000 }
  assert.deepEqual(healOverTimeProgress(effect, 1_000), { healing: 0, appliedHealing: 0, complete: false })
  assert.deepEqual(healOverTimeProgress(effect, 2_000), { healing: 5, appliedHealing: 5, complete: false })
  assert.deepEqual(healOverTimeProgress({ ...effect, appliedHealing: 5 }, 4_000), { healing: 10, appliedHealing: 15, complete: false })
  assert.deepEqual(healOverTimeProgress({ ...effect, appliedHealing: 15 }, 5_000), { healing: 5, appliedHealing: 20, complete: true })
})

test('additional heal-over-time foods stack their duration after the current effect', () => {
  const first = stackedHealOverTimeTiming(undefined, 1_000, 10)
  const second = stackedHealOverTimeTiming(first.endsAt, 2_000, 8)
  const third = stackedHealOverTimeTiming(second.endsAt, 3_000, 5)
  assert.deepEqual(first, { startedAt: 1_000, endsAt: 11_000 })
  assert.deepEqual(second, { startedAt: 11_000, endsAt: 19_000 })
  assert.deepEqual(third, { startedAt: 19_000, endsAt: 24_000 })
})

test('auto eat requires its unlock, food, low health, and an expired cooldown', () => {
  const ready = {
    enabled: true,
    unlocked: true,
    health: 50,
    maxHealth: 100,
    itemCount: 1,
    nextAutoEatAt: 10_000,
    now: 10_000,
  }
  assert.equal(autoEatReady(ready), true)
  assert.equal(autoEatReady({ ...ready, health: 51 }), false)
  assert.equal(autoEatReady({ ...ready, itemCount: 0 }), false)
  assert.equal(autoEatReady({ ...ready, unlocked: false }), false)
  assert.equal(autoEatReady({ ...ready, enabled: false }), false)
  assert.equal(autoEatReady({ ...ready, nextAutoEatAt: ready.now + AUTO_EAT_COOLDOWN_MS }), false)
})
