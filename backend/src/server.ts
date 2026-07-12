import express from 'express'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import {
  allResources, GAME_PACE_MULTIPLIER, gearCatalog, recipes as recipeData, rocks, slotLabels, woods,
  type Bonuses, type GearSlot, type ProfessionStats, type Recipe, type Resource, type Skill,
} from '../../frontend/src/gameData.ts'
import { rollGatherYield } from './gathering.ts'
import {
  DETECTOR_DRILL_MS, DETECTOR_MAX_CHARGES, DETECTOR_RECHARGE_MS,
  detectorDepthGain, detectorEmptyChance, detectorJackpotChance, detectorRewardScale, rechargeDetectorCharges,
} from './detector.ts'
import { supabase } from "../supabase.ts";

const leaderboardCategories = {
  level: {
    column: 'player_level',
    label: 'Player Level',
  },
  gold: {
    column: 'gold',
    label: 'Gold',
  },
  woodcutting: {
    column: 'woodcutting_level',
    label: 'Woodcutting Level',
  },
  mining: {
    column: 'mining_level',
    label: 'Mining Level',
  },
  clicks: {
    column: 'total_clicks',
    label: 'Total Clicks',
  },
  kills: {
    column: 'monsters_killed',
    label: 'Monsters Killed',
  },
  gathered: {
    column: 'resources_gathered',
    label: 'Resources Gathered',
  },
  crafted: {
    column: 'items_crafted',
    label: 'Items Crafted',
  },
} as const

type LeaderboardCategory =
  keyof typeof leaderboardCategories

const app = express()
const port = Number(process.env.PORT) || 3000
app.use(express.json())
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  next()
})

type Profession = { level: number; xp: number }
type Enemy = { name: string; archetype: string; health: number; maxHealth: number; attack: number; defense: number; attackSpeed: number; xp: number; gold: number }
type ShopUpgrade = 'medic' | 'scouting' | 'training' | 'fortitude' | 'autoBattle'
type EventKind = 'achievement' | 'critical' | 'level' | 'rare' | 'yield' | 'worker'
type GameEvent = { id: number; kind: EventKind; title: string; detail: string }
type AchievementKind = 'level' | 'kills' | 'deaths' | 'tier' | 'gathered' | 'crafted' | 'workers' | 'woodLevel' | 'mineLevel' | 'gear' | 'actions' | 'goldEarned' | 'goldSpent'
type AchievementDefinition = { id: string; name: string; description: string; kind: AchievementKind; goal: number; reward: number; icon: string }
type GatherJob = { resourceId: string; startedAt: number; endsAt: number; critical: boolean; duration: number }
type CraftJob = { recipeId: string; startedAt: number; endsAt: number; duration: number; receipt?: string }
type TimedState = { startedAt: number; endsAt: number }
type FactionId = 'wardens' | 'delvers' | 'vanguard'
type FactionProgress = { reputation: number; rank: number }
type DailyMetric = 'kills' | 'gathered' | 'crafted' | 'actions' | 'goldEarned'
type DailyState = { date: string; baseline: Record<DailyMetric, number>; completed: string[] }
type ProgressSnapshot = { at: number; gold: number; xp: number; level: number; kills: number; gathered: number; crafted: number; inventory: Record<string, number>; ownedGear: string[] }
type DetectorRewardKind = 'empty' | 'gold' | 'material' | 'rare' | 'gear'
type DetectorReward = { kind: DetectorRewardKind; label: string; detail: string; icon: string }
type DetectorTile = { id: number; revealed: boolean; reward: DetectorReward | null }
type DetectorDrill = { startedAt: number; endsAt: number; gold: number; startDepth: number; targetDepth: number }
type MetalDetector = { unlocked: boolean; charges: number; chargeUpdatedAt: number; depth: number; investment: number; tiles: DetectorTile[]; site: number; drilling: DetectorDrill | null }

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
  unlockedGear: string[]
  equipment: Record<GearSlot, string | undefined>
  professions: Record<Skill, Profession>
  craftingProfession: Profession
  resourceMastery: Record<string, number>
  jobs: Partial<Record<Skill, GatherJob>>
  workerAssignments: Record<string, number>
  workerProgress: Record<string, number>
  workers: number
  levelRewardWorkers: number
  shopUpgrades: Record<ShopUpgrade, number>
  unlockedAchievements: Set<string>
  enemyTier: number
  highestEnemyTier: number
  enemy: Enemy
  battleActive: boolean
  autoBattle: boolean
  nextPlayerAttackAt: number
  nextEnemyAttackAt: number
  recovery: TimedState | null
  enemyLoad: TimedState | null
  crafting: CraftJob | null
  events: GameEvent[]
  nextEventId: number
  lifetime: LifetimeStats
  alliedFaction: FactionId | null
  factions: Record<FactionId, FactionProgress>
  daily: DailyState
  metalDetector: MetalDetector
  progressSnapshot?: ProgressSnapshot
}

type LifetimeStats = {
  kills: number
  deaths: number
  gathered: number
  crafted: number
  totalClicks: number
  manualGathers: number
  battlesStarted: number
  retreats: number
  workersBought: number
  upgradesBought: number
  gearBought: number
  goldEarned: number
  goldSpent: number
  craftingMaterialsSaved: number
  craftingBonusOutputs: number
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
  | { type: 'toggleAutoBattle'; enabled: boolean }
  | { type: 'sellItem'; item: string; quantity: number }
  | { type: 'sellGear'; gearId: string }
  | { type: 'allyFaction'; factionId: FactionId }
  | { type: 'revealDetectorTile'; tileId: number }
  | { type: 'startDetectorDrill'; gold: number }
  | { type: 'newDetectorSite' }

const factionDefinitions = [
  { id: 'wardens', name: 'Verdant Wardens', icon: '🌿', unlockLevel: 3, description: 'Protectors of ancient forests. Reputation comes from woodcutting.', ranks: [50, 175, 450, 900], rewards: ['+5% woodcutting speed', '+20% woodcutting bonus yield', '+5% woodcutting crit chance', '+15% woodcutting speed'] },
  { id: 'delvers', name: 'Deep Delvers', icon: '💎', unlockLevel: 5, description: 'Seekers of secrets beneath the mountains. Reputation comes from mining.', ranks: [50, 175, 450, 900], rewards: ['+5% mining speed', '+20% mining bonus yield', '+5% mining crit chance', '+15% mining speed'] },
  { id: 'vanguard', name: 'Ember Vanguard', icon: '🔥', unlockLevel: 7, description: 'Monster hunters defending Emberfall. Reputation comes from victories.', ranks: [50, 175, 450, 900], rewards: ['+3 Attack', '+3 Defense', '+20 maximum health', '+8 Attack'] },
] as const

const dailyObjectivePool = [
  { id: 'hunt5', metric: 'kills', label: 'Win 5 battles', target: 5, reward: 90, icon: '⚔️' },
  { id: 'hunt15', metric: 'kills', label: 'Win 15 battles', target: 15, reward: 225, icon: '🐺' },
  { id: 'gather40', metric: 'gathered', label: 'Gather 40 materials', target: 40, reward: 80, icon: '🪵' },
  { id: 'gather120', metric: 'gathered', label: 'Gather 120 materials', target: 120, reward: 210, icon: '⛏️' },
  { id: 'craft3', metric: 'crafted', label: 'Complete 3 recipes', target: 3, reward: 100, icon: '🔨' },
  { id: 'craft8', metric: 'crafted', label: 'Complete 8 recipes', target: 8, reward: 240, icon: '🔥' },
  { id: 'actions30', metric: 'actions', label: 'Perform 30 actions', target: 30, reward: 75, icon: '✦' },
  { id: 'earn250', metric: 'goldEarned', label: 'Earn 250 gold', target: 250, reward: 125, icon: '◈' },
] as const satisfies ReadonlyArray<{ id: string; metric: DailyMetric; label: string; target: number; reward: number; icon: string }>

const storePaths = [
  { id: 'hatchets', name: 'Hatchets', icon: '🪓', items: ['pineHatchet', 'oakHatchet', 'mapleHatchet', 'yewHatchet'], prices: [175, 1800, 6500, 16000] },
  { id: 'pickaxes', name: 'Pickaxes', icon: '⛏️', items: ['copperPickaxe', 'ironPickaxe', 'silverPickaxe', 'mythrilPickaxe'], prices: [200, 2000, 9000, 32000] },
  { id: 'weapons', name: 'Weapons', icon: '⚔️', items: ['bronzeSword', 'ironSword', 'silverSaber'], prices: [250, 2400, 18000] },
  { id: 'helmets', name: 'Helmets', icon: '🪖', items: ['copperHelm', 'ironHelm', 'obsidianHelm'], prices: [275, 2600, 20000] },
  { id: 'chestArmor', name: 'Chest armor', icon: '🥋', items: ['copperChest', 'ironChest', 'obsidianChest'], prices: [400, 3600, 28000] },
  { id: 'legArmor', name: 'Leg armor', icon: '🦿', items: ['ironLegs', 'goldGreaves'], prices: [3200, 22000] },
  { id: 'boots', name: 'Boots', icon: '🥾', items: ['trailBoots', 'masterBoots'], prices: [900, 14500] },
  { id: 'gloves', name: 'Gloves', icon: '🧤', items: ['loggerGloves', 'forgeGloves'], prices: [2800, 10500] },
  { id: 'rings', name: 'Rings', icon: '💍', items: ['scoutToken', 'silverRing'], prices: [1000, 12000] },
  { id: 'amulets', name: 'Amulets', icon: '📿', items: ['campCharm', 'moonAmulet'], prices: [750, 30000] },
]

const shopUpgradeDetails: Array<{ id: ShopUpgrade; name: string; description: string; icon: string; baseCost: number; max: number }> = [
  { id: 'medic', name: 'Field Medic', description: '-0.5s death recovery per rank.', icon: '⚕️', baseCost: 180, max: 10 },
  { id: 'scouting', name: 'Arena Logistics', description: '-0.1s next-enemy loading time per rank.', icon: '⏳', baseCost: 220, max: 10 },
  { id: 'training', name: 'Combat Training', description: '+1 attack per rank.', icon: '🎯', baseCost: 275, max: 10 },
  { id: 'fortitude', name: 'Fortitude Lessons', description: '+5 maximum health per rank.', icon: '❤️', baseCost: 240, max: 10 },
  { id: 'autoBattle', name: 'Arena Steward', description: 'Unlocks Auto-Battle. Continues fighting until your hero is defeated.', icon: '⚙️', baseCost: 2500, max: 1 },
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
  { id: 'levelTen', name: 'Veteran Adventurer', description: 'Reach player level 10.', kind: 'level', goal: 10, reward: 400, icon: '🏅' },
  { id: 'levelTwentyFive', name: 'Living Legend', description: 'Reach player level 25.', kind: 'level', goal: 25, reward: 1500, icon: '👑' },
  { id: 'killsHundred', name: 'Arena Centurion', description: 'Defeat 100 monsters.', kind: 'kills', goal: 100, reward: 750, icon: '🩸' },
  { id: 'killsThousand', name: 'Bane of Monsters', description: 'Defeat 1,000 monsters.', kind: 'kills', goal: 1000, reward: 5000, icon: '🐉' },
  { id: 'tierTwenty', name: 'Beyond the Veil', description: 'Unlock enemy tier 20.', kind: 'tier', goal: 20, reward: 2000, icon: '🌀' },
  { id: 'gatherTenThousand', name: 'Nature Bends', description: 'Gather 10,000 materials.', kind: 'gathered', goal: 10000, reward: 3500, icon: '🌍' },
  { id: 'craftFifty', name: 'Master Artisan', description: 'Complete 50 recipes.', kind: 'crafted', goal: 50, reward: 900, icon: '⚒️' },
  { id: 'craftFiveHundred', name: 'Forge Eternal', description: 'Complete 500 recipes.', kind: 'crafted', goal: 500, reward: 6000, icon: '🌋' },
  { id: 'tenWorkers', name: 'Industrial Power', description: 'Own 10 workers.', kind: 'workers', goal: 10, reward: 1800, icon: '🏭' },
  { id: 'actionsThousand', name: 'Restless Hands', description: 'Perform 1,000 game actions.', kind: 'actions', goal: 1000, reward: 700, icon: '🖱️' },
  { id: 'actionsTenThousand', name: 'Unstoppable', description: 'Perform 10,000 game actions.', kind: 'actions', goal: 10000, reward: 4500, icon: '⚡' },
  { id: 'earnTenThousand', name: 'Golden Ambition', description: 'Earn 10,000 total gold.', kind: 'goldEarned', goal: 10000, reward: 1000, icon: '💰' },
  { id: 'spendTenThousand', name: 'Patron of Emberfall', description: 'Spend 10,000 total gold.', kind: 'goldSpent', goal: 10000, reward: 800, icon: '🏛️' },
  { id: 'woodTwenty', name: 'Warden of Timber', description: 'Reach woodcutting level 20.', kind: 'woodLevel', goal: 20, reward: 1200, icon: '🌳' },
  { id: 'mineTwenty', name: 'Heart of the Mountain', description: 'Reach mining level 20.', kind: 'mineLevel', goal: 20, reward: 1200, icon: '🏔️' },
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
    lastSeen: number
  }
>()

type ChatMessage = {
  id: string
  username: string
  name: string
  message: string
  createdAt: string
}

const chatMessages: ChatMessage[] = []
const CHAT_LIMIT = 15
const ONLINE_WINDOW_MS = 30_000

const gameOwners = new Map<string, string>()

type StoredGame = Omit<Game, 'unlockedAchievements' | 'levelRewardWorkers'> & {
  unlockedAchievements: string[]
  levelRewardWorkers?: number
}

function serializeGame(game: Game): StoredGame {
  return {
    ...game,
    unlockedAchievements: [...game.unlockedAchievements],
  }
}

function createDetectorTiles(): DetectorTile[] {
  return Array.from({ length: 16 }, (_, id) => ({ id, revealed: false, reward: null }))
}

function createMetalDetector(now: number, unlocked = false): MetalDetector {
  return {
    unlocked,
    charges: DETECTOR_MAX_CHARGES,
    chargeUpdatedAt: now,
    depth: 0,
    investment: 0,
    tiles: createDetectorTiles(),
    site: 1,
    drilling: null,
  }
}

function normalizeMetalDetector(value: Partial<MetalDetector> | undefined, now: number, unlocked: boolean): MetalDetector {
  const fallback = createMetalDetector(now, unlocked)
  const storedTiles = Array.isArray(value?.tiles) ? value.tiles : []
  return {
    unlocked: value?.unlocked ?? unlocked,
    charges: Math.min(DETECTOR_MAX_CHARGES, Math.max(0, Math.floor(value?.charges ?? fallback.charges))),
    chargeUpdatedAt: Number.isFinite(value?.chargeUpdatedAt) ? Number(value?.chargeUpdatedAt) : now,
    depth: Math.max(0, Math.floor(value?.depth ?? 0)),
    investment: Math.max(0, Math.floor(value?.investment ?? (value?.depth ?? 0) ** 2)),
    tiles: fallback.tiles.map(tile => {
      const stored = storedTiles.find(candidate => candidate?.id === tile.id)
      return stored ? { id: tile.id, revealed: Boolean(stored.revealed), reward: stored.reward ?? null } : tile
    }),
    site: Math.max(1, Math.floor(value?.site ?? 1)),
    drilling: value?.drilling ?? null,
  }
}

function normalizeLegacyTerminology(text: string) {
  return text
    .replaceAll('Quick harvest', 'Critical harvest')
    .replaceAll('quick harvest', 'critical harvest')
    .replaceAll('+1 woodcutting yield', '+20% woodcutting bonus yield')
    .replaceAll('+1 mining yield', '+20% mining bonus yield')
}

function deserializeGame(value: unknown): Game {
  const stored = value as StoredGame
  const storedAt = stored.lastAdvancedAt ?? Date.now()
  const expectedLevelRewards = levelWorkerRewardCount(stored.level ?? 1)
  const recordedLevelRewards = stored.levelRewardWorkers ?? legacyLevelWorkerRewardCount(stored.level ?? 1)
  const missingLevelRewards = Math.max(0, expectedLevelRewards - recordedLevelRewards)

  return {
    ...stored,

    message: normalizeLegacyTerminology(stored.message ?? ''),
    events: (stored.events ?? []).map(event => ({
      ...event,
      title: normalizeLegacyTerminology(event.title),
      detail: normalizeLegacyTerminology(event.detail),
    })),

    lifetime: {
      ...createLifetimeStats(),
      ...(stored.lifetime ?? {}),
    },

    craftingProfession: stored.craftingProfession ?? { level: 1, xp: 0 },
    autoBattle: stored.autoBattle ?? false,
    unlockedGear: stored.unlockedGear ?? [...(stored.ownedGear ?? [])],
    alliedFaction: stored.alliedFaction ?? null,
    factions: stored.factions ?? { wardens: { reputation: 0, rank: 0 }, delvers: { reputation: 0, rank: 0 }, vanguard: { reputation: 0, rank: 0 } },
    daily: stored.daily ?? createDailyState(stored.lifetime ?? createLifetimeStats()),
    metalDetector: normalizeMetalDetector(stored.metalDetector, storedAt, (stored.highestEnemyTier ?? 1) >= 4),
    workers: Math.max(stored.workers ?? 0, recordedLevelRewards) + missingLevelRewards,
    levelRewardWorkers: expectedLevelRewards,
    player: {
      ...stored.player,
      baseRecoveryTime: Math.max(60_000, stored.player?.baseRecoveryTime ?? 60_000),
    },
    shopUpgrades: {
      medic: stored.shopUpgrades?.medic ?? 0,
      scouting: stored.shopUpgrades?.scouting ?? 0,
      training: stored.shopUpgrades?.training ?? 0,
      fortitude: stored.shopUpgrades?.fortitude ?? 0,
      autoBattle: stored.shopUpgrades?.autoBattle ?? 0,
    },

    progressSnapshot: stored.progressSnapshot ?? progressSnapshot(stored as unknown as Game, stored.lastAdvancedAt ?? Date.now()),
    unlockedAchievements: new Set(
      stored.unlockedAchievements ?? [],
    ),
  }
}

async function saveGame(
  username: string,
  game: Game,
): Promise<void> {
  const playerSave = await supabase
    .from('players')
    .update({
      game_state: serializeGame(game),
      updated_at: new Date().toISOString(),
    })
    .eq('username', username)

  if (playerSave.error) {
    throw new Error(
      `Could not save game: ${playerSave.error.message}`,
    )
  }

  const leaderboardSave = await supabase
    .from('leaderboard_stats')
    .upsert(
      {
        username,
        display_name: game.name,

        player_level: game.level,
        gold: game.gold,

        woodcutting_level:
          game.professions.woodcutting.level,

        mining_level:
          game.professions.mining.level,

        total_clicks: game.lifetime.totalClicks,
        monsters_killed: game.lifetime.kills,
        deaths: game.lifetime.deaths,
        resources_gathered: game.lifetime.gathered,
        items_crafted: game.lifetime.crafted,

        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'username',
      },
    )

  if (leaderboardSave.error) {
    throw new Error(
      `Could not update leaderboard: ${leaderboardSave.error.message}`,
    )
  }
}

function xpNeeded(game: Game) { return Math.round(140 + 85 * (game.level - 1) ** 1.55) }
function professionXpNeeded(game: Game, skill: Skill) { return Math.round(55 * game.professions[skill].level ** 1.8) }
function craftingXpNeeded(game: Game) { return Math.round(70 * game.craftingProfession.level ** 1.7) }
function levelWorkerRewardCount(level: number) { return (level >= 2 ? 1 : 0) + Math.floor(level / 5) }
function legacyLevelWorkerRewardCount(level: number) { return (level >= 2 ? 1 : 0) + Math.floor(level / 10) }
function craftingStats(game: Game) {
  const level = game.craftingProfession.level
  return {
    speed: Math.min(45, (level - 1) * 2),
    conservationChance: Math.min(20, Math.floor((level - 1) / 2) * 2),
    bonusOutputChance: Math.min(15, Math.floor((level - 1) / 3) * 2.5),
  }
}
function recipeLevel(recipe: Recipe, seen = new Set<string>()): number {
  if (recipe.outputGear) return Math.max(1, gearCatalog[recipe.outputGear]?.tier || 1)
  if (seen.has(recipe.id)) return 1
  seen.add(recipe.id)
  return Math.max(1, ...Object.keys(recipe.costs).map(item => {
    const resourceTier = allResources.find(resource => resource.item === item)?.tier
    const componentRecipe = recipeData.find(candidate => candidate.outputItem === item)
    return resourceTier || (componentRecipe ? recipeLevel(componentRecipe, seen) : 1)
  }))
}
function itemSellPrice(item: string) {
  const resource = allResources.find(candidate => candidate.item === item)
  if (resource) return Math.max(1, resource.tier * 2)
  if (['Ancient Resin', 'Ore Crystal', 'Rough Gem'].includes(item)) return 6
  const recipe = recipeData.find(candidate => candidate.outputItem === item)
  return recipe ? Math.max(2, recipeLevel(recipe) * 3) : 1
}

function totalBonuses(game: Game): Bonuses {
  const result: Record<string, number> = {}
  Object.values(game.equipment).forEach(id => {
    const gear = id ? gearCatalog[id] : undefined
    if (!gear) return
    Object.entries(gear.bonuses).forEach(([stat, value]) => result[stat] = (result[stat] || 0) + value)
  })
  const faction = game.alliedFaction
  const rank = faction ? game.factions[faction].rank : 0
  if (faction === 'wardens') { result.woodSpeed = (result.woodSpeed || 0) + (rank >= 1 ? 5 : 0) + (rank >= 4 ? 15 : 0); result.woodBonusYieldPercent = (result.woodBonusYieldPercent || 0) + (rank >= 2 ? 20 : 0); result.woodCrit = (result.woodCrit || 0) + (rank >= 3 ? 5 : 0) }
  if (faction === 'delvers') { result.miningSpeed = (result.miningSpeed || 0) + (rank >= 1 ? 5 : 0) + (rank >= 4 ? 15 : 0); result.miningBonusYieldPercent = (result.miningBonusYieldPercent || 0) + (rank >= 2 ? 20 : 0); result.miningCrit = (result.miningCrit || 0) + (rank >= 3 ? 5 : 0) }
  if (faction === 'vanguard') { result.attack = (result.attack || 0) + (rank >= 1 ? 3 : 0) + (rank >= 4 ? 8 : 0); result.defense = (result.defense || 0) + (rank >= 2 ? 3 : 0); result.maxHealth = (result.maxHealth || 0) + (rank >= 3 ? 20 : 0) }
  return result
}

function gainFactionReputation(game: Game, factionId: FactionId, amount: number) {
  if (game.alliedFaction !== factionId) return
  const progress = game.factions[factionId]
  progress.reputation += amount
  const definition = factionDefinitions.find(faction => faction.id === factionId)!
  while (progress.rank < definition.ranks.length && progress.reputation >= definition.ranks[progress.rank]!) {
    progress.rank++
    giveGold(game, progress.rank * 40)
    if (progress.rank === 4) game.workers++
    pushEvent(game, 'achievement', `${definition.name} Rank ${progress.rank}`, `${definition.rewards[progress.rank - 1]} · +${progress.rank * 40} gold${progress.rank === 4 ? ' · +1 worker' : ''}`)
  }
}

function combatStats(game: Game) {
  const bonuses = totalBonuses(game)
  return {
    maxHealth: game.player.baseMaxHealth + (bonuses.maxHealth || 0) + game.shopUpgrades.fortitude * 5,
    attack: game.player.baseAttack + (bonuses.attack || 0) + game.shopUpgrades.training,
    defense: game.player.baseDefense + (bonuses.defense || 0),
    attackSpeed: Math.max(600, Math.round(game.player.baseAttackSpeed * GAME_PACE_MULTIPLIER - (bonuses.attackSpeed || 0))),
    recoveryTime: Math.max(3000, Math.round(game.player.baseRecoveryTime - (bonuses.recoverySpeed || 0) - game.shopUpgrades.medic * 500)),
    enemyLoadTime: Math.max(500, Math.round(game.player.baseEnemyLoadTime * GAME_PACE_MULTIPLIER - (bonuses.encounterSpeed || 0) - game.shopUpgrades.scouting * 100)),
    passiveRegen: game.player.basePassiveRegen,
  }
}

function professionStats(game: Game, skill: Skill): ProfessionStats {
  const profession = game.professions[skill]
  const bonuses = totalBonuses(game)
  const prefix = skill === 'woodcutting' ? 'wood' : 'mining'
  return {
    speed: Math.min(180, (profession.level - 1) * 1.25 + (bonuses[`${prefix}Speed` as keyof Bonuses] || 0)),
    // Bonus yield starts low, grows slowly, and remains uncapped for future upgrades.
    bonusYieldPercent: 1 + (profession.level - 1) * .5 + (bonuses[`${prefix}BonusYieldPercent` as keyof Bonuses] || 0),
    critChance: Math.min(30, 3 + (profession.level - 1) * .35 + (bonuses[`${prefix}Crit` as keyof Bonuses] || 0)),
    critPower: Math.min(2.5, 1.5 + (bonuses.critPower || 0)),
  }
}

function publicProfessionStats(game: Game, skill: Skill) {
  const stats = professionStats(game, skill)
  return {
    ...stats,
    // Temporary compatibility for clients from before percentage-based bonus yield.
    yield: 1 + Math.floor(stats.bonusYieldPercent / 100),
  }
}

function effectiveDuration(game: Game, resource: Resource, critical = false) {
  const stats = professionStats(game, resource.skill)
  const masterySpeed = Math.floor((game.resourceMastery[resource.id] || 0) / 10)
  return Math.max(.75, resource.duration * GAME_PACE_MULTIPLIER / (1 + (stats.speed + masterySpeed) / 100) / (critical ? stats.critPower : 1))
}

function pushEvent(game: Game, kind: EventKind, title: string, detail: string) {
  game.events.push({ id: game.nextEventId++, kind, title, detail })
  if (game.events.length > 50) game.events.splice(0, game.events.length - 50)
}

function advanceMetalDetector(game: Game, now: number) {
  const detector = game.metalDetector
  const recharged = rechargeDetectorCharges(detector.charges, detector.chargeUpdatedAt, now)
  detector.charges = recharged.charges
  detector.chargeUpdatedAt = recharged.chargeUpdatedAt

  if (detector.drilling && now >= detector.drilling.endsAt) {
    const completed = detector.drilling
    detector.depth = completed.targetDepth
    detector.drilling = null
    game.message = `The detector reached ${detector.depth}m depth. Better signals can now be found.`
    pushEvent(game, 'level', `Detector depth ${detector.depth}m`, `${completed.gold.toLocaleString()} gold drilled · reward quality improved`)
  }
}

function randomEntry<T>(values: readonly T[]): T | undefined {
  return values[Math.floor(Math.random() * values.length)]
}

function addDetectorItem(game: Game, item: string, amount: number) {
  game.inventory[item] = (game.inventory[item] || 0) + amount
}

function rollDetectorReward(game: Game): DetectorReward {
  const depth = game.metalDetector.depth
  if (Math.random() < detectorEmptyChance(depth)) {
    return { kind: 'empty', label: 'Empty ground', detail: 'Only stone, soil, and rust.', icon: '·' }
  }

  const scale = detectorRewardScale(depth)
  if (Math.random() < detectorJackpotChance(depth)) {
    const unownedGear = Object.values(gearCatalog).filter(gear => !game.ownedGear.includes(gear.id))
    const gear = Math.random() < .45 ? randomEntry(unownedGear) : undefined
    if (gear) {
      game.ownedGear.push(gear.id)
      if (!game.unlockedGear.includes(gear.id)) game.unlockedGear.push(gear.id)
      pushEvent(game, 'rare', 'Buried jackpot!', `${gear.icon} ${gear.name} recovered at ${depth}m`)
      return { kind: 'gear', label: gear.name, detail: `Jackpot equipment · tier ${gear.tier}`, icon: gear.icon }
    }
    const amount = Math.max(50, Math.round((75 + Math.random() * 225) * scale))
    giveGold(game, amount)
    pushEvent(game, 'rare', 'Buried jackpot!', `${amount.toLocaleString()} gold recovered at ${depth}m`)
    return { kind: 'gold', label: `${amount.toLocaleString()} gold`, detail: 'Jackpot cache', icon: '◈' }
  }

  const category = Math.random()
  if (category < .28) {
    const amount = Math.max(1, Math.round((2 + Math.random() * 7) * Math.sqrt(scale)))
    giveGold(game, amount)
    return { kind: 'gold', label: `${amount.toLocaleString()} gold`, detail: 'A small buried purse', icon: '◈' }
  }

  if (category < .76) {
    const resource = randomEntry(allResources)!
    const amount = Math.max(1, Math.floor((1 + Math.random()) * Math.sqrt(scale)))
    addDetectorItem(game, resource.item, amount)
    return { kind: 'material', label: `${amount} × ${resource.item}`, detail: `Random ${resource.family} material`, icon: resource.icon }
  }

  if (category < .94) {
    const recipe = randomEntry(recipeData.filter(candidate => candidate.outputItem))!
    const amount = Math.max(1, Math.floor(Math.sqrt(scale)))
    addDetectorItem(game, recipe.outputItem!, amount)
    return { kind: 'material', label: `${amount} × ${recipe.outputItem}`, detail: 'Buried crafted material', icon: '◆' }
  }

  const rare = randomEntry(['Ancient Resin', 'Ore Crystal', 'Rough Gem'] as const)!
  const amount = 1 + Math.floor(depth / 150)
  addDetectorItem(game, rare, amount)
  pushEvent(game, 'rare', 'Rare detector signal!', `${amount} × ${rare} recovered at ${depth}m`)
  return { kind: 'rare', label: `${amount} × ${rare}`, detail: 'Rare buried material', icon: '✦' }
}

function achievementProgress(game: Game, achievement: AchievementDefinition) {
  const values: Record<AchievementKind, number> = {
    level: game.level, kills: game.lifetime.kills, deaths: game.lifetime.deaths, tier: game.highestEnemyTier,
    gathered: game.lifetime.gathered, crafted: game.lifetime.crafted, workers: game.workers,
    woodLevel: game.professions.woodcutting.level, mineLevel: game.professions.mining.level, gear: game.ownedGear.length,
    actions: game.lifetime.totalClicks, goldEarned: game.lifetime.goldEarned, goldSpent: game.lifetime.goldSpent,
  }
  return Math.min(achievement.goal, values[achievement.kind])
}

function checkAchievements(game: Game) {
  achievementDefinitions.forEach(achievement => {
    if (!game.unlockedAchievements.has(achievement.id) && achievementProgress(game, achievement) >= achievement.goal) {
      game.unlockedAchievements.add(achievement.id)
      const reward = Math.max(10, Math.round(achievement.reward * .35))
      giveGold(game, reward)
      game.message = `Achievement unlocked: ${achievement.name}! +${reward} gold.`
      pushEvent(game, 'achievement', achievement.name, `Achievement unlocked · +${reward} gold`)
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
  game.enemy.maxHealth = Math.round(90 * 1.32 ** power * variance() * archetype.health)
  game.enemy.health = game.enemy.maxHealth
  game.enemy.attack = Math.max(1, Math.round(16 * 1.18 ** power * variance() * archetype.attack))
  game.enemy.defense = Math.floor(power * 1.6 + power ** 1.25 * .35 + Math.random() * 2) + archetype.defense
  game.enemy.attackSpeed = Math.max(850, Math.min(3400, Math.round((2150 + Math.random() * 300) * GAME_PACE_MULTIPLIER * archetype.interval / (1 + power * .025))))
  game.enemy.xp = Math.round(24 * 1.13 ** power * variance() * archetype.reward)
  game.enemy.gold = Math.round(8 * 1.12 ** power * variance() * archetype.reward)
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
    game.player.baseMaxHealth += 5
    game.player.baseAttack += 1
    const gainedDefense = game.level % 2 === 0
    if (gainedDefense) game.player.baseDefense += 1
    game.player.health = combatStats(game).maxHealth
    const earnedLevelWorkers = levelWorkerRewardCount(game.level)
    let gainedWorker = false
    if (earnedLevelWorkers > game.levelRewardWorkers) {
      game.workers += earnedLevelWorkers - game.levelRewardWorkers
      game.levelRewardWorkers = earnedLevelWorkers
      gainedWorker = true
      game.message = `Level ${game.level}! A gatherer joined you as a level reward.`
    } else game.message = `Level up! ${game.name} reached level ${game.level}.`
    pushEvent(
      game,
      'level',
      `Player level ${game.level}!`,
      `+5 max health · +1 attack${gainedDefense ? ' · +1 defense' : ''}${gainedWorker ? ' · +1 gatherer' : ''}`,
    )
    if (gainedWorker) {
      pushEvent(game, 'worker', 'New gatherer unlocked!', `You now have ${game.workers} gatherer${game.workers === 1 ? '' : 's'} · assign them on the Workers page`)
    }
  }
  checkAchievements(game)
}

function giveResource(game: Game, resource: Resource, amount: number, allowRare = false) {
  game.inventory[resource.item] = (game.inventory[resource.item] || 0) + amount
  game.lifetime.gathered += amount
  game.resourceMastery[resource.id] = (game.resourceMastery[resource.id] || 0) + amount
  if (allowRare && Math.random() * 100 < Math.min(10, .5 + resource.tier * .75)) {
    const rare = resource.skill === 'woodcutting' ? 'Ancient Resin' : resource.family === 'ore' ? 'Ore Crystal' : 'Rough Gem'
    game.inventory[rare] = (game.inventory[rare] || 0) + 1
    game.message = `Rare find: ${rare}!`
    pushEvent(game, 'rare', 'Rare material found!', `${rare} · found while gathering ${resource.name}`)
  }
  const gainedXp = 3 + resource.tier * 2
  game.professions[resource.skill].xp += gainedXp
  while (game.professions[resource.skill].xp >= professionXpNeeded(game, resource.skill) && game.professions[resource.skill].level < 50) {
    game.professions[resource.skill].xp -= professionXpNeeded(game, resource.skill)
    game.professions[resource.skill].level++
    const skillName = resource.skill === 'woodcutting' ? 'Woodcutting' : 'Mining'
    const level = game.professions[resource.skill].level
    game.message = `${skillName} reached level ${level}!`
    pushEvent(game, 'level', `${skillName} level ${level}!`, 'Gathering speed and bonus-yield chance increased')
  }
  checkAchievements(game)
}

function nextGearIds(game: Game) {
  return storePaths.map(path => path.items.find(id => !game.unlockedGear.includes(id))).filter((id): id is string => Boolean(id))
}

function shopUpgradeCost(game: Game, upgrade: typeof shopUpgradeDetails[number]) {
  return Math.round(upgrade.baseCost * 1.75 ** game.shopUpgrades[upgrade.id])
}

function workerPrice(game: Game) { return 1000 + Math.max(0, game.lifetime.workersBought) * 500 }

function completeGather(game: Game, skill: Skill) {
  const job = game.jobs[skill]
  if (!job) return
  const resource = allResources.find(candidate => candidate.id === job.resourceId)
  delete game.jobs[skill]
  if (!resource) return
  const stats = professionStats(game, skill)
  const amount = rollGatherYield(stats.bonusYieldPercent)
  giveResource(game, resource, amount, true)
  if (amount >= 2) {
    const title = amount === 2 ? 'Double yield!' : amount === 3 ? 'Triple yield!' : `${amount}× yield!`
    pushEvent(game, 'yield', title, `${resource.icon} Gathered ${amount} × ${resource.item}`)
  }
  gainFactionReputation(game, resource.skill === 'woodcutting' ? 'wardens' : 'delvers', Math.max(1, resource.tier))
  game.message = `Gathered ${amount} × ${resource.item}${job.critical ? ' with a critical harvest' : ''}.`
}

function completeCraft(game: Game) {
  const craft = game.crafting
  game.crafting = null
  if (!craft) return
  const recipe = recipeData.find(candidate => candidate.id === craft.recipeId)
  if (!recipe) return
  if (recipe.outputItem) {
    let quantity = recipe.outputQty || 1
    if (Math.random() * 100 < craftingStats(game).bonusOutputChance) {
      quantity += recipe.outputQty || 1
      game.lifetime.craftingBonusOutputs += recipe.outputQty || 1
    }
    game.inventory[recipe.outputItem] = (game.inventory[recipe.outputItem] || 0) + quantity
  }
  if (recipe.outputGear && !game.ownedGear.includes(recipe.outputGear)) {
    game.ownedGear.push(recipe.outputGear)
    if (!game.unlockedGear.includes(recipe.outputGear)) game.unlockedGear.push(recipe.outputGear)
  }
  game.craftingProfession.xp += 8 + recipeLevel(recipe) * 6
  while (game.craftingProfession.xp >= craftingXpNeeded(game) && game.craftingProfession.level < 25) {
    game.craftingProfession.xp -= craftingXpNeeded(game)
    game.craftingProfession.level++
    const level = game.craftingProfession.level
    game.message = `Crafting reached level ${level}! New recipes are now available.`
    pushEvent(game, 'level', `Crafting level ${level}!`, 'New recipes may now be available in the forge')
  }
  game.lifetime.crafted++
  game.message = `${recipe.name} completed and added to your inventory.${craft.receipt ? ` Materials: ${craft.receipt}.` : ''}`
  checkAchievements(game)
}

function finishVictory(game: Game, now: number) {
  const rewardXp = game.enemy.xp
  const rewardGold = game.enemy.gold
  giveGold(game, rewardGold)
  game.lifetime.kills++
  gainFactionReputation(game, 'vanguard', Math.max(1, game.enemyTier * 2))
  const rareDrops = ['voidfang', 'heartOfTheGrove', 'starforgedSignet']
  if (game.enemyTier >= 5 && Math.random() < .00015 + game.enemyTier * .00005) {
    const gearId = rareDrops[Math.floor(Math.random() * rareDrops.length)]!
    if (!game.ownedGear.includes(gearId)) {
      game.ownedGear.push(gearId)
      if (!game.unlockedGear.includes(gearId)) game.unlockedGear.push(gearId)
      const gear = gearCatalog[gearId]!
      pushEvent(game, 'achievement', 'Mythic drop!', `${gear.icon} ${gear.name} dropped from ${game.enemy.name}`)
      chatMessages.push({ id: randomUUID(), username: 'realm', name: 'Realm Herald', message: `${game.name} found the mythic ${gear.name} from a tier ${game.enemyTier} ${game.enemy.name}!`, createdAt: new Date().toISOString() })
      if (chatMessages.length > CHAT_LIMIT) chatMessages.splice(0, chatMessages.length - CHAT_LIMIT)
    }
  }
  if (game.enemyTier === 3 && !game.metalDetector.unlocked) {
    game.metalDetector.unlocked = true
    game.metalDetector.charges = DETECTOR_MAX_CHARGES
    game.metalDetector.chargeUpdatedAt = now
    game.message = 'The defeated enemy dropped a battered metal detector!'
    pushEvent(game, 'achievement', 'Metal detector found!', 'A new activity has appeared · starts with 10 charges')
  }
  if (game.enemyTier === game.highestEnemyTier && game.highestEnemyTier < 25) game.highestEnemyTier++
  stopBattle(game)
  gainXp(game, rewardXp)
  checkAchievements(game)
  startEnemyLoad(game, now, `Tier ${game.enemyTier} victory! +${rewardXp} XP and +${rewardGold} gold. Loading next enemy...`)
}

function beginRecovery(game: Game, now: number) {
  stopBattle(game)
  game.lifetime.deaths++
  game.autoBattle = false
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
  syncDailyObjectives(game, now)
  const elapsed = Math.max(0, now - game.lastAdvancedAt)
  game.lastAdvancedAt = now
  advanceMetalDetector(game, now)

  if (game.enemyLoad && now >= game.enemyLoad.endsAt) {
    game.enemyLoad = null
    rollEnemy(game)
    game.message = game.recovery ? `${game.enemy.name} is ready. ${game.name} is still recovering.` : `Tier ${game.enemyTier} ${game.enemy.name} is ready to fight.`
  }

  if (game.autoBattle && !game.battleActive && !game.recovery && !game.enemyLoad) {
    const stats = combatStats(game)
    game.player.health = Math.min(Math.max(1, game.player.health), stats.maxHealth)
    game.battleActive = true
    game.nextPlayerAttackAt = now + stats.attackSpeed
    game.nextEnemyAttackAt = now + game.enemy.attackSpeed
    game.message = `Auto-Battle started against ${game.enemy.name}.`
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
      giveResource(game, resource, rollGatherYield(professionStats(game, resource.skill).bonusYieldPercent, completions))
    }
  })

  advanceCombat(game, now)
  game.revision++
}

function createLifetimeStats(): LifetimeStats {
  return {
    kills: 0,
    deaths: 0,
    gathered: 0,
    crafted: 0,
    totalClicks: 0,
    manualGathers: 0,
    battlesStarted: 0,
    retreats: 0,
    workersBought: 0,
    upgradesBought: 0,
    gearBought: 0,
    goldEarned: 0,
    goldSpent: 0,
    craftingMaterialsSaved: 0,
    craftingBonusOutputs: 0,
  }
}

function dailyDate(now = Date.now()) { return new Date(now).toISOString().slice(0, 10) }
function dailyMetricValues(lifetime: LifetimeStats): Record<DailyMetric, number> {
  return { kills: lifetime.kills, gathered: lifetime.gathered, crafted: lifetime.crafted, actions: lifetime.totalClicks, goldEarned: lifetime.goldEarned }
}
function createDailyState(lifetime: LifetimeStats, now = Date.now()): DailyState {
  return { date: dailyDate(now), baseline: dailyMetricValues(lifetime), completed: [] }
}
function dailyObjectives(game: Game) {
  const day = Math.floor(Date.parse(`${game.daily.date}T00:00:00Z`) / 86_400_000)
  return [0, 3, 5].map(offset => dailyObjectivePool[(day + offset) % dailyObjectivePool.length]!)
}
function syncDailyObjectives(game: Game, now = Date.now()) {
  if (game.daily.date !== dailyDate(now)) game.daily = createDailyState(game.lifetime, now)
  const values = dailyMetricValues(game.lifetime)
  dailyObjectives(game).forEach(objective => {
    const progress = Math.max(0, values[objective.metric] - game.daily.baseline[objective.metric])
    if (progress >= objective.target && !game.daily.completed.includes(objective.id)) {
      game.daily.completed.push(objective.id)
      const reward = Math.round(objective.reward * .5)
      giveGold(game, reward)
      pushEvent(game, 'achievement', 'Daily objective complete', `${objective.label} · +${reward} gold`)
    }
  })
}

function createGame(name: string): Game {
  const now = Date.now()
  const game: Game = {
    id: randomUUID(), revision: 0, lastAdvancedAt: now, name, gold: 0, level: 1, xp: 0,
    message: `Welcome, ${name}. Your adventure begins.`,
    player: { health: 100, baseMaxHealth: 100, baseAttack: 10, baseDefense: 3, baseAttackSpeed: 1800, baseRecoveryTime: 60000, baseEnemyLoadTime: 2000, basePassiveRegen: .2, regenBuffer: 0 },
    inventory: {}, ownedGear: ['rustySword', 'wornHatchet', 'crackedPickaxe'], unlockedGear: ['rustySword', 'wornHatchet', 'crackedPickaxe'],
    equipment: { weapon: 'rustySword', helmet: undefined, chest: undefined, legs: undefined, boots: undefined, gloves: undefined, ring: undefined, amulet: undefined, pickaxe: 'crackedPickaxe', hatchet: 'wornHatchet' },
    professions: { woodcutting: { level: 1, xp: 0 }, mining: { level: 1, xp: 0 } }, craftingProfession: { level: 1, xp: 0 }, resourceMastery: {}, jobs: {},
    workerAssignments: {}, workerProgress: {}, workers: 0, levelRewardWorkers: 0, shopUpgrades: { medic: 0, scouting: 0, training: 0, fortitude: 0, autoBattle: 0 },
    unlockedAchievements: new Set(), alliedFaction: null, factions: { wardens: { reputation: 0, rank: 0 }, delvers: { reputation: 0, rank: 0 }, vanguard: { reputation: 0, rank: 0 } }, daily: createDailyState(createLifetimeStats()), metalDetector: createMetalDetector(now),
    lifetime: createLifetimeStats(),
    enemyTier: 1, highestEnemyTier: 1, enemy: { name: 'Loading...', archetype: '', health: 0, maxHealth: 1, attack: 0, defense: 0, attackSpeed: 0, xp: 0, gold: 0 },
    battleActive: false, autoBattle: false, nextPlayerAttackAt: 0, nextEnemyAttackAt: 0, recovery: null, enemyLoad: null, crafting: null,
    events: [], nextEventId: 1,
    progressSnapshot: { at: now, gold: 0, xp: 0, level: 1, kills: 0, gathered: 0, crafted: 0, inventory: {}, ownedGear: ['rustySword', 'wornHatchet', 'crackedPickaxe'] },
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
      game.lifetime.battlesStarted++
      break
    }
    case 'retreat':
      if (!game.battleActive) reject('There is no battle to retreat from.')
      stopBattle(game)
      startEnemyLoad(game, now, 'You retreated. Loading a new enemy...')
      game.lifetime.retreats++
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
        game.message = `Critical harvest! This action runs at ${stats.critPower.toFixed(2)}× speed.`
        pushEvent(game, 'critical', 'Critical harvest!', `${resource.name} · ${stats.critPower.toFixed(2)}× action speed`)
      } else game.message = `${resource.skill === 'woodcutting' ? 'Chopping' : 'Mining'} ${resource.name}...`
      game.lifetime.manualGathers++
      break
    }
    case 'craft': {
      const recipe = recipeData.find(candidate => candidate.id === action.recipeId)
      if (!recipe) reject('Unknown recipe.')
      if (game.craftingProfession.level < recipeLevel(recipe)) reject(`Requires crafting level ${recipeLevel(recipe)}.`)
      if (game.crafting) reject('Another recipe is already being crafted.')
      if (recipe.outputGear && !nextGearIds(game).includes(recipe.outputGear)) reject('That is not the next equipment tier.')
      if (recipe.outputGear && game.ownedGear.includes(recipe.outputGear)) reject('That equipment is already owned.')
      if (!Object.entries(recipe.costs).every(([item, cost]) => (game.inventory[item] || 0) >= cost)) reject('Not enough materials.')
      const craftStats = craftingStats(game)
      const receipt: string[] = []
      const inventoryBefore = Object.fromEntries(
        Object.keys(recipe.costs).map(item => [item, Number(game.inventory[item] || 0)]),
      )
      Object.entries(recipe.costs).forEach(([item, cost]) => {
        const saved = !recipe.outputGear && Math.random() * 100 < craftStats.conservationChance ? 1 : 0
        const before = inventoryBefore[item]!
        const spent = Math.max(0, Number(cost) - saved)
        game.inventory[item] = before - spent
        if (!Number.isFinite(game.inventory[item]) || game.inventory[item] < 0) reject(`Invalid inventory state for ${item}.`)
        game.lifetime.craftingMaterialsSaved += saved
        receipt.push(`${item}: ${before}→${game.inventory[item]}${saved ? ' (1 conserved)' : ''}`)
      })
      const invalidDeduction = Object.entries(recipe.costs).find(([item, cost]) => {
        const expected = inventoryBefore[item]! - Number(cost)
        return recipe.outputGear && game.inventory[item] !== expected
      })
      if (invalidDeduction) {
        Object.entries(inventoryBefore).forEach(([item, count]) => { game.inventory[item] = count })
        reject(`Could not deduct the required ${invalidDeduction[0]}. No materials were consumed.`)
      }
      const duration = recipe.duration * GAME_PACE_MULTIPLIER * (1 - craftStats.speed / 100)
      game.crafting = { recipeId: recipe.id, startedAt: now, endsAt: now + duration * 1000, duration, receipt: receipt.join(' · ') }
      game.message = `Crafting ${recipe.name}... Used ${receipt.join(' · ')}.`
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
      spendGold(game, price)
      game.workers++
      game.message = 'A new worker joined your settlement.'
      checkAchievements(game)
      game.lifetime.workersBought++
      break
    }
    case 'buyUpgrade': {
      const upgrade = shopUpgradeDetails.find(candidate => candidate.id === action.upgradeId)
      if (!upgrade) reject('Unknown shop upgrade.')
      if (game.shopUpgrades[upgrade.id] >= upgrade.max) reject('That upgrade is already maxed.')
      const price = shopUpgradeCost(game, upgrade)
      if (game.gold < price) reject('Not enough gold.')
      spendGold(game, price)
      game.shopUpgrades[upgrade.id]++
      if (upgrade.id === 'fortitude') game.player.health = Math.min(combatStats(game).maxHealth, game.player.health + 5)
      game.message = `${upgrade.name} improved to rank ${game.shopUpgrades[upgrade.id]}.`
      game.lifetime.upgradesBought++
      break
    }
    case 'buyGear': {
      if (game.crafting) reject('Finish the active craft before buying equipment.')
      const path = storePaths.find(candidate => candidate.items.includes(action.gearId))
      if (!path) reject('That equipment is not sold here.')
      const index = path.items.findIndex(id => !game.unlockedGear.includes(id))
      if (index < 0 || path.items[index] !== action.gearId) reject('That is not the next equipment tier.')
      const price = path.prices[index]!
      if (game.gold < price) reject('Not enough gold.')
      spendGold(game, price)
      game.ownedGear.push(action.gearId)
      if (!game.unlockedGear.includes(action.gearId)) game.unlockedGear.push(action.gearId)
      equip(game, action.gearId, now)
      game.message = `${gearCatalog[action.gearId]!.name} purchased and equipped. ${path.name} stock advanced.`
      checkAchievements(game)
      game.lifetime.gearBought++
      break
    }
    case 'equipGear':
      if (!game.ownedGear.includes(action.gearId)) reject('That equipment is not owned.')
      equip(game, action.gearId, now)
      checkAchievements(game)
      break
    case 'toggleAutoBattle':
      if (game.shopUpgrades.autoBattle < 1) reject('Purchase Arena Steward to unlock Auto-Battle.')
      if (typeof action.enabled !== 'boolean') reject('Invalid Auto-Battle setting.')
      game.autoBattle = action.enabled
      game.message = action.enabled ? 'Auto-Battle enabled.' : 'Auto-Battle disabled.'
      break
    case 'sellItem': {
      if (typeof action.item !== 'string' || !Number.isInteger(action.quantity) || action.quantity < 1) reject('Invalid sale.')
      if ((game.inventory[action.item] || 0) < action.quantity) reject('You do not own enough of that item.')
      const payout = itemSellPrice(action.item) * action.quantity
      game.inventory[action.item] -= action.quantity
      giveGold(game, payout)
      game.message = `Sold ${action.quantity} × ${action.item} for ${payout} gold.`
      break
    }
    case 'sellGear': {
      if (typeof action.gearId !== 'string' || !game.ownedGear.includes(action.gearId)) reject('That equipment is not owned.')
      if (Object.values(game.equipment).includes(action.gearId)) reject('Unequip that item before selling it.')
      const gear = gearCatalog[action.gearId]
      if (!gear) reject('Unknown equipment.')
      const payout = Math.max(5, gear.tier * 30)
      game.ownedGear = game.ownedGear.filter(id => id !== action.gearId)
      giveGold(game, payout)
      game.message = `${gear.name} sold for ${payout} gold. Its tier remains unlocked.`
      break
    }
    case 'allyFaction': {
      const definition = factionDefinitions.find(faction => faction.id === action.factionId)
      if (!definition || game.level < definition.unlockLevel) reject('That faction is not unlocked yet.')
      game.alliedFaction = action.factionId
      game.message = `You are now allied with ${definition.name}.`
      break
    }
    case 'revealDetectorTile': {
      const detector = game.metalDetector
      if (!detector.unlocked) reject('Defeat a tier 3 enemy to find the metal detector.')
      if (detector.drilling) reject('The detector is busy drilling to a new depth.')
      if (!Number.isInteger(action.tileId) || action.tileId < 0 || action.tileId >= detector.tiles.length) reject('Unknown detector tile.')
      const tile = detector.tiles[action.tileId]!
      if (tile.revealed) reject('That tile has already been uncovered.')
      if (detector.charges < 1) reject('The metal detector is out of charges.')
      const wasFull = detector.charges === DETECTOR_MAX_CHARGES
      detector.charges--
      if (wasFull) detector.chargeUpdatedAt = now
      tile.reward = rollDetectorReward(game)
      tile.revealed = true
      game.message = tile.reward.kind === 'empty'
        ? `Detector site ${detector.site}: the signal revealed empty ground.`
        : `Detector find: ${tile.reward.label}.`
      break
    }
    case 'startDetectorDrill': {
      const detector = game.metalDetector
      if (!detector.unlocked) reject('Defeat a tier 3 enemy to find the metal detector.')
      if (detector.drilling) reject('The depth drill is already running.')
      if (!Number.isFinite(action.gold) || !Number.isInteger(action.gold) || action.gold < 1) reject('Choose a whole amount of gold to drill.')
      if (action.gold > game.gold) reject('You do not have that much gold.')
      const gain = detectorDepthGain(action.gold, detector.investment)
      if (gain < 1) reject('Commit enough gold to reach at least one new meter of depth.')
      spendGold(game, action.gold)
      detector.investment += action.gold
      detector.drilling = {
        startedAt: now,
        endsAt: now + DETECTOR_DRILL_MS,
        gold: action.gold,
        startDepth: detector.depth,
        targetDepth: detector.depth + gain,
      }
      game.message = `Depth drill started with ${action.gold.toLocaleString()} gold. Reaching ${detector.depth + gain}m in 10 seconds.`
      break
    }
    case 'newDetectorSite':
      if (!game.metalDetector.unlocked) reject('The metal detector has not been found yet.')
      if (!game.metalDetector.tiles.every(tile => tile.revealed)) reject('Uncover every tile before moving to a new site.')
      game.metalDetector.tiles = createDetectorTiles()
      game.metalDetector.site++
      game.message = `Detector site ${game.metalDetector.site} is ready to scan.`
      break
    default:
      reject('Unknown action.')
  }

  game.lifetime.totalClicks++
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
    remaining: Math.max(0, (game.crafting.endsAt - now) / 1000),
  } : null
  const detectorDrilling = game.metalDetector.drilling ? {
    ...game.metalDetector.drilling,
    progress: Math.min(100, Math.max(0, (now - game.metalDetector.drilling.startedAt) / (game.metalDetector.drilling.endsAt - game.metalDetector.drilling.startedAt) * 100)),
    remaining: Math.max(0, game.metalDetector.drilling.endsAt - now),
    goldRemaining: Math.max(0, Math.ceil(game.metalDetector.drilling.gold * (game.metalDetector.drilling.endsAt - now) / (game.metalDetector.drilling.endsAt - game.metalDetector.drilling.startedAt))),
  } : null
  const nextDetectorChargeIn = game.metalDetector.charges >= DETECTOR_MAX_CHARGES
    ? 0
    : Math.max(0, DETECTOR_RECHARGE_MS - (now - game.metalDetector.chargeUpdatedAt))
  return {
    id: game.id, revision: game.revision, serverNow: now, playerName: game.name, gold: game.gold, level: game.level, xp: game.xp, xpNeeded: xpNeeded(game), message: game.message,
    player: { health: game.player.health }, combatStats: stats,
    enemyTier: game.enemyTier, highestEnemyTier: game.highestEnemyTier, enemy: game.enemy,
    battleStarted: game.battleActive, autoBattle: game.autoBattle, recovering: Boolean(game.recovery), enemyLoading: Boolean(game.enemyLoad),
    recoveryRemaining: game.recovery ? Math.max(0, game.recovery.endsAt - now) : 0,
    enemyLoadRemaining: game.enemyLoad ? Math.max(0, game.enemyLoad.endsAt - now) : 0,
    professions: {
      woodcutting: { ...game.professions.woodcutting, xpNeeded: professionXpNeeded(game, 'woodcutting') },
      mining: { ...game.professions.mining, xpNeeded: professionXpNeeded(game, 'mining') },
    },
    craftingProfession: { ...game.craftingProfession, xpNeeded: craftingXpNeeded(game) },
    craftingStats: {
      ...craftingStats(game),
      totalCrafts: game.lifetime.crafted,
      materialsSaved: game.lifetime.craftingMaterialsSaved,
      bonusOutputs: game.lifetime.craftingBonusOutputs,
    },
    recipeLevels: Object.fromEntries(recipeData.map(recipe => [recipe.id, recipeLevel(recipe)])),
    professionStats: { woodcutting: publicProfessionStats(game, 'woodcutting'), mining: publicProfessionStats(game, 'mining') },
    effectiveDurations: Object.fromEntries(allResources.map(resource => [resource.id, effectiveDuration(game, resource)])),
    resourceMastery: game.resourceMastery, jobs, inventory: game.inventory,
    sellPrices: Object.fromEntries(Object.keys(game.inventory).map(item => [item, itemSellPrice(item)])),
    workers: game.workers, workerPrice: workerPrice(game), workerAssignments: game.workerAssignments, workerProgress: game.workerProgress,
    assignedWorkers, freeWorkers: game.workers - assignedWorkers,
    equipment: game.equipment, ownedGear: game.ownedGear, unlockedGear: game.unlockedGear, shopUpgrades: game.shopUpgrades,
    gearSellPrices: Object.fromEntries(game.ownedGear.map(id => [id, Math.max(5, (gearCatalog[id]?.tier || 0) * 30)])),
    alliedFaction: game.alliedFaction, factions: game.factions,
    dailyObjectives: dailyObjectives(game).map(objective => ({ ...objective, reward: Math.round(objective.reward * .5), progress: Math.min(objective.target, Math.max(0, dailyMetricValues(game.lifetime)[objective.metric] - game.daily.baseline[objective.metric])), completed: game.daily.completed.includes(objective.id) })),
    dailyResetAt: Date.parse(`${game.daily.date}T00:00:00Z`) + 86_400_000,
    shopUpgradeCosts: Object.fromEntries(shopUpgradeDetails.map(upgrade => [upgrade.id, shopUpgradeCost(game, upgrade)])),
    crafting, nextGearIds: nextGearIds(game),
    metalDetector: {
      ...game.metalDetector,
      maxCharges: DETECTOR_MAX_CHARGES,
      rechargeMs: DETECTOR_RECHARGE_MS,
      nextChargeIn: nextDetectorChargeIn,
      emptyChance: detectorEmptyChance(game.metalDetector.depth) * 100,
      jackpotChance: (1 - detectorEmptyChance(game.metalDetector.depth)) * detectorJackpotChance(game.metalDetector.depth) * 100,
      drilling: detectorDrilling,
    },
    achievements: achievementDefinitions.map(achievement => ({ ...achievement, reward: Math.max(10, Math.round(achievement.reward * .35)), progress: achievementProgress(game, achievement), unlocked: game.unlockedAchievements.has(achievement.id) })),
    events: game.events,
  }
}

type OfflineProgress = {
  durationMs: number
  gold: number
  xp: number
  levels: number
  kills: number
  gathered: number
  crafted: number
  items: Array<{ item: string; quantity: number }>
  gear: Array<{ id: string; name: string; icon: string }>
}

function progressSnapshot(game: Game, at = Date.now()): ProgressSnapshot {
  return {
    at,
    gold: game.gold ?? 0,
    xp: game.xp ?? 0,
    level: game.level ?? 1,
    kills: game.lifetime?.kills ?? 0,
    gathered: game.lifetime?.gathered ?? 0,
    crafted: game.lifetime?.crafted ?? 0,
    inventory: { ...(game.inventory ?? {}) },
    ownedGear: [...(game.ownedGear ?? [])],
  }
}

function captureOfflineProgress(game: Game, now: number): { state: ReturnType<typeof publicState>; offlineProgress?: OfflineProgress } {
  const before = game.progressSnapshot ?? progressSnapshot(game, game.lastAdvancedAt)
  const state = publicState(game, now)
  const durationMs = Math.max(0, now - before.at)
  game.progressSnapshot = progressSnapshot(game, now)

  if (durationMs < 60_000) return { state }

  const items = Object.entries(game.inventory)
    .map(([item, quantity]) => ({ item, quantity: quantity - (before.inventory[item] || 0) }))
    .filter(entry => entry.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)

  return {
    state,
    offlineProgress: {
      durationMs,
      gold: Math.max(0, game.gold - before.gold),
      xp: Math.max(0, game.xp - before.xp),
      levels: Math.max(0, game.level - before.level),
      kills: Math.max(0, game.lifetime.kills - before.kills),
      gathered: Math.max(0, game.lifetime.gathered - before.gathered),
      crafted: Math.max(0, game.lifetime.crafted - before.crafted),
      items,
      gear: game.ownedGear
        .filter(id => !(before.ownedGear ?? []).includes(id))
        .map(id => ({ id, name: gearCatalog[id]?.name ?? id, icon: gearCatalog[id]?.icon ?? '✦' })),
    },
  }
}

const config = { woods, rocks, allResources, gearCatalog, recipes: recipeData, slotLabels, storePaths, shopUpgradeDetails, factionDefinitions }

function passwordHash(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString('hex')
}

function issueToken(username: string, gameId: string): string {
  const token = randomBytes(32).toString('hex')

  tokens.set(token, {
    username,
    gameId,
    lastSeen: Date.now(),
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

  session.lastSeen = Date.now()

  const game = games.get(gameId)

  if (!game) {
    return undefined
  }

  game.progressSnapshot = progressSnapshot(game)

  return {
    username: session.username,
    game,
  }
}

function giveGold(game: Game, amount: number): void {
  if (amount <= 0) return

  game.gold += amount
  game.lifetime.goldEarned += amount
}

function spendGold(game: Game, amount: number): void {
  if (amount <= 0) return
  if (game.gold < amount) {
    reject('Not enough gold.')
  }

  game.gold -= amount
  game.lifetime.goldSpent += amount
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

    await saveGame(username, game)

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

    const loginResult = captureOfflineProgress(game, Date.now())
    await saveGame(username, game)

    return response.json({
      token: issueToken(username, game.id),
      ...loginResult,
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

function chatSession(request: express.Request) {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
  const session = tokens.get(token)
  if (session) session.lastSeen = Date.now()
  return session
}

function onlineCount() {
  const cutoff = Date.now() - ONLINE_WINDOW_MS
  return new Set(
    [...tokens.values()]
      .filter(session => session.lastSeen >= cutoff)
      .map(session => session.username),
  ).size
}

app.get('/api/chat', (request, response) => {
  const session = chatSession(request)
  if (!session) return response.status(401).json({ error: 'Log in to use chat.' })
  return response.json({ messages: chatMessages, online: onlineCount() })
})

app.post('/api/chat', (request, response) => {
  const session = chatSession(request)
  if (!session) return response.status(401).json({ error: 'Log in to use chat.' })

  const message = typeof request.body?.message === 'string'
    ? request.body.message.trim().replace(/\s+/g, ' ')
    : ''
  if (!message || message.length > 240) {
    return response.status(400).json({ error: 'Messages must be between 1 and 240 characters.' })
  }

  const game = games.get(session.gameId)
  const entry: ChatMessage = {
    id: randomUUID(),
    username: session.username,
    name: game?.name || session.username,
    message,
    createdAt: new Date().toISOString(),
  }
  chatMessages.push(entry)
  if (chatMessages.length > CHAT_LIMIT) chatMessages.splice(0, chatMessages.length - CHAT_LIMIT)

  return response.status(201).json({ messages: chatMessages, online: onlineCount() })
})

app.get('/api/auction', async (request, response) => {
  if (!chatSession(request)) return response.status(401).json({ error: 'Log in to use the auction house.' })
  const { data, error } = await supabase.from('auction_listings').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) return response.status(500).json({ error: 'Could not load auctions. Apply backend/auction-schema.sql in Supabase first.' })
  return response.json({ listings: data })
})

app.post('/api/auction', async (request, response) => {
  const session = chatSession(request)
  if (!session) return response.status(401).json({ error: 'Log in to create a listing.' })
  const game = games.get(session.gameId)
  const item = typeof request.body?.item === 'string' ? request.body.item : ''
  const quantity = Number(request.body?.quantity)
  const price = Number(request.body?.price)
  if (!game || !item || !Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(price) || price < 1) {
    return response.status(400).json({ error: 'Choose an item, quantity, and positive whole-number price.' })
  }
  if ((game.inventory[item] || 0) < quantity) return response.status(409).json({ error: 'You do not own enough of that item.' })

  game.inventory[item] -= quantity
  const listing = { id: randomUUID(), seller_username: session.username, seller_name: game.name, item_name: item, quantity, price, created_at: new Date().toISOString() }
  const { error } = await supabase.from('auction_listings').insert(listing)
  if (error) {
    game.inventory[item] += quantity
    return response.status(500).json({ error: 'Could not create listing. Apply backend/auction-schema.sql in Supabase first.' })
  }
  await saveGame(session.username, game)
  game.revision++
  return response.status(201).json({ listing, state: publicState(game) })
})

app.post('/api/auction/:id/buy', async (request, response) => {
  const buyerSession = chatSession(request)
  if (!buyerSession) return response.status(401).json({ error: 'Log in to buy an auction.' })
  const buyer = games.get(buyerSession.gameId)
  const { data: listing, error } = await supabase.from('auction_listings').select('*').eq('id', request.params.id).maybeSingle()
  if (error || !listing) return response.status(404).json({ error: 'That listing is no longer available.' })
  if (!buyer || listing.seller_username === buyerSession.username) return response.status(409).json({ error: 'You cannot buy your own listing.' })
  if (buyer.gold < listing.price) return response.status(409).json({ error: 'Not enough gold.' })

  const { data: sellerRow } = await supabase.from('players').select('game_state').eq('username', listing.seller_username).single()
  if (!sellerRow) return response.status(409).json({ error: 'The seller could not be loaded.' })
  const seller = [...games.values()].find(game => gameOwners.get(game.id) === listing.seller_username) || deserializeGame(sellerRow.game_state)
  const { data: removed } = await supabase.from('auction_listings').delete().eq('id', listing.id).select('id').maybeSingle()
  if (!removed) return response.status(409).json({ error: 'Someone else already bought that listing.' })

  spendGold(buyer, listing.price)
  buyer.inventory[listing.item_name] = (buyer.inventory[listing.item_name] || 0) + listing.quantity
  giveGold(seller, listing.price)
  buyer.revision++
  seller.revision++
  await Promise.all([saveGame(buyerSession.username, buyer), saveGame(listing.seller_username, seller)])
  return response.json({ state: publicState(buyer) })
})

app.delete('/api/auction/:id', async (request, response) => {
  const session = chatSession(request)
  if (!session) return response.status(401).json({ error: 'Log in to cancel a listing.' })
  const game = games.get(session.gameId)
  const { data: listing } = await supabase.from('auction_listings').delete().eq('id', request.params.id).eq('seller_username', session.username).select('*').maybeSingle()
  if (!game || !listing) return response.status(404).json({ error: 'Listing not found or not owned by you.' })
  game.inventory[listing.item_name] = (game.inventory[listing.item_name] || 0) + listing.quantity
  game.revision++
  await saveGame(session.username, game)
  return response.json({ state: publicState(game) })
})

app.get(
  '/api/leaderboards/:category',
  async (request, response) => {
    const category =
      request.params.category as LeaderboardCategory

    const leaderboard =
      leaderboardCategories[category]

    if (!leaderboard) {
      return response.status(400).json({
        error: 'Unknown leaderboard category.',
      })
    }

    const { data, error } = await supabase
      .from('leaderboard_stats')
      .select(`
        username,
        display_name,
        player_level,
        gold,
        woodcutting_level,
        mining_level,
        total_clicks,
        monsters_killed,
        deaths,
        resources_gathered,
        items_crafted
      `)
      .order(leaderboard.column, {
        ascending: false,
      })
      .order('updated_at', {
        ascending: true,
      })
      .limit(10)

    if (error) {
      console.error('Leaderboard error:', error)

      return response.status(500).json({
        error: 'Could not load the leaderboard.',
      })
    }

    const rows = (data ?? []).map((player, index) => ({
      rank: index + 1,
      username: player.username,
      name: player.display_name,
      score:
        player[
          leaderboard.column as keyof typeof player
        ],
    }))

    return response.json({
      category,
      label: leaderboard.label,
      rows,
    })
  },
)

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
