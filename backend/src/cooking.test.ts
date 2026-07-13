import assert from 'node:assert/strict'
import test from 'node:test'
import { cookingRecipes, farmingPlots, fishingSpots } from '../../frontend/src/gameData.ts'

test('cooking has one progressively unlocked healing dish for every tier', () => {
  assert.equal(cookingRecipes.length, 10)
  assert.deepEqual(cookingRecipes.map(recipe => recipe.tier), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(new Set(cookingRecipes.map(recipe => recipe.outputItem)).size, cookingRecipes.length)

  let previousHealing = 0
  let previousDuration = 0
  for (const recipe of cookingRecipes) {
    assert.ok(recipe.healing > previousHealing, `${recipe.name} should heal more than the prior tier`)
    assert.ok(recipe.duration > previousDuration, `${recipe.name} should take longer than the prior tier`)
    previousHealing = recipe.healing
    previousDuration = recipe.duration
  }
})

test('every cooking recipe combines matching-tier fishing and farming ingredients', () => {
  for (const recipe of cookingRecipes) {
    const ingredients = Object.keys(recipe.costs)
    const fish = fishingSpots.filter(spot => ingredients.includes(spot.item))
    const crops = farmingPlots.filter(plot => ingredients.includes(plot.item))

    assert.equal(fish.length, 1, `${recipe.name} should use exactly one fish`)
    assert.equal(crops.length, 1, `${recipe.name} should use exactly one crop`)
    assert.equal(fish[0]?.tier, recipe.tier)
    assert.equal(crops[0]?.tier, recipe.tier)
    assert.ok(Object.values(recipe.costs).every(quantity => Number.isInteger(quantity) && quantity > 0))
  }
})
