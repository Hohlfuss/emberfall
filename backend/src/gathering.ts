export type RandomSource = () => number

function randomProbability(random: RandomSource) {
  const value = random()
  return Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0
}

function samplePoisson(mean: number, random: RandomSource) {
  const limit = Math.exp(-mean)
  let product = 1
  let samples = 0

  do {
    samples++
    product *= randomProbability(random)
  } while (product > limit)

  return samples - 1
}

function sampleNormal(mean: number, deviation: number, random: RandomSource) {
  const radius = Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, randomProbability(random))))
  const angle = 2 * Math.PI * randomProbability(random)
  return Math.round(mean + deviation * radius * Math.cos(angle))
}

export function sampleBinomial(trials: number, probability: number, random: RandomSource = Math.random) {
  const count = Number.isFinite(trials) ? Math.max(0, Math.floor(trials)) : 0
  const chance = Number.isFinite(probability) ? Math.min(1, Math.max(0, probability)) : 0
  if (!count || !chance) return 0
  if (chance === 1) return count

  if (count <= 10_000) {
    let successes = 0
    for (let trial = 0; trial < count; trial++) {
      if (randomProbability(random) < chance) successes++
    }
    return successes
  }

  const expectedSuccesses = count * chance
  const expectedFailures = count - expectedSuccesses
  if (expectedSuccesses < 30) return Math.min(count, samplePoisson(expectedSuccesses, random))
  if (expectedFailures < 30) return count - Math.min(count, samplePoisson(expectedFailures, random))

  const sampled = sampleNormal(expectedSuccesses, Math.sqrt(count * chance * (1 - chance)), random)
  return Math.min(count, Math.max(0, sampled))
}

export function rollGatherYield(bonusYieldPercent: number, actions = 1, random: RandomSource = Math.random) {
  const completions = Number.isFinite(actions) ? Math.max(0, Math.floor(actions)) : 0
  const percentage = Number.isFinite(bonusYieldPercent) ? Math.max(0, bonusYieldPercent) : 0
  const guaranteedExtra = Math.floor(percentage / 100)
  const remainderChance = percentage % 100 / 100
  return completions * (1 + guaranteedExtra) + sampleBinomial(completions, remainderChance, random)
}
