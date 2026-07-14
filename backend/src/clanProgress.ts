export const MAX_CLAN_LEVEL = 100

export function clanXpNeeded(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  return Math.round(200 * safeLevel ** 1.35)
}

export function clanProgress(totalXp: number) {
  const safeTotal = Math.max(0, Math.floor(totalXp))
  let level = 1
  let spentXp = 0
  while (level < MAX_CLAN_LEVEL) {
    const needed = clanXpNeeded(level)
    if (safeTotal - spentXp < needed) break
    spentXp += needed
    level++
  }
  return {
    level,
    xp: safeTotal - spentXp,
    xpNeeded: level >= MAX_CLAN_LEVEL ? 0 : clanXpNeeded(level),
    totalXp: safeTotal,
  }
}

export function utcDate(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

export function dailyMaterialIndex(clanId: string, date: string, materialCount: number): number {
  if (materialCount < 1) throw new Error('At least one contribution material is required.')
  let hash = 2166136261
  const seed = `${clanId}:${date}:emberfall-clan-material-v1`
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % materialCount
}

export function clanContributionMaterialPool<T extends { skill: string }>(resources: readonly T[]): T[] {
  return resources.filter(resource => resource.skill === 'woodcutting' || resource.skill === 'mining')
}

export function contributionValue(quantity: number, tier: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Contribution quantity must be a positive whole number.')
  if (!Number.isInteger(tier) || tier < 1) throw new Error('Contribution tier must be a positive whole number.')
  return quantity * tier
}
