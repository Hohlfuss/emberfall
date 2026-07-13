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

test('every cooking recipe uses its matching-tier fish and crop in increasingly complex meals', () => {
  for (const recipe of cookingRecipes) {
    const ingredients = Object.keys(recipe.costs)
    const matchingFish = fishingSpots.find(spot => spot.tier === recipe.tier)
    const matchingCrop = farmingPlots.find(plot => plot.tier === recipe.tier)

    assert.ok(matchingFish && ingredients.includes(matchingFish.item), `${recipe.name} should use its matching-tier fish`)
    assert.ok(matchingCrop && ingredients.includes(matchingCrop.item), `${recipe.name} should use its matching-tier crop`)
    assert.equal(ingredients.length, recipe.tier === 1 ? 2 : recipe.tier < 4 ? 3 : 4)
    assert.ok(Object.values(recipe.costs).every(quantity => Number.isInteger(quantity) && quantity > 0))
  }
})

test('some foods provide valid healing over time without making every food identical', () => {
  const hotFoods = cookingRecipes.filter(recipe => recipe.hot)
  assert.ok(hotFoods.length >= 3)
  assert.ok(hotFoods.length < cookingRecipes.length)
  for (const recipe of hotFoods) {
    assert.ok(Number.isInteger(recipe.hot!.healing) && recipe.hot!.healing > 0)
    assert.ok(Number.isInteger(recipe.hot!.duration) && recipe.hot!.duration > 0)
  }
})
