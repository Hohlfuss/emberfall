export const AUTO_EAT_HEALTH_THRESHOLD = .5
export const AUTO_EAT_COOLDOWN_MS = 2_000

export function upgradedFoodHealing(baseHealing: number, healingPowerRank: number) {
  const base = Math.max(0, Number.isFinite(baseHealing) ? baseHealing : 0)
  const rank = Math.max(0, Number.isFinite(healingPowerRank) ? Math.floor(healingPowerRank) : 0)
  return Math.max(1, Math.round(base * (1 + rank * .1)))
}

export function deathGoldPenalty(currentGold: number) {
  const gold = Math.max(0, Number.isFinite(currentGold) ? Math.floor(currentGold) : 0)
  return Math.floor(gold * .1)
}

export function autoEatReady(options: {
  enabled: boolean
  unlocked: boolean
  health: number
  maxHealth: number
  itemCount: number
  nextAutoEatAt: number
  now: number
}) {
  return options.enabled
    && options.unlocked
    && options.health > 0
    && options.health <= options.maxHealth * AUTO_EAT_HEALTH_THRESHOLD
    && options.itemCount > 0
    && options.now >= options.nextAutoEatAt
}
