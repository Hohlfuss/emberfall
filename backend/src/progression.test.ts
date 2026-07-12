import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PROGRESSION_REQUIREMENT_MULTIPLIER,
  craftingXpNeeded,
  playerXpNeeded,
  professionXpNeeded,
} from './progression.ts'

const legacyPlayerRequirement = (level: number) => 140 + 85 * (level - 1) ** 1.55
const legacyProfessionRequirement = (level: number) => 55 * level ** 1.8
const legacyCraftingRequirement = (level: number) => 70 * level ** 1.7

test('all leveling tracks require about ten percent more XP', () => {
  assert.equal(PROGRESSION_REQUIREMENT_MULTIPLIER, 1.1)

  for (const level of [1, 2, 5, 10, 25]) {
    assert.equal(playerXpNeeded(level), Math.round(legacyPlayerRequirement(level) * 1.1))
    assert.equal(professionXpNeeded(level), Math.round(legacyProfessionRequirement(level) * 1.1))
    assert.equal(craftingXpNeeded(level), Math.round(legacyCraftingRequirement(level) * 1.1))
  }
})

test('XP requirements handle invalid levels safely', () => {
  assert.equal(playerXpNeeded(0), playerXpNeeded(1))
  assert.equal(professionXpNeeded(Number.NaN), professionXpNeeded(1))
  assert.equal(craftingXpNeeded(-10), craftingXpNeeded(1))
})
