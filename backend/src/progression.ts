export const PROGRESSION_REQUIREMENT_MULTIPLIER = 1.1

function normalizedLevel(level: number) {
  return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
}

function scaledRequirement(baseRequirement: number) {
  return Math.round(baseRequirement * PROGRESSION_REQUIREMENT_MULTIPLIER)
}

export function playerXpNeeded(level: number) {
  const currentLevel = normalizedLevel(level)
  return scaledRequirement(140 + 85 * (currentLevel - 1) ** 1.55)
}

export function professionXpNeeded(level: number) {
  return scaledRequirement(55 * normalizedLevel(level) ** 1.8)
}

export function craftingXpNeeded(level: number) {
  return scaledRequirement(70 * normalizedLevel(level) ** 1.7)
}
