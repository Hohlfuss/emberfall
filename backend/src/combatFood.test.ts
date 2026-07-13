import assert from 'node:assert/strict'
import test from 'node:test'
import { AUTO_EAT_COOLDOWN_MS, autoEatReady, deathGoldPenalty, upgradedFoodHealing } from './combatFood.ts'

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
