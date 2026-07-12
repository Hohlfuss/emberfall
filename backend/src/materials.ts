import { rareMaterials, type RareMaterial, type Resource } from '../../frontend/src/gameData.ts'

export type RandomSource = () => number

function randomProbability(random: RandomSource) {
  const value = random()
  return Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0
}

export function eligibleRareMaterials(resource: Resource): RareMaterial[] {
  return rareMaterials.filter(material => material.family === resource.family && material.minTier <= resource.tier)
}

export function rollRareGatherMaterial(resource: Resource, random: RandomSource = Math.random): RareMaterial | undefined {
  const dropChance = Math.min(10, .5 + resource.tier * .75) / 100
  if (randomProbability(random) >= dropChance) return undefined

  const eligible = eligibleRareMaterials(resource)
  if (!eligible.length) return undefined
  return eligible[Math.floor(randomProbability(random) * eligible.length)]
}
