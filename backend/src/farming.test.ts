import assert from 'node:assert/strict'
import test from 'node:test'
import { farmingPlots, gearCatalog, recipes } from '../../frontend/src/gameData.ts'

const hoeIds = ['pineFarmingHoe', 'ironFarmingHoe', 'silverFarmingHoe', 'mythrilFarmingHoe'] as const

test('farming has one progressively unlocked crop for every gathering tier', () => {
  assert.equal(farmingPlots.length, 10)
  assert.deepEqual(farmingPlots.map(plot => plot.tier), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.ok(farmingPlots.every(plot => plot.skill === 'farming' && plot.family === 'crop'))
  assert.equal(new Set(farmingPlots.map(plot => plot.item)).size, farmingPlots.length)
})

test('farming hoes form an increasingly powerful tool path', () => {
  assert.equal(gearCatalog.wornFarmingHoe?.slot, 'farmingHoe')

  let previousSpeed = 0
  for (const hoeId of hoeIds) {
    const hoe = gearCatalog[hoeId]
    assert.ok(hoe, `Missing farming hoe ${hoeId}`)
    assert.equal(hoe.slot, 'farmingHoe')
    assert.ok((hoe.bonuses.farmingSpeed || 0) > previousSpeed)
    assert.ok((hoe.bonuses.farmingCrit || 0) > 0)
    previousSpeed = hoe.bonuses.farmingSpeed || 0

    const recipe = recipes.find(candidate => candidate.outputGear === hoeId)
    assert.ok(recipe, `Missing crafting recipe for ${hoeId}`)
    assert.equal(recipe.category, 'tools')
  }
})

test('advanced hoes upgrade crop yield as well as speed and critical chance', () => {
  assert.equal(gearCatalog.silverFarmingHoe?.bonuses.farmingBonusYieldPercent, 15)
  assert.equal(gearCatalog.mythrilFarmingHoe?.bonuses.farmingBonusYieldPercent, 25)
})
