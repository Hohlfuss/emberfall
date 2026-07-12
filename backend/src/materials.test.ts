import assert from 'node:assert/strict'
import test from 'node:test'
import { rareMaterials, rocks, woods } from '../../frontend/src/gameData.ts'
import { eligibleRareMaterials, rollRareGatherMaterial, type RandomSource } from './materials.ts'

function sequence(values: number[]): RandomSource {
  let index = 0
  return () => values[index++ % values.length]!
}

function resource(id: string) {
  const match = [...woods, ...rocks].find(candidate => candidate.id === id)
  assert.ok(match, `Expected resource ${id} to exist`)
  return match
}

test('gathering has early, mid, and late rare materials for each resource family', () => {
  assert.deepEqual(
    rareMaterials.map(material => material.name),
    [
      'Ancient Resin', 'Living Bark', 'Spirit Pollen',
      'Ore Crystal', 'Cinder Coal', 'Starsteel Dust',
      'Rough Gem', 'Fossil Shard', 'Runestone Fragment',
    ],
  )

  assert.deepEqual(eligibleRareMaterials(resource('pine')).map(material => material.name), ['Ancient Resin'])
  assert.deepEqual(eligibleRareMaterials(resource('maple')).map(material => material.name), ['Ancient Resin', 'Living Bark'])
  assert.deepEqual(eligibleRareMaterials(resource('elder')).map(material => material.name), ['Ancient Resin', 'Living Bark', 'Spirit Pollen'])

  assert.deepEqual(eligibleRareMaterials(resource('copper')).map(material => material.name), ['Ore Crystal'])
  assert.deepEqual(eligibleRareMaterials(resource('iron')).map(material => material.name), ['Ore Crystal', 'Cinder Coal'])
  assert.deepEqual(eligibleRareMaterials(resource('gold')).map(material => material.name), ['Ore Crystal', 'Cinder Coal', 'Starsteel Dust'])

  assert.deepEqual(eligibleRareMaterials(resource('stone')).map(material => material.name), ['Rough Gem'])
  assert.deepEqual(eligibleRareMaterials(resource('granite')).map(material => material.name), ['Rough Gem', 'Fossil Shard'])
  assert.deepEqual(eligibleRareMaterials(resource('moonstone')).map(material => material.name), ['Rough Gem', 'Fossil Shard', 'Runestone Fragment'])
})

test('a successful rare roll selects from materials available at that resource tier', () => {
  assert.equal(rollRareGatherMaterial(resource('maple'), sequence([0, .999]))?.name, 'Living Bark')
  assert.equal(rollRareGatherMaterial(resource('gold'), sequence([0, .999]))?.name, 'Starsteel Dust')
  assert.equal(rollRareGatherMaterial(resource('moonstone'), sequence([0, .999]))?.name, 'Runestone Fragment')
})

test('a failed rare roll yields no secondary material', () => {
  assert.equal(rollRareGatherMaterial(resource('maple'), () => .999), undefined)
})
