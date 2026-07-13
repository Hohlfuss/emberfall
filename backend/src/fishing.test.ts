import assert from 'node:assert/strict'
import test from 'node:test'
import { fishingSpots, gearCatalog, recipes } from '../../frontend/src/gameData.ts'

const rodIds = ['pineFishingRod', 'ironFishingRod', 'silverFishingRod', 'mythrilFishingRod'] as const

test('fishing has one progressively unlocked spot for every gathering tier', () => {
  assert.equal(fishingSpots.length, 10)
  assert.deepEqual(fishingSpots.map(spot => spot.tier), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.ok(fishingSpots.every(spot => spot.skill === 'fishing' && spot.family === 'fish'))
  assert.equal(new Set(fishingSpots.map(spot => spot.item)).size, fishingSpots.length)
})

test('fishing rods form an increasingly powerful tool path', () => {
  assert.equal(gearCatalog.wornFishingRod?.slot, 'fishingRod')

  let previousSpeed = 0
  for (const rodId of rodIds) {
    const rod = gearCatalog[rodId]
    assert.ok(rod, `Missing fishing rod ${rodId}`)
    assert.equal(rod.slot, 'fishingRod')
    assert.ok((rod.bonuses.fishingSpeed || 0) > previousSpeed)
    assert.ok((rod.bonuses.fishingCrit || 0) > 0)
    previousSpeed = rod.bonuses.fishingSpeed || 0

    const recipe = recipes.find(candidate => candidate.outputGear === rodId)
    assert.ok(recipe, `Missing crafting recipe for ${rodId}`)
    assert.equal(recipe.category, 'tools')
  }
})

test('advanced rods upgrade catch yield as well as speed and critical chance', () => {
  assert.equal(gearCatalog.silverFishingRod?.bonuses.fishingBonusYieldPercent, 15)
  assert.equal(gearCatalog.mythrilFishingRod?.bonuses.fishingBonusYieldPercent, 25)
})
