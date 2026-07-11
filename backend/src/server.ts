import express from 'express'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import {
  allResources, gearCatalog, recipes as recipeData, rocks, slotLabels, woods,
  type Bonuses, type GearSlot, type Recipe, type Resource, type Skill,
} from '../../frontend/src/gameData.ts'
import { supabase } from "../supabase.ts";

const app = express()
const port = Number(process.env.PORT) || 3000
app.use(express.json())
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  next()
})

type Profession = { level: number; xp: number }
type Enemy = { name: string; archetype: string; health: number; maxHealth: number; attack: number; defense: number; attackSpeed: number; xp: number; gold: number }
type ShopUpgrade = 'medic' | 'scouting' | 'training' | 'fortitude'
type EventKind = 'achievement' | 'critical'
type GameEvent = { id: number; kind: EventKind; title: string; detail: string }
type AchievementKind = 'level' | 'kills' | 'deaths' | 'tier' | 'gathered' | 'crafted' | 'workers' | 'woodLevel' | 'mineLevel' | 'gear'
type AchievementDefinition = { id: string; name: string; description: string; kind: AchievementKind; goal: number; reward: number; icon: string }
type GatherJob = { resourceId: string; startedAt: number; endsAt: number; critical: boolean; duration: number }
type CraftJob = { recipeId: string; startedAt: number; endsAt: number; duration: number }
type TimedState = { startedAt: number; endsAt: number }

type Game = {
  id: string
  revision: number
  lastAdvancedAt: number
  name: string
  gold: number
  level: number
  xp: number
  message: string
  player: { health: number; baseMaxHealth: number; baseAttack: number; baseDefense: number; baseAttackSpeed: number; baseRecoveryTime: number; baseEnemyLoadTime: number; basePassiveRegen: number; regenBuffer: number }
  inventory: Record<string, number>
  ownedGear: string[]
  equipment: Record<GearSlot, string | undefined>
  professions: Record<Skill, Profession>
  resourceMastery: Record<string, number>
  jobs: Partial<Record<Skill, GatherJob>>
  workerAssignments: Record<string, number>
  workerProgress: Record<string, number>
  workers: number
  shopUpgrades: Record<ShopUpgrade, number>
  lifetime: { kills: number; deaths: number; gathered: number; crafted: number }
  unlockedAchievements: Set<string>
  enemyTier: number
  highestEnemyTier: number
  enemy: Enemy
  battleActive: boolean
  nextPlayerAttackAt: number
  nextEnemyAttackAt: number
  recovery: TimedState | null
  enemyLoad: TimedState | null
  crafting: CraftJob | null
  events: GameEvent[]
  nextEventId: number
}

type Action =
  | { type: 'startBattle' }
  | { type: 'retreat' }
  | { type: 'setEnemyTier'; tier: number }
  | { type: 'gather'; resourceId: string }
  | { type: 'craft'; recipeId: string }
  | { type: 'assignWorker'; resourceId: string; change: number }
  | { type: 'buyWorker' }
  | { type: 'buyUpgrade'; upgradeId: ShopUpgrade }
  | { type: 'buyGear'; gearId: string }
  | { type: 'equipGear'; gearId: string }

const storePaths = [
  { id: 'hatchets', name: 'Hatchets', icon: '🪓', items: ['pineHatchet', 'oakHatchet', 'yewHatchet'], prices: [175, 1800, 16000] },
  { id: 'pickaxes', name: 'Pickaxes', icon: '⛏️', items: ['copperPickaxe', 'ironPickaxe', 'mythrilPickaxe'], prices: [200, 2000, 32000] },
  { id: 'weapons', name: 'Weapons', icon: '⚔️', items: ['bronzeSword', 'ironSword', 'silverSaber'], prices: [250, 2400, 18000] },
  { id: 'helmets', name: 'Helmets', icon: '🪖', items: ['copperHelm', 'ironHelm', 'obsidianHelm'], prices: [275, 2600, 20000] },
  { id: 'chestArmor', name: 'Chest armor', icon: '🥋', items: ['copperChest', 'ironChest', 'obsidianChest'], prices: [400, 3600, 28000] },
  { id: 'legArmor', name: 'Leg armor', icon: '🦿', items: ['ironLegs', 'goldGreaves'], prices: [3200, 22000] },
  { id: 'boots', name: 'Boots', icon: '🥾', items: ['trailBoots'], prices: [900] },
  { id: 'gloves', name: 'Gloves', icon: '🧤', items: ['loggerGloves'], prices: [2800] },
  { id: 'rings', name: 'Rings', icon: '💍', items: ['scoutToken', 'silverRing'], prices: [1000, 12000] },
  { id: 'amulets', name: 'Amulets', icon: '📿', items: ['campCharm', 'moonAmulet'], prices: [750, 30000] },
]

const shopUpgradeDetails: Array<{ id: ShopUpgrade; name: string; description: string; icon: string; baseCost: number; max: number }> = [
  { id: 'medic', name: 'Field Medic', description: '-0.5s death recovery per rank.', icon: '⚕️', baseCost: 180, max: 10 },
  { id: 'scouting', name: 'Arena Logistics', description: '-0.1s next-enemy loading time per rank.', icon: '⏳', baseCost: 220, max: 10 },
  { id: 'training', name: 'Combat Training', description: '+1 attack per rank.', icon: '🎯', baseCost: 275, max: 10 },
  { id: 'fortitude', name: 'Fortitude Lessons', description: '+5 maximum health per rank.', icon: '❤️', baseCost: 240, max: 10 },
]

const achievementDefinitions: AchievementDefinition[] = [
  { id: 'firstBlood', name: 'First Blood', description: 'Defeat your first monster.', kind: 'kills', goal: 1, reward: 25, icon: '⚔️' },
  { id: 'tenKills', name: 'Monster Hunter', description: 'Defeat 10 monsters.', kind: 'kills', goal: 10, reward: 100, icon: '🐺' },
  { id: 'hardLesson', name: 'A Hard Lesson', description: 'Recover from your first defeat.', kind: 'deaths', goal: 1, reward: 20, icon: '💀' },
  { id: 'levelFive', name: 'Seasoned', description: 'Reach player level 5.', kind: 'level', goal: 5, reward: 125, icon: '⭐' },
  { id: 'tierThree', name: 'Danger Seeker', description: 'Unlock enemy tier 3.', kind: 'tier', goal: 3, reward: 80, icon: '🔥' },
  { id: 'tierTen', name: 'Into the Abyss', description: 'Unlock enemy tier 10.', kind: 'tier', goal: 10, reward: 500, icon: '🌑' },
  { id: 'gatherFifty', name: 'Calloused Hands', description: 'Gather 50 materials.', kind: 'gathered', goal: 50, reward: 60, icon: '🪵' },
  { id: 'gatherThousand', name: 'Master Harvester', description: 'Gather 1,000 materials.', kind: 'gathered', goal: 1000, reward: 600, icon: '⛏️' },
  { id: 'firstCraft', name: 'Spark of Industry', description: 'Complete your first recipe.', kind: 'crafted', goal: 1, reward: 35, icon: '🔨' },
  { id: 'forgeTen', name: 'Forge Regular', description: 'Complete 10 recipes.', kind: 'crafted', goal: 10, reward: 150, icon: '🔥' },
  { id: 'crew', name: 'A Small Crew', description: 'Own 3 workers.', kind: 'workers', goal: 3, reward: 250, icon: '♟️' },
  { id: 'lumberFive', name: 'Forest Adept', description: 'Reach woodcutting level 5.', kind: 'woodLevel', goal: 5, reward: 100, icon: '🌲' },
  { id: 'mineFive', name: 'Deep Delver', description: 'Reach mining level 5.', kind: 'mineLevel', goal: 5, reward: 100, icon: '💎' },
  { id: 'gearFive', name: 'Well Equipped', description: 'Own 5 crafted or starter items.', kind: 'gear', goal: 5, reward: 100, icon: '🛡️' },
]

const enemyArchetypes = [
  { name: 'Balanced', health: 1, attack: 1, defense: 0, interval: 1, reward: 1 },
  { name: 'Brute', health: 1.22, attack: 1.15, defense: 0, interval: 1.22, reward: 1.2 },
  { name: 'Swift', health: .78, attack: .85, defense: 0, interval: .72, reward: 1.1 },
  { name: 'Guarded', health: 1.05, attack: .95, defense: 2, interval: 1.08, reward: 1.15 },
]
const enemyNames = ['Moss Rat', 'Cave Slime', 'Feral Imp', 'Dust Goblin', 'Wild Wolf', 'Stone Drake', 'Void Wraith']
const games = new Map<string, Game>()

const tokens = new Map<
  string,
  {
    username: string
    gameId: string
  }
>()

const gameOwners = new Map<string, string>()

type StoredGame = Omit<Game, 'unlockedAchievements'> & {
  unlockedAchievements: string[]
}

function serializeGame(game: Game): StoredGame {
  return {
    ...game,
    unlockedAchievements: [...game.unlockedAchievements],
  }
}

function deserializeGame(value: unknown): Game {
  const stored = value as StoredGame

  return {
    ...stored,
    unlockedAchievements: new Set(stored.unlockedAchievements ?? []),
  }
}

async function saveGame(
  username: string,
  game: Game,
): Promise<void> {
  const { error } = await supabase
    .from('players')
    .update({
      game_state: serializeGame(game),
      updated_at: new Date().toISOString(),
    })
    .eq('username', username)

  if (error) {
    throw new Error(`Could not save game: ${error.message}`)
  }
}

function xpNeeded(game: Game) { return 100 + (game.level - 1) * 60 }
function professionXpNeeded(game: Game, skill: Skill) { return Math.round(15 * game.professions[skill].level ** 1.5) }

function totalBonuses(game: Game): Bonuses {
  const result: Record<string, number> = {}
  Object.values(game.equipment).forEach(id => {
    const gear = id ? gearCatalog[id] : undefined
    if (!gear) return
    Object.entries(gear.bonuses).forEach(([stat, value]) => result[stat] = (result[stat] || 0) + value)
  })
  return result
}

function combatStats(game: Game) {
  const bonuses = totalBonuses(game)
  return {
    maxHealth: game.player.baseMaxHealth + (bonuses.maxHealth || 0) + game.shopUpgrades.fortitude * 5,
    attack: game.player.baseAttack + (bonuses.attack || 0) + game.shopUpgrades.training,
    defense: game.player.baseDefense + (bonuses.defense || 0),
    attackSpeed: Math.max(600, game.player.baseAttackSpeed - (bonuses.attackSpeed || 0)),
    recoveryTime: Math.max(3000, game.player.baseRecoveryTime - (bonuses.recoverySpeed || 0) - game.shopUpgrades.medic * 500),
    enemyLoadTime: Math.max(500, game.player.baseEnemyLoadTime - (bonuses.encounterSpeed || 0) - game.shopUpgrades.scouting * 100),
    passiveRegen: game.player.basePassiveRegen,
  }
}

function professionStats(game: Game, skill: Skill) {
  const profession = game.professions[skill]
  const bonuses = totalBonuses(game)
  const prefix = skill === 'woodcutting' ? 'wood' : 'mining'
  return {
    speed: Math.min(400, (profession.level - 1) * 2 + (bonuses[`${prefix}Speed` as keyof Bonuses] || 0)),
    yield: 1 + Math.floor((profession.level - 1) / 5) + (bonuses[`${prefix}Yield` as keyof Bonuses] || 0),
    critChance: Math.min(60, 5 + (profession.level - 1) * .75 + (bonuses[`${prefix}Crit` as keyof Bonuses] || 0)),
    critPower: 2 + (bonuses.critPower || 0),
    fortune: Math.min(35, 2 + Math.floor(profession.level / 3) + (bonuses.fortune || 0)),
    precision: Math.min(30, 3 + (profession.level - 1) * .5),
    xpBonus: (profession.level - 1) * 2,
  }
}

function effectiveDuration(game: Game, resource: Resource, critical = false) {
  const stats = professionStats(game, resource.skill)
  const masterySpeed = Math.floor((game.resourceMastery[resource.id] || 0) / 10)
  return Math.max(.75, resource.duration / (1 + (stats.speed + masterySpeed) / 100) / (critical ? stats.critPower : 1))
}

function pushEvent(game: Game, kind: EventKind, title: string, detail: string) {
  game.events.push({ id: game.nextEventId++, kind, title, detail })
  if (game.events.length > 50) game.events.splice(0, game.events.length - 50)
}

function achievementProgress(game: Game, achievement: AchievementDefinition) {
  const values: Record<AchievementKind, number> = {
    level: game.level, kills: game.lifetime.kills, deaths: game.lifetime.deaths, tier: game.highestEnemyTier,
    gathered: game.lifetime.gathered, crafted: game.lifetime.crafted, workers: game.workers,
    woodLevel: game.professions.woodcutting.level, mineLevel: game.professions.mining.level, gear: game.ownedGear.length,
  }
  return Math.min(achievement.goal, values[achievement.kind])
}

function checkAchievements(game: Game) {
  achievementDefinitions.forEach(achievement => {
    if (!game.unlockedAchievements.has(achievement.id) && achievementProgress(game, achievement) >= achievement.goal) {
      game.unlockedAchievements.add(achievement.id)
      game.gold += achievement.reward
      game.message = `Achievement unlocked: ${achievement.name}! +${achievement.reward} gold.`
      pushEvent(game, 'achievement', achievement.name, `Achievement unlocked · +${achievement.reward} gold`)
    }
  })
}

function rollEnemy(game: Game) {
  const power = game.enemyTier - 1
  const variance = () => .9 + Math.random() * .2
  const archetype = enemyArchetypes[Math.floor(Math.random() * enemyArchetypes.length)] ?? enemyArchetypes[0]!
  const baseName = enemyNames[Math.min(enemyNames.length - 1, Math.floor(power / 3))] ?? enemyNames[0]!
  game.enemy.archetype = archetype.name
  game.enemy.name = game.enemyTier >= 15 ? `Ancient ${baseName}` : game.enemyTier >= 7 ? `Dire ${baseName}` : baseName
  game.enemy.maxHealth = Math.round(90 * 1.18 ** power * variance() * archetype.health)
  game.enemy.health = game.enemy.maxHealth
  game.enemy.attack = Math.max(1, Math.round(16 * 1.08 ** power * variance() * archetype.attack))
  game.enemy.defense = Math.floor(power * .9 + Math.random() * 2) + archetype.defense
  game.enemy.attackSpeed = Math.max(1200, Math.min(3400, Math.round((2150 + Math.random() * 300) * archetype.interval / (1 + power * .015))))
  game.enemy.xp = Math.round(45 * 1.25 ** power * variance() * archetype.reward)
  game.enemy.gold = Math.round(22 * 1.28 ** power * variance() * archetype.reward)
}

function startEnemyLoad(game: Game, now: number, status: string) {
  const duration = combatStats(game).enemyLoadTime
  game.enemyLoad = { startedAt: now, endsAt: now + duration }
  game.message = status
}

function stopBattle(game: Game) {
  game.battleActive = false
  game.nextPlayerAttackAt = 0
  game.nextEnemyAttackAt = 0
}

function gainXp(game: Game, amount: number) {
  game.xp += amount
  while (game.xp >= xpNeeded(game)) {
    game.xp -= xpNeeded(game)
    game.level++
    game.player.baseMaxHealth += 10
    game.player.baseAttack += 2
    game.player.baseDefense += 1
    game.player.health = combatStats(game).maxHealth
    if (game.level === 2 || game.level === 10) {
      game.workers++
      game.message = `Level ${game.level}! A gatherer joined you as a level reward.`
    } else game.message = `Level up! ${game.name} reached level ${game.level}.`
  }
  checkAchievements(game)
}

function giveResource(game: Game, resource: Resource, amount: number, allowRare = false) {
  game.inventory[resource.item] = (game.inventory[resource.item] || 0) + amount
  game.lifetime.gathered += amount
  game.resourceMastery[resource.id] = (game.resourceMastery[resource.id] || 0) + amount
  const stats = professionStats(game, resource.skill)
  if (allowRare && Math.random() * 100 < Math.min(35, stats.fortune / 2 + resource.tier)) {
    const rare = resource.skill === 'woodcutting' ? 'Ancient Resin' : resource.family === 'ore' ? 'Ore Crystal' : 'Rough Gem'
    game.inventory[rare] = (game.inventory[rare] || 0) + 1
    game.message = `Rare find: ${rare}!`
  }
  const gainedXp = Math.ceil((4 + resource.tier * 4) * amount * (1 + stats.xpBonus / 100))
  game.professions[resource.skill].xp += gainedXp
  while (game.professions[resource.skill].xp >= professionXpNeeded(game, resource.skill) && game.professions[resource.skill].level < 50) {
    game.professions[resource.skill].xp -= professionXpNeeded(game, resource.skill)
    game.professions[resource.skill].level++
    game.message = `${resource.skill === 'woodcutting' ? 'Woodcutting' : 'Mining'} reached level ${game.professions[resource.skill].level}!`
  }
  checkAchievements(game)
}

function nextGearIds(game: Game) {
  return storePaths.map(path => path.items.find(id => !game.ownedGear.includes(id))).filter((id): id is string => Boolean(id))
}

function shopUpgradeCost(game: Game, upgrade: typeof shopUpgradeDetails[number]) {
  return Math.round(upgrade.baseCost * 1.75 ** game.shopUpgrades[upgrade.id])
}

function workerPrice(game: Game) { return Math.round(500 * 2.5 ** game.workers) }

function completeGather(game: Game, skill: Skill) {
  const job = game.jobs[skill]
  if (!job) return
  const resource = allResources.find(candidate => candidate.id === job.resourceId)
  delete game.jobs[skill]
  if (!resource) return
  const stats = professionStats(game, skill)
  let amount = stats.yield
  if (job.critical) amount = Math.max(amount + 1, Math.round(amount * stats.critPower))
  const precise = Math.random() * 100 < stats.precision
  if (precise) amount++
  const fortunate = Math.random() * 100 < stats.fortune
  if (fortunate) amount *= 2
  giveResource(game, resource, amount, true)
  const effects = [job.critical && 'critical', precise && 'precision', fortunate && 'fortune'].filter(Boolean).join(' + ')
  game.message = `Gathered ${amount} × ${resource.item}${effects ? ` (${effects})` : ''}.`
}

function completeCraft(game: Game) {
  const craft = game.crafting
  game.crafting = null
  if (!craft) return
  const recipe = recipeData.find(candidate => candidate.id === craft.recipeId)
  if (!recipe) return
  if (recipe.outputItem) game.inventory[recipe.outputItem] = (game.inventory[recipe.outputItem] || 0) + (recipe.outputQty || 1)
  if (recipe.outputGear && !game.ownedGear.includes(recipe.outputGear)) game.ownedGear.push(recipe.outputGear)
  game.lifetime.crafted++
  game.message = `${recipe.name} completed and added to your inventory.`
  checkAchievements(game)
}

function finishVictory(game: Game, now: number) {
  const rewardXp = game.enemy.xp
  const rewardGold = game.enemy.gold
  game.gold += rewardGold
  game.lifetime.kills++
  if (game.enemyTier === game.highestEnemyTier && game.highestEnemyTier < 25) game.highestEnemyTier++
  stopBattle(game)
  gainXp(game, rewardXp)
  checkAchievements(game)
  startEnemyLoad(game, now, `Tier ${game.enemyTier} victory! +${rewardXp} XP and +${rewardGold} gold. Loading next enemy...`)
}

function beginRecovery(game: Game, now: number) {
  stopBattle(game)
  game.lifetime.deaths++
  game.player.health = 0
  const duration = combatStats(game).recoveryTime
  game.recovery = { startedAt: now, endsAt: now + duration }
  startEnemyLoad(game, now, 'Defeated. Recovering while the next enemy loads.')
}

function advanceCombat(game: Game, now: number) {
  let steps = 0
  while (game.battleActive && steps++ < 500) {
    const nextAttack = Math.min(game.nextPlayerAttackAt, game.nextEnemyAttackAt)
    if (nextAttack > now) break
    if (game.nextPlayerAttackAt <= game.nextEnemyAttackAt) {
      const stats = combatStats(game)
      game.enemy.health -= Math.max(1, stats.attack - game.enemy.defense)
      game.nextPlayerAttackAt += stats.attackSpeed
      if (game.enemy.health <= 0) finishVictory(game, nextAttack)
    } else {
      const stats = combatStats(game)
      game.player.health -= Math.max(1, game.enemy.attack - stats.defense)
      game.nextEnemyAttackAt += game.enemy.attackSpeed
      if (game.player.health <= 0) beginRecovery(game, nextAttack)
    }
  }
}

function advanceGame(game: Game, now = Date.now()) {
  const elapsed = Math.max(0, now - game.lastAdvancedAt)
  game.lastAdvancedAt = now

  if (game.enemyLoad && now >= game.enemyLoad.endsAt) {
    game.enemyLoad = null
    rollEnemy(game)
    game.message = game.recovery ? `${game.enemy.name} is ready. ${game.name} is still recovering.` : `Tier ${game.enemyTier} ${game.enemy.name} is ready to fight.`
  }

  if (game.recovery) {
    const duration = game.recovery.endsAt - game.recovery.startedAt
    const progress = Math.min(1, (now - game.recovery.startedAt) / duration)
    game.player.health = Math.round(combatStats(game).maxHealth * progress)
    if (now >= game.recovery.endsAt) {
      game.recovery = null
      game.player.health = combatStats(game).maxHealth
      game.message = `${game.name} has fully recovered and can fight again.`
      checkAchievements(game)
    }
  } else if (game.player.health < combatStats(game).maxHealth) {
    game.player.regenBuffer += elapsed / 1000 * combatStats(game).passiveRegen
    const healing = Math.floor(game.player.regenBuffer)
    if (healing > 0) {
      game.player.regenBuffer -= healing
      game.player.health = Math.min(combatStats(game).maxHealth, game.player.health + healing)
    }
  } else game.player.regenBuffer = 0

  ;(['woodcutting', 'mining'] as Skill[]).forEach(skill => {
    if (game.jobs[skill] && now >= game.jobs[skill]!.endsAt) completeGather(game, skill)
  })
  if (game.crafting && now >= game.crafting.endsAt) completeCraft(game)

  allResources.forEach(resource => {
    const count = game.workerAssignments[resource.id] || 0
    if (!count || game.professions[resource.skill].level < resource.tier) return
    game.workerProgress[resource.id] = (game.workerProgress[resource.id] || 0) + elapsed / (effectiveDuration(game, resource) * 1000) * 100 * .2 * count
    const completions = Math.floor(game.workerProgress[resource.id] / 100)
    if (completions > 0) {
      game.workerProgress[resource.id] %= 100
      giveResource(game, resource, completions * professionStats(game, resource.skill).yield)
    }
  })

  advanceCombat(game, now)
  game.revision++
}

function createGame(name: string): Game {
  const now = Date.now()
  const game: Game = {
    id: randomUUID(), revision: 0, lastAdvancedAt: now, name, gold: 0, level: 1, xp: 0,
    message: `Welcome, ${name}. Your adventure begins.`,
    player: { health: 100, baseMaxHealth: 100, baseAttack: 10, baseDefense: 3, baseAttackSpeed: 1800, baseRecoveryTime: 10000, baseEnemyLoadTime: 2000, basePassiveRegen: .2, regenBuffer: 0 },
    inventory: {}, ownedGear: ['rustySword', 'wornHatchet', 'crackedPickaxe'],
    equipment: { weapon: 'rustySword', helmet: undefined, chest: undefined, legs: undefined, boots: undefined, gloves: undefined, ring: undefined, amulet: undefined, pickaxe: 'crackedPickaxe', hatchet: 'wornHatchet' },
    professions: { woodcutting: { level: 1, xp: 0 }, mining: { level: 1, xp: 0 } }, resourceMastery: {}, jobs: {},
    workerAssignments: {}, workerProgress: {}, workers: 0, shopUpgrades: { medic: 0, scouting: 0, training: 0, fortitude: 0 },
    lifetime: { kills: 0, deaths: 0, gathered: 0, crafted: 0 }, unlockedAchievements: new Set(),
    enemyTier: 1, highestEnemyTier: 1, enemy: { name: 'Loading...', archetype: '', health: 0, maxHealth: 1, attack: 0, defense: 0, attackSpeed: 0, xp: 0, gold: 0 },
    battleActive: false, nextPlayerAttackAt: 0, nextEnemyAttackAt: 0, recovery: null, enemyLoad: null, crafting: null,
    events: [], nextEventId: 1,
  }
  startEnemyLoad(game, now, 'Loading your first enemy...')
  games.set(game.id, game)
  return game
}

function reject(message: string): never { throw new Error(message) }

function performAction(game: Game, action: Action, now: number) {
  advanceGame(game, now)
  switch (action.type) {
    case 'startBattle': {
      if (game.recovery) reject('The player is still recovering.')
      if (game.enemyLoad) reject('The next enemy is still loading.')
      if (game.battleActive) reject('Battle has already started.')
      const stats = combatStats(game)
      game.player.health = Math.min(Math.max(1, game.player.health), stats.maxHealth)
      game.battleActive = true
      game.nextPlayerAttackAt = now + stats.attackSpeed
      game.nextEnemyAttackAt = now + game.enemy.attackSpeed
      game.message = `Battle started against tier ${game.enemyTier} ${game.enemy.name}.`
      break
    }
    case 'retreat':
      if (!game.battleActive) reject('There is no battle to retreat from.')
      stopBattle(game)
      startEnemyLoad(game, now, 'You retreated. Loading a new enemy...')
      break
    case 'setEnemyTier':
      if (!Number.isInteger(action.tier) || action.tier < 1 || action.tier > game.highestEnemyTier) reject('That enemy tier is not unlocked.')
      stopBattle(game)
      game.enemyTier = action.tier
      startEnemyLoad(game, now, `Loading a tier ${action.tier} enemy...`)
      break
    case 'gather': {
      const resource = allResources.find(candidate => candidate.id === action.resourceId)
      if (!resource) reject('Unknown resource.')
      if (game.professions[resource.skill].level < resource.tier) reject('That resource is locked.')
      if (game.jobs[resource.skill]) reject(`A ${resource.skill} action is already running.`)
      const stats = professionStats(game, resource.skill)
      const critical = Math.random() * 100 < stats.critChance
      const duration = effectiveDuration(game, resource, critical)
      game.jobs[resource.skill] = { resourceId: resource.id, startedAt: now, endsAt: now + duration * 1000, critical, duration }
      if (critical) {
        game.message = `Critical ${resource.skill} action! ${stats.critPower.toFixed(2)}× faster and stronger.`
        pushEvent(game, 'critical', 'Critical action!', `${resource.name} · ${stats.critPower.toFixed(2)}× speed and yield`)
      } else game.message = `${resource.skill === 'woodcutting' ? 'Chopping' : 'Mining'} ${resource.name}...`
      break
    }
    case 'craft': {
      const recipe = recipeData.find(candidate => candidate.id === action.recipeId)
      if (!recipe) reject('Unknown recipe.')
      if (game.crafting) reject('Another recipe is already being crafted.')
      if (recipe.outputGear && !nextGearIds(game).includes(recipe.outputGear)) reject('That is not the next equipment tier.')
      if (recipe.outputGear && game.ownedGear.includes(recipe.outputGear)) reject('That equipment is already owned.')
      if (!Object.entries(recipe.costs).every(([item, cost]) => (game.inventory[item] || 0) >= cost)) reject('Not enough materials.')
      Object.entries(recipe.costs).forEach(([item, cost]) => game.inventory[item] -= cost)
      game.crafting = { recipeId: recipe.id, startedAt: now, endsAt: now + recipe.duration * 1000, duration: recipe.duration }
      game.message = `Crafting ${recipe.name}...`
      break
    }
    case 'assignWorker': {
      const resource = allResources.find(candidate => candidate.id === action.resourceId)
      if (!resource) reject('Unknown resource.')
      if (game.professions[resource.skill].level < resource.tier) reject('That resource is locked.')
      if (!Number.isInteger(action.change) || Math.abs(action.change) !== 1) reject('Worker change must be +1 or -1.')
      const assigned = Object.values(game.workerAssignments).reduce((sum, count) => sum + count, 0)
      if (action.change > 0 && assigned >= game.workers) reject('No free workers.')
      game.workerAssignments[resource.id] = Math.max(0, (game.workerAssignments[resource.id] || 0) + action.change)
      break
    }
    case 'buyWorker': {
      const price = workerPrice(game)
      if (game.gold < price) reject('Not enough gold.')
      game.gold -= price
      game.workers++
      game.message = 'A new worker joined your settlement.'
      checkAchievements(game)
      break
    }
    case 'buyUpgrade': {
      const upgrade = shopUpgradeDetails.find(candidate => candidate.id === action.upgradeId)
      if (!upgrade) reject('Unknown shop upgrade.')
      if (game.shopUpgrades[upgrade.id] >= upgrade.max) reject('That upgrade is already maxed.')
      const price = shopUpgradeCost(game, upgrade)
      if (game.gold < price) reject('Not enough gold.')
      game.gold -= price
      game.shopUpgrades[upgrade.id]++
      if (upgrade.id === 'fortitude') game.player.health = Math.min(combatStats(game).maxHealth, game.player.health + 5)
      game.message = `${upgrade.name} improved to rank ${game.shopUpgrades[upgrade.id]}.`
      break
    }
    case 'buyGear': {
      if (game.crafting) reject('Finish the active craft before buying equipment.')
      const path = storePaths.find(candidate => candidate.items.includes(action.gearId))
      if (!path) reject('That equipment is not sold here.')
      const index = path.items.findIndex(id => !game.ownedGear.includes(id))
      if (index < 0 || path.items[index] !== action.gearId) reject('That is not the next equipment tier.')
      const price = path.prices[index]!
      if (game.gold < price) reject('Not enough gold.')
      game.gold -= price
      game.ownedGear.push(action.gearId)
      equip(game, action.gearId, now)
      game.message = `${gearCatalog[action.gearId]!.name} purchased and equipped. ${path.name} stock advanced.`
      checkAchievements(game)
      break
    }
    case 'equipGear':
      if (!game.ownedGear.includes(action.gearId)) reject('That equipment is not owned.')
      equip(game, action.gearId, now)
      checkAchievements(game)
      break
    default:
      reject('Unknown action.')
  }
  game.revision++
}

function equip(game: Game, gearId: string, now: number) {
  const gear = gearCatalog[gearId]
  if (!gear) reject('Unknown equipment.')
  const oldMax = combatStats(game).maxHealth
  const interrupted = game.battleActive || Boolean(game.enemyLoad)
  if (game.battleActive) stopBattle(game)
  game.enemyLoad = null
  game.equipment[gear.slot] = gearId
  game.player.health = Math.min(combatStats(game).maxHealth, Math.max(1, game.player.health + combatStats(game).maxHealth - oldMax))
  if (interrupted) startEnemyLoad(game, now, `${gear.name} equipped. Loading a fresh enemy...`)
  else game.message = `${gear.name} equipped.`
}

function publicState(game: Game, now = Date.now()) {
  advanceGame(game, now)
  const stats = combatStats(game)
  const assignedWorkers = Object.values(game.workerAssignments).reduce((sum, count) => sum + count, 0)
  const jobs = Object.fromEntries(Object.entries(game.jobs).map(([skill, job]) => [skill, job ? {
    id: job.resourceId, critical: job.critical, duration: job.duration,
    progress: Math.min(100, Math.max(0, (now - job.startedAt) / (job.endsAt - job.startedAt) * 100)),
  } : undefined]))
  const crafting = game.crafting ? {
    id: game.crafting.recipeId,
    progress: Math.min(100, Math.max(0, (now - game.crafting.startedAt) / (game.crafting.endsAt - game.crafting.startedAt) * 100)),
  } : null
  return {
    id: game.id, revision: game.revision, serverNow: now, playerName: game.name, gold: game.gold, level: game.level, xp: game.xp, xpNeeded: xpNeeded(game), message: game.message,
    player: { health: game.player.health }, combatStats: stats,
    enemyTier: game.enemyTier, highestEnemyTier: game.highestEnemyTier, enemy: game.enemy,
    battleStarted: game.battleActive, recovering: Boolean(game.recovery), enemyLoading: Boolean(game.enemyLoad),
    recoveryRemaining: game.recovery ? Math.max(0, game.recovery.endsAt - now) : 0,
    enemyLoadRemaining: game.enemyLoad ? Math.max(0, game.enemyLoad.endsAt - now) : 0,
    professions: {
      woodcutting: { ...game.professions.woodcutting, xpNeeded: professionXpNeeded(game, 'woodcutting') },
      mining: { ...game.professions.mining, xpNeeded: professionXpNeeded(game, 'mining') },
    },
    professionStats: { woodcutting: professionStats(game, 'woodcutting'), mining: professionStats(game, 'mining') },
    effectiveDurations: Object.fromEntries(allResources.map(resource => [resource.id, effectiveDuration(game, resource)])),
    resourceMastery: game.resourceMastery, jobs, inventory: game.inventory,
    workers: game.workers, workerPrice: workerPrice(game), workerAssignments: game.workerAssignments, workerProgress: game.workerProgress,
    assignedWorkers, freeWorkers: game.workers - assignedWorkers,
    equipment: game.equipment, ownedGear: game.ownedGear, shopUpgrades: game.shopUpgrades,
    shopUpgradeCosts: Object.fromEntries(shopUpgradeDetails.map(upgrade => [upgrade.id, shopUpgradeCost(game, upgrade)])),
    crafting, nextGearIds: nextGearIds(game),
    achievements: achievementDefinitions.map(achievement => ({ ...achievement, progress: achievementProgress(game, achievement), unlocked: game.unlockedAchievements.has(achievement.id) })),
    events: game.events,
  }
}

const config = { woods, rocks, allResources, gearCatalog, recipes: recipeData, slotLabels, storePaths, shopUpgradeDetails }

function passwordHash(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString('hex')
}

function issueToken(username: string, gameId: string): string {
  const token = randomBytes(32).toString('hex')

  tokens.set(token, {
    username,
    gameId,
  })

  return token
}

function authorizedGame(
  request: express.Request,
  gameId: string,
): { username: string; game: Game } | undefined {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : ''

  const session = tokens.get(token)

  if (!session || session.gameId !== gameId) {
    return undefined
  }

  const game = games.get(gameId)

  if (!game) {
    return undefined
  }

  return {
    username: session.username,
    game,
  }
}

app.get('/api/health', (_request, response) => response.json({ ok: true, games: games.size }))
app.get('/api/config', (_request, response) => response.json(config))

app.post('/api/auth/register', async (request, response) => {
  try {
    const rawUsername = request.body?.username
    const rawPassword = request.body?.password

    if (
      typeof rawUsername !== 'string' ||
      !/^[a-zA-Z0-9_-]{3,18}$/.test(rawUsername.trim())
    ) {
      return response.status(400).json({
        error:
          'Username must be 3–18 characters using letters, numbers, _ or -.',
      })
    }

    if (
      typeof rawPassword !== 'string' ||
      rawPassword.length < 8
    ) {
      return response.status(400).json({
        error: 'Password must contain at least 8 characters.',
      })
    }

    const username = rawUsername.trim().toLowerCase()
    const name = rawUsername.trim().slice(0, 18)

    const { data: existingPlayer, error: lookupError } =
      await supabase
        .from('players')
        .select('username')
        .eq('username', username)
        .maybeSingle()

    if (lookupError) {
      throw lookupError
    }

    if (existingPlayer) {
      return response.status(409).json({
        error: 'That username is already taken.',
      })
    }

    const salt = randomBytes(16).toString('hex')
    const game = createGame(name)

    const { error: insertError } = await supabase
      .from('players')
      .insert({
        username,
        name,
        salt,
        password_hash: passwordHash(rawPassword, salt),
        game_id: game.id,
        game_state: serializeGame(game),
      })

    if (insertError) {
      games.delete(game.id)

      if (insertError.code === '23505') {
        return response.status(409).json({
          error: 'That username is already taken.',
        })
      }

      throw insertError
    }

    gameOwners.set(game.id, username)

    return response.status(201).json({
      token: issueToken(username, game.id),
      state: publicState(game),
    })
  } catch (error) {
    console.error('Registration error:', error)

    return response.status(500).json({
      error: 'Could not create the account.',
    })
  }
})

app.post('/api/auth/login', async (request, response) => {
  try {
    const rawUsername = request.body?.username
    const rawPassword = request.body?.password

    if (
      typeof rawUsername !== 'string' ||
      typeof rawPassword !== 'string'
    ) {
      return response.status(400).json({
        error: 'Username and password are required.',
      })
    }

    const username = rawUsername.trim().toLowerCase()

    const { data: playerRow, error } = await supabase
      .from('players')
      .select(
        'username, name, salt, password_hash, game_id, game_state',
      )
      .eq('username', username)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!playerRow) {
      return response.status(401).json({
        error: 'Invalid username or password.',
      })
    }

    const suppliedHash = Buffer.from(
      passwordHash(rawPassword, playerRow.salt),
      'hex',
    )

    const storedHash = Buffer.from(
      playerRow.password_hash,
      'hex',
    )

    if (
      suppliedHash.length !== storedHash.length ||
      !timingSafeEqual(suppliedHash, storedHash)
    ) {
      return response.status(401).json({
        error: 'Invalid username or password.',
      })
    }

    const game = deserializeGame(playerRow.game_state)

    game.id = playerRow.game_id
    game.name = playerRow.name

    games.set(game.id, game)
    gameOwners.set(game.id, username)

    return response.json({
      token: issueToken(username, game.id),
      state: publicState(game),
    })
  } catch (error) {
    console.error('Login error:', error)

    return response.status(500).json({
      error: 'Could not log in.',
    })
  }
})

app.get('/api/games/:id', (request, response) => {
  const session = authorizedGame(
    request,
    request.params.id,
  )

  if (!session) {
    return response.status(401).json({
      error: 'Invalid or expired game session.',
    })
  }

  return response.json(publicState(session.game))
})

app.post('/api/games/:id/actions', async (request, response) => {
  const session = authorizedGame(
    request,
    request.params.id,
  )

  if (!session) {
    return response.status(401).json({
      error: 'Invalid or expired game session.',
    })
  }

  try {
    performAction(
      session.game,
      request.body as Action,
      Date.now(),
    )
  } catch (error) {
    return response.status(409).json({
      error:
        error instanceof Error
          ? error.message
          : 'Action failed.',
    })
  }

  const state = publicState(session.game)

  try {
    await saveGame(session.username, session.game)
  } catch (error) {
    console.error('Game save error:', error)

    return response.status(500).json({
      error: 'The action worked, but the game could not be saved.',
    })
  }

  return response.json(state)
})

const tick = setInterval(() => {
  const now = Date.now()
  games.forEach(game => advanceGame(game, now))
}, 100)

const autosave = setInterval(() => {
  for (const [gameId, username] of gameOwners) {
    const game = games.get(gameId)

    if (!game) {
      continue
    }

    void saveGame(username, game).catch(error => {
      console.error(`Autosave failed for ${username}:`, error)
    })
  }
}, 30_000)

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Emberfall backend running on port ${port}`)
})

process.on('SIGTERM', () => {
  clearInterval(tick)
  clearInterval(autosave)
  server.close()
})