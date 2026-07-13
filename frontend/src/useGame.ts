import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { startingPages, temporarilyHiddenPages } from './gameData'
import type { BossDefinition, CookingRecipe, Gear, GearSlot, Page, ProfessionStats, RareMaterial, Recipe, Resource, Skill } from './gameData'

type ShopUpgradeId = 'medic' | 'scouting' | 'training' | 'fortitude' | 'autoBattle' | 'autoEat' | 'healingPower'
type GameEvent = { id: number; kind: 'achievement' | 'critical' | 'gift' | 'level' | 'rare' | 'yield' | 'worker'; title: string; detail: string }
type Achievement = { id: string; name: string; description: string; goal: number; reward: number; icon: string; progress: number; unlocked: boolean; titleReward?: string; equipped: boolean }
type StorePath = { id: string; name: string; icon: string; items: string[]; prices: number[] }
type ShopUpgradeDetail = { id: ShopUpgradeId; name: string; description: string; icon: string; baseCost: number; max: number }
type ServerProfessionStats = Omit<ProfessionStats, 'bonusYieldPercent'> & { bonusYieldPercent?: number; yield?: number }
export type FactionId = 'wardens' | 'delvers' | 'tidecallers' | 'harvesters' | 'artificers' | 'vanguard'
export type FactionDefinition = { id: FactionId; name: string; icon: string; unlockLevel: number; description: string; ranks: readonly number[]; rewards: readonly string[] }
type GameConfig = {
  woods: Resource[]
  rocks: Resource[]
  fishingSpots: Resource[]
  farmingPlots: Resource[]
  allResources: Resource[]
  rareMaterials: RareMaterial[]
  gearCatalog: Record<string, Gear>
  recipes: Recipe[]
  cookingRecipes: CookingRecipe[]
  slotLabels: Record<GearSlot, string>
  storePaths: StorePath[]
  shopUpgradeDetails: ShopUpgradeDetail[]
  factionDefinitions: FactionDefinition[]
  bossDefinitions: BossDefinition[]
  googleClientId: string
}
type ServerState = {
  id: string; revision: number; serverNow: number; playerName: string; playerTitle: string; gold: number; level: number; xp: number; xpNeeded: number; message: string
  player: { health: number }
  combatStats: { maxHealth: number; attack: number; defense: number; attackSpeed: number; recoveryTime: number; enemyLoadTime: number; passiveRegen: number }
  encounterMode: 'normal' | 'boss'; defeatedBosses: string[]; tierFiveAreasUnlocked: boolean; currentBossId: string; unlockedPages: Page[]
  enemyTier: number; highestEnemyTier: number
  enemy: { name: string; archetype: string; health: number; maxHealth: number; attack: number; defense: number; attackSpeed: number; xp: number; gold: number }
  battleStarted: boolean; autoBattle: boolean; recovering: boolean; enemyLoading: boolean; recoveryRemaining: number; enemyLoadRemaining: number
  selectedFood: string | null; autoEat: boolean; autoEatThreshold: number; autoEatCooldownRemaining: number; foodHealingPowerBonus: number; foodHealingValues: Record<string, number>; foodHotValues: Record<string, { healing: number; duration: number }>; activeFoodHot: { item: string; remainingHealing: number; remaining: number; stacks: number } | null
  professions: Record<Skill, { level: number; xp: number; xpNeeded: number }>
  craftingProfession: { level: number; xp: number; xpNeeded: number }
  craftingStats: { speed: number; conservationChance: number; bonusOutputChance: number; totalCrafts: number; materialsSaved: number; bonusOutputs: number }
  cookingProfession: { level: number; xp: number; xpNeeded: number }
  cookingStats: { speed: number; conservationChance: number; bonusDishChance: number; totalCooked: number; ingredientsSaved: number; bonusDishes: number }
  recipeLevels: Record<string, number>
  professionStats: Record<Skill, ServerProfessionStats>
  effectiveDurations: Record<string, number>
  resourceMastery: Record<string, number>
  jobs: Partial<Record<Skill, { id: string; critical: boolean; duration: number; progress: number }>>
  inventory: Record<string, number>
  sellPrices: Record<string, number>
  workers: number; workerPrice: number; workerAssignments: Record<string, number>; workerProgress: Record<string, number>; assignedWorkers: number; freeWorkers: number
  equipment: Record<GearSlot, string | undefined>; ownedGear: string[]; unlockedGear: string[]; gearSellPrices: Record<string, number>
  shopUpgrades: Record<ShopUpgradeId, number>; shopUpgradeCosts: Record<ShopUpgradeId, number>
  crafting: { id: string; progress: number; remaining: number } | null
  cooking: { id: string; progress: number; remaining: number } | null
  nextGearIds: string[]; achievements: Achievement[]; events: GameEvent[]
  alliedFaction: FactionId | null; factions: Record<FactionId, { reputation: number; rank: number }>
  dailyObjectives: Array<{ id: string; label: string; target: number; reward: number; icon: string; progress: number; completed: boolean }>; dailyResetAt: number
  metalDetector: MetalDetectorState
}
type Toast = { id: number; kind: GameEvent['kind']; title: string; detail: string }
type LeaderboardCategory = 'level' | 'gold' | 'woodcutting' | 'mining' | 'fishing' | 'farming' | 'cooking' | 'clicks' | 'kills' | 'gathered' | 'crafted' | 'clans'
type LeaderboardEntry = {
  rank: number
  username: string
  name: string
  score: number
  subtitle?: string
}
export type ChatMessage = { id: string; username: string; name: string; message: string; createdAt: string }
export type ClanVisibility = 'public' | 'invite_only'
export type ClanProgress = { level: number; xp: number; xpNeeded: number; totalXp: number }
export type ClanSummary = ClanProgress & { id: string; name: string; description: string; visibility: ClanVisibility; ownerUsername: string; ownerName: string; memberCount: number; createdAt: string }
export type ClanMember = { username: string; name: string; role: 'owner' | 'member'; joinedAt: string; online: boolean }
export type ClanContributor = { username: string; name: string; totalItems: number; totalValue: number }
export type ClanDailyRequest = { date: string; item: string; tier: number; icon: string; valueEach: number; resetsAt: number }
export type ClanRaidContributor = { username: string; name: string; attempts: number; totalDamage: number; lastDamage: number; attemptedToday: boolean }
export type ClanRaid = {
  id: string; weekKey: string; bossId: string; name: string; title: string; icon: string; description: string
  difficulty: number; maxHealth: number; currentHealth: number; attack: number; defense: number; attackSpeed: number
  startsAt: string; endsAt: string; defeatedAt: string | null; defeated: boolean; attemptAvailable: boolean; attemptedToday: boolean; nextAttemptAt: number | null
  rewards: { gold: number; xp: number; clanXp: number }; contributors: ClanRaidContributor[]
}
export type ClanDetails = ClanSummary & { role: 'owner' | 'member'; online: number; members: ClanMember[]; dailyRequest: ClanDailyRequest; dailyContributionValue: number; dailyContributionItems: number; topContributors: ClanContributor[]; raid: ClanRaid }
export type ClanInvitation = { id: string; clanId: string; clanName: string; clanVisibility: ClanVisibility; invitedByUsername: string; invitedByName: string; createdAt: string }
type ClanSnapshot = { clan: ClanDetails | null; invitations: ClanInvitation[]; publicClans: ClanSummary[]; state?: ServerState; notice?: string }
type ClanChatSnapshot = { clan: { id: string; name: string } | null; messages: ChatMessage[]; online: number }
export type AuctionListing = { id: string; seller_username: string; seller_name: string; item_name: string; quantity: number; price: number; created_at: string }
export type DetectorReward = { kind: 'empty' | 'gold' | 'material' | 'rare' | 'gear'; label: string; detail: string; icon: string }
export type MetalDetectorState = {
  unlocked: boolean
  charges: number
  maxCharges: number
  rechargeMs: number
  nextChargeIn: number
  depth: number
  investment: number
  emptyChance: number
  jackpotChance: number
  site: number
  tiles: Array<{ id: number; revealed: boolean; reward: DetectorReward | null }>
  drilling: null | { gold: number; goldRemaining: number; startDepth: number; targetDepth: number; progress: number; remaining: number }
}
export type OfflineProgress = {
  durationMs: number; gold: number; xp: number; levels: number; kills: number; gathered: number; crafted: number; cooked: number
  items: Array<{ item: string; quantity: number }>
  gear: Array<{ id: string; name: string; icon: string }>
}

const API_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin)
).replace(/\/$/, '')
const SESSION_STORAGE_KEY = 'emberfall-session-v1'

function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function useGame() {
  const allTabs: Page[] = ['battle', 'woodcutting', 'mining', 'fishing', 'farming', 'crafting', 'cooking', 'metal detector', 'workers', 'inventory', 'achievements', 'factions', 'clans', 'auction', 'high scores', 'shop', 'about']
  const hiddenGearSlots = new Set<GearSlot>(['fishingRod', 'farmingHoe'])
  const hiddenStorePaths = new Set(['fishingRods', 'farmingHoes'])
  const hiddenShopUpgrades = new Set<ShopUpgradeId>(['autoEat', 'healingPower'])
  const hiddenAchievementIds = new Set(['firstMeal', 'cookTenMeals', 'fishFive', 'farmFive', 'cookFive', 'cookHundredMeals', 'fishTen', 'fishTwenty', 'fishFifty', 'farmTen', 'farmTwenty', 'farmFifty', 'cookTen', 'cookTwenty'])
  const hiddenProfessionTitles = new Set(['Master Chef', 'Ember Chef', 'Tidecaller', 'Lord of the Deep', 'Harvestkeeper', 'World Gardener'])
  const page = ref<Page>('battle')
  const authMode = ref<'login' | 'register'>('login')
  const authUsername = ref('')
  const authPassword = ref('')
  const authConfirmPassword = ref('')
  const authError = ref('')
  const authUsernameError = ref('')
  const authLoading = ref(false)
  const authToken = ref('')
  const sessionRestoring = ref(true)
  const displayNameRequired = ref(false)
  const displayNameDraft = ref('')
  const displayNameError = ref('')
  const displayNameLoading = ref(false)
  const serverOnline = ref(false)
  const backendError = ref('Connecting to the Emberfall server...')
  const actionError = ref('')
  const gameId = ref('')
  const state = ref<ServerState | null>(null)
  const tabs = computed(() => allTabs.filter(tab => !temporarilyHiddenPages.includes(tab) && (state.value?.unlockedPages || startingPages).includes(tab)))
  const config = ref<GameConfig | null>(null)
  const toasts = ref<Toast[]>([])
  const leaderboardCategory = ref<LeaderboardCategory>('woodcutting')
  const leaderboardLabel = ref('Woodcutting Level')
  const leaderboardRows = ref<LeaderboardEntry[]>([])
  const leaderboardLoading = ref(false)
  const leaderboardError = ref('')
  const chatMessages = ref<ChatMessage[]>([])
  const chatOnline = ref(0)
  const chatError = ref('')
  const clan = ref<ClanDetails | null>(null)
  const clanInvitations = ref<ClanInvitation[]>([])
  const publicClans = ref<ClanSummary[]>([])
  const clanMessages = ref<ChatMessage[]>([])
  const clanOnline = ref(0)
  const clanError = ref('')
  const clanChatError = ref('')
  const clanNotice = ref('')
  const clanActionRunning = ref(false)
  const giftError = ref('')
  const giftNotice = ref('')
  const giftRunning = ref(false)
  const auctionListings = ref<AuctionListing[]>([])
  const auctionError = ref('')
  const offlineProgress = ref<OfflineProgress | null>(null)
  const seenEventIds = new Set<number>()
  const toastTimers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextToastId = 1
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let healthTimer: ReturnType<typeof setInterval> | undefined
  let chatTimer: ReturnType<typeof setInterval> | undefined
  let clanTimer: ReturnType<typeof setInterval> | undefined
  let requestRunning = false
  let craftRequestRunning = false
  let cookingRequestRunning = false
  let sessionRestoreAttempted = false

  const emptyProfessionStats: ProfessionStats = { speed: 0, bonusYieldPercent: 1, critChance: 0, critPower: 1.5 }
  const emptyCombat = { maxHealth: 100, attack: 0, defense: 0, attackSpeed: 1800, recoveryTime: 60000, enemyLoadTime: 3600, passiveRegen: .2 }
  const emptyEnemy = { name: 'Loading...', archetype: '', health: 0, maxHealth: 1, attack: 0, defense: 0, attackSpeed: 0, xp: 0, gold: 0 }
  const emptyEquipment = { weapon: undefined, helmet: undefined, chest: undefined, legs: undefined, boots: undefined, gloves: undefined, ring: undefined, amulet: undefined, pickaxe: undefined, hatchet: undefined, fishingRod: undefined, farmingHoe: undefined } satisfies Record<GearSlot, string | undefined>

  const playerName = computed(() => state.value?.playerName || '')
  const playerTitle = computed(() => {
    const title = state.value?.playerTitle || 'Aspiring Adventurer'
    return hiddenProfessionTitles.has(title) ? 'Aspiring Adventurer' : title
  })
  const gold = computed(() => state.value?.gold || 0)
  const level = computed(() => state.value?.level || 1)
  const xp = computed(() => state.value?.xp || 0)
  const xpNeeded = computed(() => state.value?.xpNeeded || 154)
  const message = computed(() => actionError.value || state.value?.message || backendError.value)
  const player = computed(() => state.value?.player || { health: 0 })
  const combatStats = computed(() => {
    const stats = state.value?.combatStats || emptyCombat
    return { ...stats, encounterDelay: stats.enemyLoadTime }
  })
  const dps = computed(() => (combatStats.value.attack / (combatStats.value.attackSpeed / 1000)).toFixed(1))
  const enemyTier = computed(() => state.value?.enemyTier || 1)
  const highestEnemyTier = computed(() => state.value?.highestEnemyTier || 1)
  const encounterMode = computed(() => state.value?.encounterMode || 'normal')
  const defeatedBosses = computed(() => state.value?.defeatedBosses || [])
  const tierFiveAreasUnlocked = computed(() => Boolean(state.value?.tierFiveAreasUnlocked))
  const bossDefinitions = computed(() => config.value?.bossDefinitions || [])
  const currentBoss = computed(() => bossDefinitions.value.find(boss => boss.id === state.value?.currentBossId) || bossDefinitions.value[0])
  const enemy = computed(() => state.value?.enemy || emptyEnemy)
  const battleStarted = computed(() => Boolean(state.value?.battleStarted))
  const autoBattle = computed(() => Boolean(state.value?.autoBattle))
  const selectedFood = computed(() => state.value?.selectedFood || null)
  const autoEat = computed(() => Boolean(state.value?.autoEat))
  const autoEatThreshold = computed(() => state.value?.autoEatThreshold ?? 50)
  const autoEatCooldownRemaining = computed(() => state.value?.autoEatCooldownRemaining || 0)
  const foodHealingPowerBonus = computed(() => state.value?.foodHealingPowerBonus || 0)
  const foodHealingValues = computed(() => state.value?.foodHealingValues || {})
  const foodHotValues = computed(() => state.value?.foodHotValues || {})
  const activeFoodHot = computed(() => state.value?.activeFoodHot || null)
  const recovering = computed(() => Boolean(state.value?.recovering))
  const enemyLoading = computed(() => Boolean(state.value?.enemyLoading))
  const recoveryRemaining = computed(() => state.value?.recoveryRemaining || 0)
  const enemyLoadRemaining = computed(() => state.value?.enemyLoadRemaining || 0)
  const heroHealth = computed(() => Math.max(0, player.value.health / combatStats.value.maxHealth * 100) + '%')
  const enemyHealth = computed(() => Math.max(0, enemy.value.health / enemy.value.maxHealth * 100) + '%')
  const xpPercent = computed(() => Math.min(100, xp.value / xpNeeded.value * 100) + '%')
  const recoveryPercent = computed(() => Math.min(100, Math.max(0, recovering.value ? 100 - recoveryRemaining.value / combatStats.value.recoveryTime * 100 : 0)) + '%')
  const enemyLoadPercent = computed(() => Math.min(100, Math.max(0, enemyLoading.value ? 100 - enemyLoadRemaining.value / combatStats.value.enemyLoadTime * 100 : 0)) + '%')
  const battleButtonLabel = computed(() => recovering.value
    ? 'RECOVERING ' + (recoveryRemaining.value / 1000).toFixed(1) + 'S'
    : enemyLoading.value
      ? (encounterMode.value === 'boss' ? 'SUMMONING BOSS ' : 'LOADING ENEMY ') + (enemyLoadRemaining.value / 1000).toFixed(1) + 'S'
      : battleStarted.value ? 'RETREAT' : 'START BATTLE')

  const woods = computed(() => config.value?.woods || [])
  const rocks = computed(() => config.value?.rocks || [])
  const fishingSpots = computed(() => config.value?.fishingSpots || [])
  const farmingPlots = computed(() => config.value?.farmingPlots || [])
  const allResources = computed(() => config.value?.allResources || [])
  const rareMaterials = computed(() => config.value?.rareMaterials || [])
  const gearCatalog = computed(() => Object.fromEntries(Object.entries(config.value?.gearCatalog || {}).map(([id, gear]) => [id, {
    ...gear,
    description: gear.description
      .replaceAll('every gathering skill', 'woodcutting and mining')
      .replaceAll('every gathering motion', 'woodcutting and mining work')
      .replaceAll('gathering quicker', 'woodcutting and mining quicker'),
    bonuses: Object.fromEntries(Object.entries(gear.bonuses).filter(([stat]) => !stat.startsWith('fishing') && !stat.startsWith('farming') && !stat.startsWith('cooking'))),
  }])) as Record<string, Gear>)
  const slotLabels = computed(() => config.value?.slotLabels || {} as Record<GearSlot, string>)
  const gearSlots = computed(() => (Object.keys(slotLabels.value) as GearSlot[]).filter(slot => !hiddenGearSlots.has(slot)))
  const storePaths = computed(() => (config.value?.storePaths || []).filter(path => !hiddenStorePaths.has(path.id)))
  const shopUpgradeDetails = computed(() => (config.value?.shopUpgradeDetails || []).filter(upgrade => !hiddenShopUpgrades.has(upgrade.id)))
  const googleClientId = computed(() => config.value?.googleClientId || '')
  const professions = computed(() => state.value?.professions || { woodcutting: { level: 1, xp: 0, xpNeeded: 61 }, mining: { level: 1, xp: 0, xpNeeded: 61 }, fishing: { level: 1, xp: 0, xpNeeded: 61 }, farming: { level: 1, xp: 0, xpNeeded: 61 } })
  const jobs = computed(() => state.value?.jobs || {})
  const inventory = computed(() => state.value?.inventory || {})
  const sellPrices = computed(() => state.value?.sellPrices || {})
  const resourceMastery = computed(() => state.value?.resourceMastery || {})
  const workers = computed(() => state.value?.workers || 0)
  const workerPrice = computed(() => state.value?.workerPrice || 1000)
  const workerAssignments = computed(() => state.value?.workerAssignments || {})
  const workerProgress = computed(() => state.value?.workerProgress || {})
  const freeWorkers = computed(() => state.value?.freeWorkers || 0)
  const equipment = computed(() => state.value?.equipment || emptyEquipment)
  const ownedGear = computed(() => (state.value?.ownedGear || []).filter(id => !hiddenGearSlots.has(gearCatalog.value[id]?.slot)))
  const gearSellPrices = computed(() => state.value?.gearSellPrices || {})
  const shopUpgrades = computed(() => state.value?.shopUpgrades || { medic: 0, scouting: 0, training: 0, fortitude: 0, autoBattle: 0, autoEat: 0, healingPower: 0 })
  const achievements = computed(() => (state.value?.achievements || []).filter(achievement => !hiddenAchievementIds.has(achievement.id)))
  const factionDefinitions = computed(() => (config.value?.factionDefinitions || [])
    .filter(faction => faction.id !== 'tidecallers' && faction.id !== 'harvesters')
    .map(faction => faction.id === 'artificers' ? { ...faction, description: 'Masters of the Ember Forge. Reputation comes from crafting.', rewards: ['+5% crafting speed', '+5% material conservation', '+5% bonus output chance', '+15% crafting speed'] } : faction))
  const alliedFaction = computed(() => state.value?.alliedFaction || null)
  const factions = computed(() => state.value?.factions || {
    wardens: { reputation: 0, rank: 0 },
    delvers: { reputation: 0, rank: 0 },
    tidecallers: { reputation: 0, rank: 0 },
    harvesters: { reputation: 0, rank: 0 },
    artificers: { reputation: 0, rank: 0 },
    vanguard: { reputation: 0, rank: 0 },
  })
  const dailyObjectives = computed(() => state.value?.dailyObjectives || [])
  const dailyResetAt = computed(() => state.value?.dailyResetAt || Date.now())
  const craftingProfession = computed(() => state.value?.craftingProfession || { level: 1, xp: 0, xpNeeded: 77 })
  const craftingStats = computed(() => state.value?.craftingStats || { speed: 0, conservationChance: 0, bonusOutputChance: 0, totalCrafts: 0, materialsSaved: 0, bonusOutputs: 0 })
  const craftingId = computed(() => state.value?.crafting?.id || '')
  const cookingProfession = computed(() => state.value?.cookingProfession || { level: 1, xp: 0, xpNeeded: 77 })
  const cookingStats = computed(() => state.value?.cookingStats || { speed: 0, conservationChance: 0, bonusDishChance: 0, totalCooked: 0, ingredientsSaved: 0, bonusDishes: 0 })
  const cookingId = computed(() => state.value?.cooking?.id || '')
  const recipeLevels = computed(() => state.value?.recipeLevels || {})
  const metalDetector = computed<MetalDetectorState>(() => state.value?.metalDetector || {
    unlocked: false, charges: 0, maxCharges: 10, rechargeMs: 600_000, nextChargeIn: 0,
    depth: 0, investment: 0, emptyChance: 78, jackpotChance: .33, site: 1,
    tiles: Array.from({ length: 16 }, (_, id) => ({ id, revealed: false, reward: null })),
    drilling: null,
  })

  function professionStats(skill: Skill): ProfessionStats {
    const stats = state.value?.professionStats[skill]
    if (!stats) return emptyProfessionStats
    return {
      ...stats,
      bonusYieldPercent: stats.bonusYieldPercent ?? Math.max(0, ((stats.yield ?? 1) - 1) * 100),
    }
  }
  function professionXpNeeded(skill: Skill) { return professions.value[skill].xpNeeded }
  function isUnlocked(resource: Resource) { return professions.value[resource.skill].level >= resource.tier }
  function effectiveDuration(resource: Resource) { return state.value?.effectiveDurations[resource.id] || resource.duration }

  const recipeList = computed(() => (config.value?.recipes || []).map(recipe => ({
    ...recipe,
    progress: state.value?.crafting?.id === recipe.id ? state.value.crafting.progress : 0,
    remaining: state.value?.crafting?.id === recipe.id ? state.value.crafting.remaining : undefined,
  })))
  const craftingRecipes = computed(() => recipeList.value.filter(recipe => {
    if (recipe.outputGear && hiddenGearSlots.has(gearCatalog.value[recipe.outputGear]?.slot)) return false
    return !recipe.outputGear || Boolean(state.value?.nextGearIds.includes(recipe.outputGear))
  }))
  const cookingRecipeList = computed(() => (config.value?.cookingRecipes || []).map(recipe => ({
    ...recipe,
    progress: state.value?.cooking?.id === recipe.id ? state.value.cooking.progress : 0,
    remaining: state.value?.cooking?.id === recipe.id ? state.value.cooking.remaining : undefined,
  })))
  const battleFoods = computed(() => temporarilyHiddenPages.includes('cooking') ? [] : cookingRecipeList.value.map(recipe => ({
    item: recipe.outputItem,
    name: recipe.name,
    icon: recipe.icon,
    healing: foodHealingValues.value[recipe.outputItem] || recipe.healing,
    hotHealing: foodHotValues.value[recipe.outputItem]?.healing || 0,
    hotDuration: foodHotValues.value[recipe.outputItem]?.duration || 0,
    owned: inventory.value[recipe.outputItem] || 0,
  })))

  const storeListings = computed(() => storePaths.value.map(path => {
    const index = path.items.findIndex(id => !ownedGear.value.includes(id))
    const itemId = index >= 0 ? path.items[index] : undefined
    return { ...path, index, itemId, item: itemId ? gearCatalog.value[itemId] : undefined, price: index >= 0 ? path.prices[index] : 0 }
  }))
  function shopUpgradeCost(upgrade: ShopUpgradeDetail) { return state.value?.shopUpgradeCosts[upgrade.id] || upgrade.baseCost }
  function achievementProgress(achievement: Achievement) { return achievement.progress }

  const materialGroups = computed(() => {
    const logNames = new Set(woods.value.map(resource => resource.item))
    const rockNames = new Set(rocks.value.filter(resource => resource.family === 'rock').map(resource => resource.item))
    const oreNames = new Set(rocks.value.filter(resource => resource.family === 'ore').map(resource => resource.item))
    const fishNames = new Set(fishingSpots.value.map(resource => resource.item))
    const cropNames = new Set(farmingPlots.value.map(resource => resource.item))
    const foodNames = new Set(cookingRecipeList.value.map(recipe => recipe.outputItem))
    const owned = Object.entries(inventory.value).filter(([, count]) => count > 0)
    return [
      { name: 'Logs', icon: '🌲', items: owned.filter(([item]) => logNames.has(item)) },
      { name: 'Rocks', icon: '🪨', items: owned.filter(([item]) => rockNames.has(item)) },
      { name: 'Ores', icon: '⛏️', items: owned.filter(([item]) => oreNames.has(item)) },
      { name: 'Refined & rare', icon: '💎', items: owned.filter(([item]) => !logNames.has(item) && !rockNames.has(item) && !oreNames.has(item) && !fishNames.has(item) && !cropNames.has(item) && !foodNames.has(item)) },
    ]
  })

  function formatBonus(stat: string, amount: number) {
    const labels: Record<string, string> = { attack: 'Attack', defense: 'Defense', maxHealth: 'Health', attackSpeed: 'Attack speed', woodSpeed: 'WC speed', miningSpeed: 'Mining speed', fishingSpeed: 'Fishing speed', farmingSpeed: 'Farming speed', woodYield: 'WC yield', miningYield: 'Mining yield', fishingYield: 'Fishing yield', farmingYield: 'Farming yield', woodBonusYieldPercent: 'WC bonus yield', miningBonusYieldPercent: 'Mining bonus yield', fishingBonusYieldPercent: 'Fishing bonus yield', farmingBonusYieldPercent: 'Farming bonus yield', woodCrit: 'WC crit chance', miningCrit: 'Mining crit chance', fishingCrit: 'Fishing crit chance', farmingCrit: 'Farming crit chance', critPower: 'Crit power', recoverySpeed: 'Recovery time', encounterSpeed: 'Enemy load time' }
    const percent = stat.includes('Speed') && stat !== 'attackSpeed' || stat.includes('Crit') || stat.includes('BonusYield')
    const value = stat === 'attackSpeed' || stat === 'recoverySpeed' || stat === 'encounterSpeed' ? '-' + amount + 'ms' : stat === 'critPower' ? '+' + amount + '×' : '+' + amount + (percent ? '%' : '')
    return value + ' ' + (labels[stat] || stat)
  }

  function formatBonusDelta(stat: string, difference: number) {
    const absolute = Math.abs(difference)
    if (stat === 'attackSpeed' || stat === 'recoverySpeed' || stat === 'encounterSpeed') return `${difference >= 0 ? '-' : '+'}${absolute}ms`
    if (stat === 'critPower') return `${difference >= 0 ? '+' : '-'}${absolute}×`
    const percent = stat.includes('Speed') || stat.includes('Crit') || stat.includes('BonusYield')
    return `${difference >= 0 ? '+' : '-'}${absolute}${percent ? '%' : ''}`
  }

  function gearTooltip(gear: Gear) {
    const equippedId = equipment.value[gear.slot]
    const equipped = equippedId ? gearCatalog.value[equippedId] : undefined
    const changes = Object.entries(gear.bonuses).map(([stat, amount]) => {
      const current = Number(equipped?.bonuses[stat as keyof Gear['bonuses']] || 0)
      const difference = Number(amount) - current
      const comparison = difference === 0 ? 'same as equipped' : `${formatBonusDelta(stat, difference)} vs equipped`
      return `${formatBonus(stat, Number(amount))} (${comparison})`
    })
    return [gear.name, gear.description, ...changes].join('\n')
  }

  function resourceTooltip(resource: Resource) {
    const mastery = resourceMastery.value[resource.id] || 0
    const stats = professionStats(resource.skill)
    const guaranteedYield = 1 + Math.floor(stats.bonusYieldPercent / 100)
    const remainderChance = stats.bonusYieldPercent % 100
    const secondaryDrops = rareMaterials.value
      .filter(material => material.family === resource.family && material.minTier <= resource.tier)
      .map(material => `${material.icon} ${material.name}`)
      .join(', ')
    const rareChance = Math.min(10, .5 + resource.tier * .75)
    return [
      resource.name,
      `Tier ${resource.tier} activity`,
      `Requires ${resource.skill} level ${resource.tier}`,
      `Produces ${resource.item}`,
      `Effective time: ${effectiveDuration(resource).toFixed(1)}s`,
      `Base yield: 1`,
      `Bonus yield: ${stats.bonusYieldPercent.toFixed(1)}% (${guaranteedYield} guaranteed${remainderChance ? `, plus a ${remainderChance.toFixed(1)}% chance for ${guaranteedYield + 1}` : ''})`,
      `Mastery: ${mastery} (+${Math.floor(mastery / 10)}% speed)`,
      `Critical ${resource.skill === 'fishing' ? 'catch' : 'harvest'}: ${stats.critChance.toFixed(1)}% chance to run at ${stats.critPower.toFixed(2)}× speed; the bonus-yield roll is unchanged.`,
      `Rare material chance: ${rareChance.toFixed(2)}% (${secondaryDrops || 'none'})`,
    ].join('\n')
  }

  function showToast(event: GameEvent) {
    const id = nextToastId++
    toasts.value.push({ id, kind: event.kind, title: event.title, detail: event.detail })
    toastTimers.set(id, setTimeout(() => dismissToast(id), event.kind === 'worker' ? 7500 : 5000))
  }
  function dismissToast(id: number) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
    const timer = toastTimers.get(id)
    if (timer) clearTimeout(timer)
    toastTimers.delete(id)
  }
  function dismissOfflineProgress() { offlineProgress.value = null }
  function formatOfflineDuration(durationMs: number) {
    const minutes = Math.max(1, Math.floor(durationMs / 60_000))
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor(minutes % 1440 / 60)
    const remainingMinutes = minutes % 60
    return [days && `${days}d`, hours && `${hours}h`, remainingMinutes && `${remainingMinutes}m`].filter(Boolean).join(' ')
  }

  function applyServerState(next: ServerState) {
    if (state.value?.id === next.id && next.revision < state.value.revision) return
    next.events.forEach(event => {
      if (!seenEventIds.has(event.id)) { seenEventIds.add(event.id); showToast(event) }
    })
    state.value = next
    gameId.value = next.id
    serverOnline.value = true
    backendError.value = ''
    actionError.value = ''
  }

  function saveSession() {
    if (!authToken.value || !gameId.value) return
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: authToken.value, gameId: gameId.value }))
  }

  function clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    authToken.value = ''
    gameId.value = ''
    clan.value = null
    clanInvitations.value = []
    publicClans.value = []
    clanMessages.value = []
    clanNotice.value = ''
    giftError.value = ''
    giftNotice.value = ''
    clearInterval(clanTimer)
  }

  function startAuthenticatedServices() {
    saveSession()
    startPolling()
    void loadChat()
    void loadClans()
    void loadAuction()
    clearInterval(chatTimer)
    chatTimer = setInterval(() => {
      void loadChat()
      if (clan.value) void loadClanChat()
    }, 2000)
    clearInterval(clanTimer)
    clanTimer = setInterval(loadClans, 10_000)
  }

  async function restoreSession() {
    if (sessionRestoreAttempted) return
    sessionRestoreAttempted = true
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!stored) return
      const session = JSON.parse(stored) as { token?: unknown; gameId?: unknown }
      if (typeof session.token !== 'string' || typeof session.gameId !== 'string') {
        clearSession()
        return
      }
      authToken.value = session.token
      gameId.value = session.gameId
      const response = await fetch(apiUrl(`/api/games/${session.gameId}`), {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      if (response.status === 401 || response.status === 404) {
        clearSession()
        authError.value = 'Your saved session expired. Please log in again.'
        return
      }
      const restoredState = await readJson<ServerState>(response)
      restoredState.events.forEach(event => seenEventIds.add(event.id))
      applyServerState(restoredState)
      startAuthenticatedServices()
    } catch {
      clearSession()
      authError.value = 'Your saved session could not be restored. Please log in again.'
    } finally {
      sessionRestoring.value = false
    }
  }

  async function readJson<T>(response: Response): Promise<T> {
    const payload = await response.json() as T & { error?: string; code?: string }
    if (!response.ok) {
      throw new ApiError(
        payload.error || 'The server rejected the request.',
        response.status,
        payload.code,
      )
    }
    return payload
  }

  async function loadLeaderboard(
    category: LeaderboardCategory = leaderboardCategory.value,
  ): Promise<void> {
    leaderboardCategory.value = category
    leaderboardLoading.value = true
    leaderboardError.value = ''

    try {
      const result = await readJson<{
        category: LeaderboardCategory
        label: string
        rows: LeaderboardEntry[]
      }>(await fetch(apiUrl(`/api/leaderboards/${category}`)))

      leaderboardCategory.value = result.category
      leaderboardLabel.value = result.label
      leaderboardRows.value = result.rows
    } catch (error) {
      leaderboardRows.value = []
      leaderboardError.value = error instanceof Error
        ? error.message
        : 'Could not load leaderboard.'
    } finally {
      leaderboardLoading.value = false
    }
  }

  async function loadChat() {
    if (!authToken.value) return
    try {
      const result = await readJson<{ messages: ChatMessage[]; online: number }>(
        await fetch(apiUrl('/api/chat'), { headers: { Authorization: `Bearer ${authToken.value}` } }),
      )
      chatMessages.value = result.messages
      chatOnline.value = result.online
      chatError.value = ''
    } catch (error) {
      chatError.value = error instanceof Error ? error.message : 'Chat is unavailable.'
    }
  }

  async function sendRealmChat(message: string) {
    if (!authToken.value) return false
    try {
      const result = await readJson<{ messages: ChatMessage[]; online: number }>(
        await fetch(apiUrl('/api/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
          body: JSON.stringify({ message }),
        }),
      )
      chatMessages.value = result.messages
      chatOnline.value = result.online
      chatError.value = ''
      return true
    } catch (error) {
      chatError.value = error instanceof Error ? error.message : 'Could not send message.'
      return false
    }
  }

  function applyClanSnapshot(snapshot: ClanSnapshot) {
    if (snapshot.state) applyServerState(snapshot.state)
    clan.value = snapshot.clan
    clanInvitations.value = snapshot.invitations
    publicClans.value = snapshot.publicClans
    if (!snapshot.clan) {
      clanMessages.value = []
      clanOnline.value = 0
      clanChatError.value = ''
    }
  }

  async function loadClans() {
    if (!authToken.value) return
    try {
      const result = await readJson<ClanSnapshot>(
        await fetch(apiUrl('/api/clans'), { headers: { Authorization: `Bearer ${authToken.value}` } }),
      )
      applyClanSnapshot(result)
      clanError.value = ''
      if (result.notice) clanNotice.value = result.notice
      if (result.clan) void loadClanChat()
    } catch (error) {
      clanError.value = error instanceof Error ? error.message : 'Clans are unavailable.'
    }
  }

  async function loadClanChat() {
    if (!authToken.value || !clan.value) return
    try {
      const result = await readJson<ClanChatSnapshot>(
        await fetch(apiUrl('/api/clans/chat'), { headers: { Authorization: `Bearer ${authToken.value}` } }),
      )
      clanMessages.value = result.messages
      clanOnline.value = result.online
      clanChatError.value = ''
      if (!result.clan) void loadClans()
    } catch (error) {
      clanChatError.value = error instanceof Error ? error.message : 'Clan chat is unavailable.'
    }
  }

  async function sendClanChat(message: string) {
    if (!authToken.value || !clan.value) return false
    try {
      const result = await readJson<ClanChatSnapshot>(
        await fetch(apiUrl('/api/clans/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
          body: JSON.stringify({ message }),
        }),
      )
      clanMessages.value = result.messages
      clanOnline.value = result.online
      clanChatError.value = ''
      return true
    } catch (error) {
      clanChatError.value = error instanceof Error ? error.message : 'Could not send clan message.'
      return false
    }
  }

  function sendChat(channel: 'realm' | 'clan', message: string) {
    return channel === 'clan' ? sendClanChat(message) : sendRealmChat(message)
  }

  async function clanRequest(path: string, method: string, successMessage: string, body?: unknown) {
    if (!authToken.value || clanActionRunning.value) return false
    clanActionRunning.value = true
    clanError.value = ''
    clanNotice.value = ''
    try {
      const result = await readJson<ClanSnapshot>(await fetch(apiUrl(path), {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      }))
      applyClanSnapshot(result)
      clanNotice.value = result.notice || successMessage
      if (result.clan) await loadClanChat()
      return true
    } catch (error) {
      clanError.value = error instanceof Error ? error.message : 'The clan action failed.'
      return false
    } finally {
      clanActionRunning.value = false
    }
  }

  const createClan = (name: string, description: string, visibility: ClanVisibility) => clanRequest('/api/clans', 'POST', `${name.trim()} was created.`, { name, description, visibility })
  const joinClan = (id: string) => clanRequest(`/api/clans/${id}/join`, 'POST', 'You joined the clan.')
  const inviteClanMember = (username: string) => clanRequest('/api/clans/invitations', 'POST', `Invitation sent to ${username.trim()}.`, { username })
  const acceptClanInvitation = (id: string) => clanRequest(`/api/clans/invitations/${id}/accept`, 'POST', 'Invitation accepted.')
  const declineClanInvitation = (id: string) => clanRequest(`/api/clans/invitations/${id}`, 'DELETE', 'Invitation declined.')
  const leaveClan = () => clanRequest('/api/clans/current', 'DELETE', 'You left the clan.')
  const disbandClan = () => clanRequest('/api/clans/current/disband', 'DELETE', 'The clan was disbanded.')
  const contributeToClan = (item: string, quantity: number) => clanRequest('/api/clans/contribute', 'POST', `Contributed ${quantity} × ${item}.`, { item, quantity })
  const fightClanRaid = () => clanRequest('/api/clans/raid/attempt', 'POST', 'Clan raid attempt complete.')

  async function sendGift(recipient: string, item: string, quantity: number) {
    if (!authToken.value || giftRunning.value) return false
    giftRunning.value = true
    giftError.value = ''
    giftNotice.value = ''
    try {
      const result = await readJson<{ state: ServerState }>(await fetch(apiUrl('/api/gifts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
        body: JSON.stringify({ recipient, item, quantity }),
      }))
      applyServerState(result.state)
      giftNotice.value = `Sent ${quantity} × ${item} to ${recipient.trim()}.`
      return true
    } catch (error) {
      giftError.value = error instanceof Error ? error.message : 'Could not send the gift.'
      return false
    } finally {
      giftRunning.value = false
    }
  }

  async function loadAuction() {
    if (!authToken.value) return
    try {
      const result = await readJson<{ listings: AuctionListing[] }>(await fetch(apiUrl('/api/auction'), { headers: { Authorization: `Bearer ${authToken.value}` } }))
      auctionListings.value = result.listings
      auctionError.value = ''
    } catch (error) { auctionError.value = error instanceof Error ? error.message : 'Auction unavailable.' }
  }

  async function auctionRequest(path: string, method: string, body?: unknown) {
    try {
      const result = await readJson<{ state: ServerState }>(await fetch(apiUrl(path), {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
        body: body ? JSON.stringify(body) : undefined,
      }))
      if (result.state) applyServerState(result.state)
      await loadAuction()
      return true
    } catch (error) { auctionError.value = error instanceof Error ? error.message : 'Auction action failed.'; return false }
  }
  const createAuction = (item: string, quantity: number, price: number) => auctionRequest('/api/auction', 'POST', { item, quantity, price })
  const buyAuction = (id: string) => auctionRequest(`/api/auction/${id}/buy`, 'POST')
  const cancelAuction = (id: string) => auctionRequest(`/api/auction/${id}`, 'DELETE')

  async function loadConfig() {
    config.value = await readJson<GameConfig>(
      await fetch(apiUrl('/api/config')),
    )
  }

  async function connectBackend() {
    try {
      const response = await fetch(apiUrl('/api/health'))

      if (!response.ok) {
        throw new Error()
      }

      serverOnline.value = true
      backendError.value = ''

      if (!config.value) {
        await loadConfig()
      }
      await restoreSession()
    } catch {
      serverOnline.value = false
      backendError.value = 'Backend offline. Start the server to play.'
      sessionRestoring.value = false
    }
  }

  function switchAuthMode(mode: 'login' | 'register') {
    authMode.value = mode
    authError.value = ''
    authUsernameError.value = ''
    authConfirmPassword.value = ''
  }

  watch(authUsername, () => {
    authUsernameError.value = ''
  })

  async function submitAuth() {
    const username = authUsername.value.trim().slice(0, 18)
    if (!serverOnline.value || !username || authPassword.value.length < 8) return
    if (authMode.value === 'register' && authPassword.value !== authConfirmPassword.value) {
      authError.value = 'Passwords do not match.'
      return
    }
    authLoading.value = true
    authError.value = ''
    authUsernameError.value = ''
    try {
      if (!config.value) await loadConfig()
      seenEventIds.clear()
      const response = await fetch(apiUrl('/api/auth/' + authMode.value), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: authPassword.value }),
      })
      const result = await readJson<{ token: string; state: ServerState; offlineProgress?: OfflineProgress }>(response)
      displayNameRequired.value = false
      displayNameError.value = ''
      displayNameDraft.value = ''
      authToken.value = result.token
      offlineProgress.value = authMode.value === 'login' ? result.offlineProgress || null : null
      result.state.events.forEach(event => seenEventIds.add(event.id))
      applyServerState(result.state)
      authPassword.value = ''
      authConfirmPassword.value = ''
      startAuthenticatedServices()
    } catch (error) {
      if (
        authMode.value === 'register' &&
        error instanceof ApiError &&
        (error.code === 'USERNAME_TAKEN' || error.status === 409)
      ) {
        authUsernameError.value = error.message
      } else {
        authError.value = error instanceof Error ? error.message : 'Authentication failed.'
      }
    } finally { authLoading.value = false }
  }

  async function loginWithGoogle(credential: string) {
    if (!serverOnline.value || !credential || authLoading.value) return
    authLoading.value = true
    authError.value = ''
    try {
      if (!config.value) await loadConfig()
      seenEventIds.clear()
      const result = await readJson<{ token: string; state?: ServerState; offlineProgress?: OfflineProgress; needsDisplayName?: boolean }>(
        await fetch(apiUrl('/api/auth/google'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        }),
      )
      authToken.value = result.token
      displayNameRequired.value = Boolean(result.needsDisplayName)
      displayNameError.value = ''
      displayNameDraft.value = ''
      if (displayNameRequired.value) {
        state.value = null
        gameId.value = ''
        offlineProgress.value = null
        return
      }
      offlineProgress.value = result.offlineProgress || null
      if (result.state) {
        result.state.events.forEach(event => seenEventIds.add(event.id))
        applyServerState(result.state)
        startAuthenticatedServices()
      }
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'Google sign-in failed.'
    } finally {
      authLoading.value = false
    }
  }

  async function submitDisplayName() {
    const draft = displayNameDraft.value.trim()
    if (!serverOnline.value || !draft || displayNameLoading.value || !authToken.value) return
    displayNameLoading.value = true
    displayNameError.value = ''
    try {
      const result = await readJson<{ state: ServerState; displayName: string }>(await fetch(apiUrl('/api/auth/display-name'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken.value}` },
        body: JSON.stringify({ displayName: draft }),
      }))
      displayNameRequired.value = false
      displayNameDraft.value = result.displayName
      result.state.events.forEach(event => seenEventIds.add(event.id))
      applyServerState(result.state)
      startAuthenticatedServices()
    } catch (error) {
      displayNameError.value = error instanceof Error ? error.message : 'Could not save display name.'
    } finally {
      displayNameLoading.value = false
    }
  }

  async function pollState() {
    if (!gameId.value || requestRunning) return
    requestRunning = true
    try {
      const response = await fetch(apiUrl('/api/games/' + gameId.value), { headers: { Authorization: 'Bearer ' + authToken.value } })
      if (response.status === 401 || response.status === 404) {
        state.value = null; clearSession(); authError.value = 'Your session expired. Please log in again.'; return
      }
      applyServerState(await readJson<ServerState>(response))
    } catch {
      serverOnline.value = false
      backendError.value = 'Connection lost. Gameplay is paused until the backend returns.'
    } finally {
      requestRunning = false
      if (gameId.value) pollTimer = setTimeout(pollState, pollingInterval())
    }
  }

  function pollingInterval() {
    if (document.hidden) return 5000
    const current = state.value
    const hasTimedActivity = Boolean(
      current?.battleStarted || current?.recovering || current?.enemyLoading || current?.crafting || current?.cooking ||
      current?.metalDetector.drilling || Object.values(current?.jobs || {}).some(Boolean) ||
      (page.value === 'workers' && Object.values(current?.workerAssignments || {}).some(count => count > 0)),
    )
    return hasTimedActivity ? 500 : 1500
  }

  function startPolling() { clearTimeout(pollTimer); pollTimer = setTimeout(pollState, 100) }
  async function sendAction(action: Record<string, unknown>) {
    if (!serverOnline.value || !gameId.value) return
    try {
      const response = await fetch(apiUrl('/api/games/' + gameId.value + '/actions'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken.value }, body: JSON.stringify(action) })
      applyServerState(await readJson<ServerState>(response))
      if (!requestRunning) startPolling()
    } catch (error) { actionError.value = error instanceof Error ? error.message : 'Action failed.' }
  }

  function handleVisibilityChange() {
    if (!document.hidden && gameId.value) startPolling()
  }

  function startBattle() { void sendAction({ type: battleStarted.value ? 'retreat' : 'startBattle' }) }
  function setEncounterMode(mode: 'normal' | 'boss') { void sendAction({ type: 'setEncounterMode', mode }) }
  function changeEnemyTier(change: number) {
    const tier = Math.max(1, Math.min(highestEnemyTier.value, enemyTier.value + change))
    if (tier !== enemyTier.value) void sendAction({ type: 'setEnemyTier', tier })
  }
  function gather(resource: Resource) { void sendAction({ type: 'gather', resourceId: resource.id }) }
  async function craft(recipe: Recipe) {
    if (craftRequestRunning) return
    craftRequestRunning = true
    try { await sendAction({ type: 'craft', recipeId: recipe.id }) }
    finally { craftRequestRunning = false }
  }
  async function cook(recipe: CookingRecipe) {
    if (cookingRequestRunning) return
    cookingRequestRunning = true
    try { await sendAction({ type: 'cook', recipeId: recipe.id }) }
    finally { cookingRequestRunning = false }
  }
  function eatFood(item: string) { void sendAction({ type: 'eatFood', item }) }
  function selectFood(item: string | null) { void sendAction({ type: 'setSelectedFood', item }) }
  function toggleAutoEat(enabled: boolean) { void sendAction({ type: 'toggleAutoEat', enabled }) }
  function assignWorker(resource: Resource, change: number) { void sendAction({ type: 'assignWorker', resourceId: resource.id, change }) }
  function buyWorker() { void sendAction({ type: 'buyWorker' }) }
  function buyShopUpgrade(upgrade: ShopUpgradeDetail) { void sendAction({ type: 'buyUpgrade', upgradeId: upgrade.id }) }
  function buyStoreGear(listing: { itemId?: string }) { if (listing.itemId) void sendAction({ type: 'buyGear', gearId: listing.itemId }) }
  function equipGear(id: string) { void sendAction({ type: 'equipGear', gearId: id }) }
  function toggleAutoBattle(enabled: boolean) { void sendAction({ type: 'toggleAutoBattle', enabled }) }
  function sellItem(item: string, quantity: number) { void sendAction({ type: 'sellItem', item, quantity }) }
  function sellGear(gearId: string) { void sendAction({ type: 'sellGear', gearId }) }
  function allyFaction(factionId: FactionId) { void sendAction({ type: 'allyFaction', factionId }) }
  function revealDetectorTile(tileId: number) { void sendAction({ type: 'revealDetectorTile', tileId }) }
  function startDetectorDrill(gold: number) { void sendAction({ type: 'startDetectorDrill', gold }) }
  function newDetectorSite() { void sendAction({ type: 'newDetectorSite' }) }
  function equipAchievementTitle(achievementId: string | null) { void sendAction({ type: 'equipTitle', achievementId }) }

  onMounted(() => {
    void connectBackend()
    void loadLeaderboard()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    healthTimer = setInterval(() => { if (!serverOnline.value) void connectBackend() }, 2000)
  })
  onBeforeUnmount(() => {
    clearTimeout(pollTimer); clearInterval(healthTimer); clearInterval(chatTimer); clearInterval(clanTimer)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    toastTimers.forEach(timer => clearTimeout(timer)); toastTimers.clear()
  })

  return {
    tabs, page, authMode, authUsername, authPassword, authConfirmPassword, authError, authUsernameError, authLoading, sessionRestoring, serverOnline, backendError, playerName, playerTitle, gold, level, xp, xpNeeded, message, player, combatStats, dps,
    enemyTier, highestEnemyTier, encounterMode, defeatedBosses, tierFiveAreasUnlocked, bossDefinitions, currentBoss, enemy, battleStarted, autoBattle, selectedFood, autoEat, autoEatThreshold, autoEatCooldownRemaining, foodHealingPowerBonus, activeFoodHot, recovering, enemyLoading, recoveryRemaining, enemyLoadRemaining,
    heroHealth, enemyHealth, xpPercent, recoveryPercent, enemyLoadPercent, battleButtonLabel,
    woods, rocks, fishingSpots, farmingPlots, allResources, rareMaterials, gearCatalog, slotLabels, gearSlots, shopUpgradeDetails, googleClientId, professions, jobs, inventory, sellPrices, resourceMastery,
    workers, workerPrice, workerAssignments, workerProgress, freeWorkers, equipment, ownedGear, gearSellPrices, shopUpgrades, achievements, craftingId, craftingProfession, craftingStats, cookingId, cookingProfession, cookingStats, factionDefinitions, alliedFaction, factions, dailyObjectives, dailyResetAt, metalDetector,
    craftingRecipes, cookingRecipeList, battleFoods, foodHealingValues, foodHotValues, recipeLevels, storeListings, materialGroups, toasts,
    leaderboardCategory, leaderboardLabel, leaderboardRows, leaderboardLoading, leaderboardError,
    chatMessages, chatOnline, chatError, clan, clanInvitations, publicClans, clanMessages, clanOnline, clanError, clanChatError, clanNotice, clanActionRunning, giftError, giftNotice, giftRunning,
    auctionListings, auctionError, offlineProgress,
    professionStats, professionXpNeeded, isUnlocked, effectiveDuration, shopUpgradeCost, achievementProgress, formatBonus, gearTooltip, resourceTooltip,
    submitAuth, switchAuthMode, loginWithGoogle, submitDisplayName, startBattle, setEncounterMode, changeEnemyTier, gather, craft, cook, eatFood, selectFood, toggleAutoEat, assignWorker, buyWorker, buyShopUpgrade, buyStoreGear, equipGear, toggleAutoBattle, sellItem, sellGear, allyFaction, revealDetectorTile, startDetectorDrill, newDetectorSite, equipAchievementTitle, dismissToast, dismissOfflineProgress, formatOfflineDuration, loadLeaderboard, sendChat, loadClans, createClan, joinClan, inviteClanMember, acceptClanInvitation, declineClanInvitation, leaveClan, disbandClan, contributeToClan, fightClanRaid, sendGift, loadAuction, createAuction, buyAuction, cancelAuction,
    displayNameRequired, displayNameDraft, displayNameError, displayNameLoading,
  }
}
