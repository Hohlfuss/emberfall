import assert from 'node:assert/strict'
import test from 'node:test'
import { rollGatherYield, sampleBinomial, type RandomSource } from './gathering.ts'

function sequence(values: number[]): RandomSource {
  let index = 0
  return () => values[index++ % values.length]!
}

test('bonus yield guarantees one extra item for every full 100%', () => {
  assert.equal(rollGatherYield(0), 1)
  assert.equal(rollGatherYield(100), 2)
  assert.equal(rollGatherYield(200), 3)
  assert.equal(rollGatherYield(1_000), 11)
})

test('250% yields three items and rolls a 50% chance for a fourth', () => {
  assert.equal(rollGatherYield(250, 1, () => .49), 4)
  assert.equal(rollGatherYield(250, 1, () => .5), 3)
})

test('remainder chances continue correctly on either side of 100%', () => {
  assert.equal(rollGatherYield(99, 1, () => .98), 2)
  assert.equal(rollGatherYield(99, 1, () => .99), 1)
  assert.equal(rollGatherYield(101, 1, () => .009), 3)
  assert.equal(rollGatherYield(101, 1, () => .01), 2)
})

test('worker batches make independent remainder rolls', () => {
  const random = sequence([.1, .9, .2, .8])
  assert.equal(rollGatherYield(250, 4, random), 14)
})

test('bonus yield is uncapped and invalid values fall back safely', () => {
  assert.equal(rollGatherYield(1_050, 1, () => .49), 12)
  assert.equal(rollGatherYield(1_050, 1, () => .5), 11)
  assert.equal(rollGatherYield(-50), 1)
  assert.equal(rollGatherYield(Number.NaN), 1)
  assert.equal(rollGatherYield(250, Number.NaN), 0)
})

test('large worker batches stay bounded without per-completion sampling', () => {
  const completions = 1_000_000
  const centeredRandom = sequence([.5, .25])
  assert.equal(sampleBinomial(completions, .5, centeredRandom), 500_000)
  assert.equal(rollGatherYield(250, completions, sequence([.5, .25])), 3_500_000)
  assert.equal(rollGatherYield(100, completions), completions * 2)
})

test('large tiny-probability batches use bounded Poisson branches', () => {
  const trials = 100_000
  const rareSuccesses = sampleBinomial(trials, .0001, () => .5)
  const rareFailures = trials - sampleBinomial(trials, .9999, () => .5)
  assert.ok(rareSuccesses >= 0 && rareSuccesses < 100)
  assert.ok(rareFailures >= 0 && rareFailures < 100)
})

test('an exact zero random draw can satisfy an extremely small chance', () => {
  assert.equal(sampleBinomial(1, Number.EPSILON, () => 0), 1)
})
