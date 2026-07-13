import assert from 'node:assert/strict'
import test from 'node:test'
import { bossDefinitions } from '../../frontend/src/gameData.ts'

test('the area path has ten unique, progressively harder bosses', () => {
  assert.equal(bossDefinitions.length, 10)
  assert.equal(new Set(bossDefinitions.map(boss => boss.id)).size, 10)
  assert.equal(new Set(bossDefinitions.map(boss => boss.name)).size, 10)

  let previousTier = 0
  for (const boss of bossDefinitions) {
    assert.ok(boss.tier > previousTier, `${boss.name} should have a higher tier than the previous boss`)
    assert.ok(boss.healthMultiplier > 0)
    assert.ok(boss.attackMultiplier > 0)
    assert.ok(boss.intervalMultiplier > 0)
    assert.ok(boss.rewardMultiplier > 0)
    previousTier = boss.tier
  }
})

test('every boss opens one distinct area in the intended order', () => {
  assert.deepEqual(bossDefinitions.map(boss => boss.unlockPage), [
    'woodcutting',
    'mining',
    'crafting',
    'fishing',
    'farming',
    'cooking',
    'workers',
    'metal detector',
    'factions',
    'auction',
  ])
  assert.equal(new Set(bossDefinitions.map(boss => boss.unlockPage)).size, bossDefinitions.length)
})
