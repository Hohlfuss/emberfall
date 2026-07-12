import assert from 'node:assert/strict'
import test from 'node:test'
import { allResources, rareMaterials, recipes } from '../../frontend/src/gameData.ts'

const expandedComponents = [
  { id: 'maplePlank', output: 'Maple Plank', costs: { 'Maple Log': 3, 'Living Bark': 1 } },
  { id: 'yewPlank', output: 'Yew Plank', costs: { 'Yew Log': 4, 'Living Bark': 1 } },
  { id: 'spiritWeave', output: 'Spiritweave', costs: { 'Spirit Log': 3, 'Spirit Pollen': 2, 'Resin Binding': 1 } },
  { id: 'steelIngot', output: 'Steel Ingot', costs: { 'Iron Ingot': 2, 'Cinder Coal': 2 } },
  { id: 'fossilComposite', output: 'Fossil Composite', costs: { 'Fossil Shard': 3, 'Granite Block': 1, 'Resin Binding': 1 } },
  { id: 'runestone', output: 'Runestone', costs: { 'Runestone Fragment': 3, 'Crystal Lens': 1, 'Obsidian Plate': 1 } },
  { id: 'starsteelIngot', output: 'Starsteel Ingot', costs: { 'Mythril Ingot': 2, 'Starsteel Dust': 3, 'Gold Ingot': 1 } },
] as const

test('seven additional component recipes expand the crafting chain', () => {
  for (const expected of expandedComponents) {
    const recipe = recipes.find(candidate => candidate.id === expected.id)
    assert.ok(recipe, `Missing recipe ${expected.id}`)
    assert.equal(recipe.outputItem, expected.output)
    assert.deepEqual(recipe.costs, expected.costs)
    assert.equal(recipe.outputQty, 1)
  }
})

test('every rare material is useful and every new component feeds a later craft', () => {
  for (const material of rareMaterials) {
    assert.ok(
      recipes.some(recipe => Object.hasOwn(recipe.costs, material.name)),
      `${material.name} is not used by any recipe`,
    )
  }

  for (const component of expandedComponents) {
    assert.ok(
      recipes.some(recipe => recipe.id !== component.id && Object.hasOwn(recipe.costs, component.output)),
      `${component.output} is not used by a downstream recipe`,
    )
  }
})

test('all recipe ingredients have a gathering, rare-drop, or crafting source', () => {
  const obtainable = new Set([
    ...allResources.map(resource => resource.item),
    ...rareMaterials.map(material => material.name),
    ...recipes.flatMap(recipe => recipe.outputItem ? [recipe.outputItem] : []),
  ])

  for (const recipe of recipes) {
    for (const ingredient of Object.keys(recipe.costs)) {
      assert.ok(obtainable.has(ingredient), `${recipe.id} requires unobtainable ${ingredient}`)
    }
  }
})

test('recipe and component identifiers remain unique', () => {
  const recipeIds = recipes.map(recipe => recipe.id)
  const componentOutputs = recipes.flatMap(recipe => recipe.outputItem ? [recipe.outputItem] : [])
  assert.equal(new Set(recipeIds).size, recipeIds.length)
  assert.equal(new Set(componentOutputs).size, componentOutputs.length)
})
