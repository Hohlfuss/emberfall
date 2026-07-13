import assert from 'node:assert/strict'
import test from 'node:test'
import { bossDefinitions, startingPages, tierFiveUnlockPages } from '../../frontend/src/gameData.ts'

test('the area path has ten unique, progressively harder bosses', () => {
  assert.equal(bossDefinitions.length, 10)
  assert.equal(new Set(bossDefinitions.map(boss => boss.id)).size, 10)
  assert.equal(new Set(bossDefinitions.map(boss => boss.name)).size, 10)
  assert.deepEqual(bossDefinitions.map(boss => boss.tier), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])

  let previousTier = 0
  for (const boss of bossDefinitions) {
    assert.ok(boss.tier > previousTier, `${boss.name} should have a higher tier than the previous boss`)
    assert.equal(boss.healthMultiplier, 1, `${boss.name} should use its normal-enemy power-tier health`)
    assert.equal(boss.attackMultiplier, 1, `${boss.name} should use its normal-enemy power-tier attack`)
    assert.equal(boss.defenseBonus, 0, `${boss.name} should use its normal-enemy power-tier defense`)
    assert.equal(boss.intervalMultiplier, 1, `${boss.name} should use its normal-enemy power-tier attack interval`)
    assert.ok(boss.rewardMultiplier > 0)
    previousTier = boss.tier
  }
})

test('only metal detector and factions are currently boss-gated', () => {
  assert.deepEqual(bossDefinitions.filter(boss => boss.unlockPage).map(boss => [boss.unlockPage, boss.unlockName]), [
    ['metal detector', 'Metal Detector'],
    ['factions', 'Factions'],
  ])
})

test('core professions are available from the beginning', () => {
  assert.deepEqual(startingPages, ['battle', 'woodcutting', 'mining', 'fishing', 'farming', 'crafting', 'cooking', 'workers', 'inventory', 'achievements', 'auction', 'high scores', 'shop'])
  assert.deepEqual(tierFiveUnlockPages, [])
})
