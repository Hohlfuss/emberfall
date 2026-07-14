export type RaidBossDefinition = {
  id: string
  name: string
  title: string
  icon: string
  description: string
}

export type RaidCombatStats = {
  maxHealth: number
  attack: number
  defense: number
  attackSpeed: number
}

export type RaidEnemyStats = {
  currentHealth: number
  attack: number
  defense: number
  attackSpeed: number
}

export type RaidCombatEvent = {
  at: number
  actor: 'player' | 'boss'
  damage: number
  playerHealth: number
  bossHealth: number
}

export const raidBossDefinitions: RaidBossDefinition[] = [
  { id: 'cinderTitan', name: 'Cinder Titan', title: 'The Walking Furnace', icon: '🔥', description: 'An ancient siege beast whose iron heart burns without fuel.' },
  { id: 'frostHydra', name: 'Frostbound Hydra', title: 'The Sevenfold Winter', icon: '🐲', description: 'Every severed thought returns as another head wreathed in ice.' },
  { id: 'graveColossus', name: 'Grave Colossus', title: 'Keeper of the Fallen', icon: '💀', description: 'A mountain of old armor animated by a thousand restless vows.' },
  { id: 'stormRoc', name: 'Tempest Roc', title: 'Wing Above the Storm', icon: '🦅', description: 'Its wings turn clear skies into a battlefield of thunder.' },
  { id: 'deepmaw', name: 'Deepmaw', title: 'Hunger Below', icon: '🦈', description: 'A plated horror drawn from the blackest trench beneath Emberfall.' },
  { id: 'thornQueen', name: 'The Thorn Queen', title: 'Crown of the Wild', icon: '🌹', description: 'The forest marches wherever her roots find blood-soaked earth.' },
  { id: 'voidReaver', name: 'Void Reaver', title: 'Starless Executioner', icon: '🌑', description: 'A silent knight carrying a blade cut from the space between stars.' },
  { id: 'goldenWyrm', name: 'The Golden Wyrm', title: 'Hoard of Ages', icon: '🐉', description: 'It has slept beneath the realm treasury long enough to call every coin its own.' },
]

export function utcWeekKey(now = Date.now()): string {
  const date = new Date(now)
  date.setUTCHours(0, 0, 0, 0)
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - daysSinceMonday)
  return date.toISOString().slice(0, 10)
}

export function weeklyRaidDefinition(weekKey: string): RaidBossDefinition {
  const weekNumber = Math.floor(Date.parse(`${weekKey}T00:00:00.000Z`) / (7 * 86_400_000))
  return raidBossDefinitions[((weekNumber % raidBossDefinitions.length) + raidBossDefinitions.length) % raidBossDefinitions.length]!
}

export function weeklyRaidStats(completedRaids: number) {
  const victories = Math.max(0, Math.floor(completedRaids))
  const difficulty = victories + 1
  return {
    difficulty,
    maxHealth: Math.round(1_200 * 1.35 ** victories),
    attack: 30 + difficulty * 12,
    defense: 1 + Math.floor(difficulty / 2),
    attackSpeed: Math.max(900, 2_200 - difficulty * 40),
    goldReward: 100 + difficulty * 25,
    xpReward: 50 + difficulty * 15,
    clanXpReward: 100 + difficulty * 50,
  }
}

export function simulateRaidAttempt(player: RaidCombatStats, boss: RaidEnemyStats) {
  let playerHealth = Math.max(1, Math.floor(player.maxHealth))
  let damage = 0
  let nextPlayerAttack = Math.max(1, Math.floor(player.attackSpeed))
  let nextBossAttack = Math.max(1, Math.floor(boss.attackSpeed))
  const playerDamage = Math.max(1, Math.floor(player.attack) - Math.floor(boss.defense))
  // Raid bosses hit harder and punch through half of defense, without dealing
  // damage as a fixed percentage of the player's maximum health.
  const bossDamage = Math.max(1, Math.floor(boss.attack * 1.5) - Math.floor(player.defense * .5))
  const targetHealth = Math.max(1, Math.floor(boss.currentHealth))
  const timeline: RaidCombatEvent[] = []
  let attacks = 0

  while (playerHealth > 0 && damage < targetHealth && attacks++ < 100_000) {
    if (nextPlayerAttack <= nextBossAttack) {
      const applied = Math.min(playerDamage, targetHealth - damage)
      damage += applied
      timeline.push({ at: nextPlayerAttack, actor: 'player', damage: applied, playerHealth: Math.max(0, playerHealth), bossHealth: Math.max(0, targetHealth - damage) })
      nextPlayerAttack += Math.max(1, Math.floor(player.attackSpeed))
    } else {
      const applied = Math.min(bossDamage, playerHealth)
      playerHealth -= applied
      timeline.push({ at: nextBossAttack, actor: 'boss', damage: applied, playerHealth: Math.max(0, playerHealth), bossHealth: Math.max(0, targetHealth - damage) })
      nextBossAttack += Math.max(1, Math.floor(boss.attackSpeed))
    }
  }

  return {
    damage,
    survived: damage >= targetHealth,
    playerHealth: Math.max(0, playerHealth),
    attacks: Math.max(0, attacks - 1),
    duration: timeline.at(-1)?.at || 0,
    timeline,
  }
}
