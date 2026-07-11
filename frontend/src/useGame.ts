import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Gear, GearSlot, Page, Recipe, Resource, Skill } from './gameData'

type ShopUpgradeId = 'medic' | 'scouting' | 'training' | 'fortitude' | 'autoBattle'
type ProfessionStats = { speed: number; yield: number; critChance: number; critPower: number }
type GameEvent = { id: number; kind: 'achievement' | 'critical'; title: string; detail: string }
type Achievement = { id: string; name: string; description: string; goal: number; reward: number; icon: string; progress: number; unlocked: boolean }
type StorePath = { id: string; name: string; icon: string; items: string[]; prices: number[] }
type ShopUpgradeDetail = { id: ShopUpgradeId; name: string; description: string; icon: string; baseCost: number; max: number }
type FactionId = 'wardens' | 'delvers' | 'vanguard'
export type FactionDefinition = { id: FactionId; name: string; icon: string; unlockLevel: number; description: string; ranks: readonly number[]; rewards: readonly string[] }
type GameConfig = {
  woods: Resource[]
  rocks: Resource[]
  allResources: Resource[]
  gearCatalog: Record<string, Gear>
  recipes: Recipe[]
  slotLabels: Record<GearSlot, string>
  storePaths: StorePath[]
  shopUpgradeDetails: ShopUpgradeDetail[]
  factionDefinitions: FactionDefinition[]
}
type ServerState = {
  id: string; revision: number; serverNow: number; playerName: string; gold: number; level: number; xp: number; xpNeeded: number; message: string
  player: { health: number }
  combatStats: { maxHealth: number; attack: number; defense: number; attackSpeed: number; recoveryTime: number; enemyLoadTime: number; passiveRegen: number }
  enemyTier: number; highestEnemyTier: number
  enemy: { name: string; archetype: string; health: number; maxHealth: number; attack: number; defense: number; attackSpeed: number; xp: number; gold: number }
  battleStarted: boolean; autoBattle: boolean; recovering: boolean; enemyLoading: boolean; recoveryRemaining: number; enemyLoadRemaining: number
  professions: Record<Skill, { level: number; xp: number; xpNeeded: number }>
  craftingProfession: { level: number; xp: number; xpNeeded: number }
  craftingStats: { speed: number; conservationChance: number; bonusOutputChance: number; totalCrafts: number; materialsSaved: number; bonusOutputs: number }
  recipeLevels: Record<string, number>
  professionStats: Record<Skill, ProfessionStats>
  effectiveDurations: Record<string, number>
  resourceMastery: Record<string, number>
  jobs: Partial<Record<Skill, { id: string; critical: boolean; duration: number; progress: number }>>
  inventory: Record<string, number>
  sellPrices: Record<string, number>
  workers: number; workerPrice: number; workerAssignments: Record<string, number>; workerProgress: Record<string, number>; assignedWorkers: number; freeWorkers: number
  equipment: Record<GearSlot, string | undefined>; ownedGear: string[]; unlockedGear: string[]; gearSellPrices: Record<string, number>
  shopUpgrades: Record<ShopUpgradeId, number>; shopUpgradeCosts: Record<ShopUpgradeId, number>
  crafting: { id: string; progress: number } | null
  nextGearIds: string[]; achievements: Achievement[]; events: GameEvent[]
  alliedFaction: FactionId | null; factions: Record<FactionId, { reputation: number; rank: number }>
  dailyObjectives: Array<{ id: string; label: string; target: number; reward: number; icon: string; progress: number; completed: boolean }>; dailyResetAt: number
}
type Toast = { id: number; kind: GameEvent['kind']; title: string; detail: string }
type LeaderboardCategory = 'level' | 'gold' | 'woodcutting' | 'mining' | 'clicks' | 'kills' | 'gathered' | 'crafted'
type LeaderboardEntry = {
  rank: number
  username: string
  name: string
  score: number
}
export type ChatMessage = { id: string; username: string; name: string; message: string; createdAt: string }
export type AuctionListing = { id: string; seller_username: string; seller_name: string; item_name: string; quantity: number; price: number; created_at: string }
export type OfflineProgress = {
  durationMs: number; gold: number; xp: number; levels: number; kills: number; gathered: number; crafted: number
  items: Array<{ item: string; quantity: number }>
  gear: Array<{ id: string; name: string; icon: string }>
}

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/$/, '')

function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

export function useGame() {
  const tabs: Page[] = ['battle', 'woodcutting', 'mining', 'crafting', 'workers', 'inventory', 'achievements', 'factions', 'auction', 'high scores', 'shop']
  const page = ref<Page>('battle')
  const authMode = ref<'login' | 'register'>('login')
  const authUsername = ref('')
  const authPassword = ref('')
  const authConfirmPassword = ref('')
  const authError = ref('')
  const authLoading = ref(false)
  const authToken = ref('')
  const serverOnline = ref(false)
  const backendError = ref('Connecting to the Emberfall server...')
  const actionError = ref('')
  const gameId = ref('')
  const state = ref<ServerState | null>(null)
  const config = ref<GameConfig | null>(null)
  const craftFilter = ref<'all' | Recipe['category']>('all')
  const toasts = ref<Toast[]>([])
  const leaderboardCategory = ref<LeaderboardCategory>('woodcutting')
  const leaderboardLabel = ref('Woodcutting Level')
  const leaderboardRows = ref<LeaderboardEntry[]>([])
  const leaderboardLoading = ref(false)
  const leaderboardError = ref('')
  const chatMessages = ref<ChatMessage[]>([])
  const chatOnline = ref(0)
  const chatError = ref('')
  const auctionListings = ref<AuctionListing[]>([])
  const auctionError = ref('')
  const offlineProgress = ref<OfflineProgress | null>(null)
  const seenEventIds = new Set<number>()
  const toastTimers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextToastId = 1
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let healthTimer: ReturnType<typeof setInterval> | undefined
  let chatTimer: ReturnType<typeof setInterval> | undefined
  let requestRunning = false

  const emptyProfessionStats: ProfessionStats = { speed: 0, yield: 1, critChance: 0, critPower: 1.5 }
  const emptyCombat = { maxHealth: 100, attack: 0, defense: 0, attackSpeed: 1800, recoveryTime: 30000, enemyLoadTime: 2000, passiveRegen: .2 }
  const emptyEnemy = { name: 'Loading...', archetype: '', health: 0, maxHealth: 1, attack: 0, defense: 0, attackSpeed: 0, xp: 0, gold: 0 }
  const emptyEquipment = { weapon: undefined, helmet: undefined, chest: undefined, legs: undefined, boots: undefined, gloves: undefined, ring: undefined, amulet: undefined, pickaxe: undefined, hatchet: undefined } satisfies Record<GearSlot, string | undefined>

  const playerName = computed(() => state.value?.playerName || '')
  const gold = computed(() => state.value?.gold || 0)
  const level = computed(() => state.value?.level || 1)
  const xp = computed(() => state.value?.xp || 0)
  const xpNeeded = computed(() => state.value?.xpNeeded || 100)
  const message = computed(() => actionError.value || state.value?.message || backendError.value)
  const player = computed(() => state.value?.player || { health: 0 })
  const combatStats = computed(() => {
    const stats = state.value?.combatStats || emptyCombat
    return { ...stats, encounterDelay: stats.enemyLoadTime }
  })
  const dps = computed(() => (combatStats.value.attack / (combatStats.value.attackSpeed / 1000)).toFixed(1))
  const enemyTier = computed(() => state.value?.enemyTier || 1)
  const highestEnemyTier = computed(() => state.value?.highestEnemyTier || 1)
  const enemy = computed(() => state.value?.enemy || emptyEnemy)
  const battleStarted = computed(() => Boolean(state.value?.battleStarted))
  const autoBattle = computed(() => Boolean(state.value?.autoBattle))
  const recovering = computed(() => Boolean(state.value?.recovering))
  const enemyLoading = computed(() => Boolean(state.value?.enemyLoading))
  const recoveryRemaining = computed(() => state.value?.recoveryRemaining || 0)
  const enemyLoadRemaining = computed(() => state.value?.enemyLoadRemaining || 0)
  const heroHealth = computed(() => Math.max(0, player.value.health / combatStats.value.maxHealth * 100) + '%')
  const enemyHealth = computed(() => Math.max(0, enemy.value.health / enemy.value.maxHealth * 100) + '%')
  const xpPercent = computed(() => Math.min(100, xp.value / xpNeeded.value * 100) + '%')
  const recoveryPercent = computed(() => (recovering.value ? 100 - recoveryRemaining.value / combatStats.value.recoveryTime * 100 : 0) + '%')
  const enemyLoadPercent = computed(() => (enemyLoading.value ? 100 - enemyLoadRemaining.value / combatStats.value.enemyLoadTime * 100 : 0) + '%')
  const battleButtonLabel = computed(() => recovering.value
    ? 'RECOVERING ' + (recoveryRemaining.value / 1000).toFixed(1) + 'S'
    : enemyLoading.value
      ? 'LOADING ENEMY ' + (enemyLoadRemaining.value / 1000).toFixed(1) + 'S'
      : battleStarted.value ? 'RETREAT' : 'START BATTLE')

  const woods = computed(() => config.value?.woods || [])
  const rocks = computed(() => config.value?.rocks || [])
  const allResources = computed(() => config.value?.allResources || [])
  const gearCatalog = computed(() => config.value?.gearCatalog || {})
  const slotLabels = computed(() => config.value?.slotLabels || {} as Record<GearSlot, string>)
  const gearSlots = computed(() => Object.keys(slotLabels.value) as GearSlot[])
  const storePaths = computed(() => config.value?.storePaths || [])
  const shopUpgradeDetails = computed(() => config.value?.shopUpgradeDetails || [])
  const professions = computed(() => state.value?.professions || { woodcutting: { level: 1, xp: 0, xpNeeded: 15 }, mining: { level: 1, xp: 0, xpNeeded: 15 } })
  const jobs = computed(() => state.value?.jobs || {})
  const inventory = computed(() => state.value?.inventory || {})
  const sellPrices = computed(() => state.value?.sellPrices || {})
  const resourceMastery = computed(() => state.value?.resourceMastery || {})
  const workers = computed(() => state.value?.workers || 0)
  const workerPrice = computed(() => state.value?.workerPrice || 500)
  const workerAssignments = computed(() => state.value?.workerAssignments || {})
  const workerProgress = computed(() => state.value?.workerProgress || {})
  const freeWorkers = computed(() => state.value?.freeWorkers || 0)
  const equipment = computed(() => state.value?.equipment || emptyEquipment)
  const ownedGear = computed(() => state.value?.ownedGear || [])
  const gearSellPrices = computed(() => state.value?.gearSellPrices || {})
  const shopUpgrades = computed(() => state.value?.shopUpgrades || { medic: 0, scouting: 0, training: 0, fortitude: 0, autoBattle: 0 })
  const achievements = computed(() => state.value?.achievements || [])
  const factionDefinitions = computed(() => config.value?.factionDefinitions || [])
  const alliedFaction = computed(() => state.value?.alliedFaction || null)
  const factions = computed(() => state.value?.factions || { wardens: { reputation: 0, rank: 0 }, delvers: { reputation: 0, rank: 0 }, vanguard: { reputation: 0, rank: 0 } })
  const dailyObjectives = computed(() => state.value?.dailyObjectives || [])
  const dailyResetAt = computed(() => state.value?.dailyResetAt || Date.now())
  const craftingProfession = computed(() => state.value?.craftingProfession || { level: 1, xp: 0, xpNeeded: 35 })
  const craftingStats = computed(() => state.value?.craftingStats || { speed: 0, conservationChance: 0, bonusOutputChance: 0, totalCrafts: 0, materialsSaved: 0, bonusOutputs: 0 })
  const craftingId = computed(() => state.value?.crafting?.id || '')

  function professionStats(skill: Skill) { return state.value?.professionStats[skill] || emptyProfessionStats }
  function professionXpNeeded(skill: Skill) { return professions.value[skill].xpNeeded }
  function isUnlocked(resource: Resource) { return professions.value[resource.skill].level >= resource.tier }
  function effectiveDuration(resource: Resource) { return state.value?.effectiveDurations[resource.id] || resource.duration }

  const recipeList = computed(() => (config.value?.recipes || []).map(recipe => ({ ...recipe, progress: state.value?.crafting?.id === recipe.id ? state.value.crafting.progress : 0 })))
  const filteredRecipes = computed(() => recipeList.value.filter(recipe => {
    const matchesFilter = craftFilter.value === 'all' || recipe.category === craftFilter.value
    return matchesFilter && (!recipe.outputGear || Boolean(state.value?.nextGearIds.includes(recipe.outputGear)))
  }))
  function canCraft(recipe: Recipe) {
    return craftingProfession.value.level >= (state.value?.recipeLevels[recipe.id] || 1) && (!recipe.outputGear || !ownedGear.value.includes(recipe.outputGear)) && Object.entries(recipe.costs).every(([item, cost]) => (inventory.value[item] || 0) >= cost)
  }

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
    const owned = Object.entries(inventory.value).filter(([, count]) => count > 0)
    return [
      { name: 'Logs', icon: '🌲', items: owned.filter(([item]) => logNames.has(item)) },
      { name: 'Rocks', icon: '🪨', items: owned.filter(([item]) => rockNames.has(item)) },
      { name: 'Ores', icon: '⛏️', items: owned.filter(([item]) => oreNames.has(item)) },
      { name: 'Refined & rare', icon: '💎', items: owned.filter(([item]) => !logNames.has(item) && !rockNames.has(item) && !oreNames.has(item)) },
    ]
  })

  function formatBonus(stat: string, amount: number) {
    const labels: Record<string, string> = { attack: 'Attack', defense: 'Defense', maxHealth: 'Health', attackSpeed: 'Attack speed', woodSpeed: 'WC speed', miningSpeed: 'Mining speed', woodYield: 'WC yield', miningYield: 'Mining yield', woodCrit: 'WC quick chance', miningCrit: 'Mining quick chance', critPower: 'Quick speed', recoverySpeed: 'Recovery time', encounterSpeed: 'Enemy load time' }
    const percent = stat.includes('Speed') && stat !== 'attackSpeed' || stat.includes('Crit')
    const value = stat === 'attackSpeed' || stat === 'recoverySpeed' || stat === 'encounterSpeed' ? '-' + amount + 'ms' : stat === 'critPower' ? '+' + amount + '×' : '+' + amount + (percent ? '%' : '')
    return value + ' ' + (labels[stat] || stat)
  }

  function gearTooltip(gear: Gear) {
    const equippedId = equipment.value[gear.slot]
    const equipped = equippedId ? gearCatalog.value[equippedId] : undefined
    const changes = Object.entries(gear.bonuses).map(([stat, amount]) => {
      const current = Number(equipped?.bonuses[stat as keyof Gear['bonuses']] || 0)
      const difference = Number(amount) - current
      const comparison = difference === 0 ? 'same as equipped' : `${difference > 0 ? '+' : ''}${difference} vs equipped`
      return `${formatBonus(stat, Number(amount))} (${comparison})`
    })
    return [gear.name, gear.description, ...changes].join('\n')
  }

  function resourceTooltip(resource: Resource) {
    const mastery = resourceMastery.value[resource.id] || 0
    const stats = professionStats(resource.skill)
    return [
      resource.name,
      `Requires ${resource.skill} level ${resource.tier}`,
      `Produces ${resource.item}`,
      `Effective time: ${effectiveDuration(resource).toFixed(1)}s`,
      `Current base yield: ${stats.yield}`,
      `Mastery: ${mastery} (+${Math.floor(mastery / 10)}% speed)`,
      `Quick harvest: ${stats.critChance.toFixed(1)}% chance to finish ${stats.critPower.toFixed(2)}× faster (yield stays ${stats.yield}).`,
      `Rare materials have a small resource-tier-based drop chance.`,
    ].join('\n')
  }

  function recipeTooltip(recipe: Recipe) {
    const output = recipe.outputGear ? gearCatalog.value[recipe.outputGear] : undefined
    const costs = Object.entries(recipe.costs).map(([item, amount]) => `${amount} × ${item}`).join(', ')
    return [
      recipe.name,
      recipe.description,
      `Craft time: ${recipe.duration}s`,
      `Requires crafting level ${state.value?.recipeLevels[recipe.id] || 1}`,
      `Materials: ${costs}`,
      output ? gearTooltip(output) : `Creates ${recipe.outputQty || 1} × ${recipe.outputItem}`,
    ].join('\n')
  }

  function showToast(event: GameEvent) {
    const id = nextToastId++
    toasts.value.push({ id, kind: event.kind, title: event.title, detail: event.detail })
    toastTimers.set(id, setTimeout(() => dismissToast(id), 2000))
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

  async function readJson<T>(response: Response): Promise<T> {
    const payload = await response.json() as T & { error?: string }
    if (!response.ok) throw new Error(payload.error || 'The server rejected the request.')
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

  async function sendChat(message: string) {
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
    } catch {
      serverOnline.value = false
      backendError.value = 'Backend offline. Start the server to play.'
    }
  }

  function switchAuthMode(mode: 'login' | 'register') {
    authMode.value = mode
    authError.value = ''
    authConfirmPassword.value = ''
  }
  async function submitAuth() {
    const username = authUsername.value.trim().slice(0, 18)
    if (!serverOnline.value || !username || authPassword.value.length < 8) return
    if (authMode.value === 'register' && authPassword.value !== authConfirmPassword.value) {
      authError.value = 'Passwords do not match.'
      return
    }
    authLoading.value = true
    authError.value = ''
    try {
      if (!config.value) await loadConfig()
      seenEventIds.clear()
      const response = await fetch(apiUrl('/api/auth/' + authMode.value), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: authPassword.value }),
      })
      const result = await readJson<{ token: string; state: ServerState; offlineProgress?: OfflineProgress }>(response)
      authToken.value = result.token
      offlineProgress.value = authMode.value === 'login' ? result.offlineProgress || null : null
      result.state.events.forEach(event => seenEventIds.add(event.id))
      applyServerState(result.state)
      startPolling()
      void loadChat()
      void loadAuction()
      clearInterval(chatTimer)
      chatTimer = setInterval(loadChat, 2000)
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'Authentication failed.'
    } finally { authLoading.value = false }
  }
  async function pollState() {
    if (!gameId.value || requestRunning) return
    requestRunning = true
    try {
      const response = await fetch(apiUrl('/api/games/' + gameId.value), { headers: { Authorization: 'Bearer ' + authToken.value } })
      if (response.status === 401 || response.status === 404) {
        state.value = null; gameId.value = ''; authToken.value = ''; authError.value = 'The backend restarted. Register or log in again.'; return
      }
      applyServerState(await readJson<ServerState>(response))
    } catch {
      serverOnline.value = false
      backendError.value = 'Connection lost. Gameplay is paused until the backend returns.'
    } finally {
      requestRunning = false
      if (gameId.value) pollTimer = setTimeout(pollState, 250)
    }
  }
  function startPolling() { clearTimeout(pollTimer); pollTimer = setTimeout(pollState, 100) }
  async function sendAction(action: Record<string, unknown>) {
    if (!serverOnline.value || !gameId.value) return
    try {
      const response = await fetch(apiUrl('/api/games/' + gameId.value + '/actions'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken.value }, body: JSON.stringify(action) })
      applyServerState(await readJson<ServerState>(response))
    } catch (error) { actionError.value = error instanceof Error ? error.message : 'Action failed.' }
  }

  function startBattle() { void sendAction({ type: battleStarted.value ? 'retreat' : 'startBattle' }) }
  function changeEnemyTier(change: number) {
    const tier = Math.max(1, Math.min(highestEnemyTier.value, enemyTier.value + change))
    if (tier !== enemyTier.value) void sendAction({ type: 'setEnemyTier', tier })
  }
  function gather(resource: Resource) { void sendAction({ type: 'gather', resourceId: resource.id }) }
  function craft(recipe: Recipe) { void sendAction({ type: 'craft', recipeId: recipe.id }) }
  function assignWorker(resource: Resource, change: number) { void sendAction({ type: 'assignWorker', resourceId: resource.id, change }) }
  function buyWorker() { void sendAction({ type: 'buyWorker' }) }
  function buyShopUpgrade(upgrade: ShopUpgradeDetail) { void sendAction({ type: 'buyUpgrade', upgradeId: upgrade.id }) }
  function buyStoreGear(listing: typeof storeListings.value[number]) { if (listing.itemId) void sendAction({ type: 'buyGear', gearId: listing.itemId }) }
  function equipGear(id: string) { void sendAction({ type: 'equipGear', gearId: id }) }
  function toggleAutoBattle(enabled: boolean) { void sendAction({ type: 'toggleAutoBattle', enabled }) }
  function sellItem(item: string, quantity: number) { void sendAction({ type: 'sellItem', item, quantity }) }
  function sellGear(gearId: string) { void sendAction({ type: 'sellGear', gearId }) }
  function allyFaction(factionId: FactionId) { void sendAction({ type: 'allyFaction', factionId }) }

  onMounted(() => {
    void connectBackend()
    void loadLeaderboard()
    healthTimer = setInterval(() => { if (!serverOnline.value) void connectBackend() }, 2000)
  })
  onBeforeUnmount(() => {
    clearTimeout(pollTimer); clearInterval(healthTimer); clearInterval(chatTimer)
    toastTimers.forEach(timer => clearTimeout(timer)); toastTimers.clear()
  })

  return {
    tabs, page, authMode, authUsername, authPassword, authConfirmPassword, authError, authLoading, serverOnline, backendError, playerName, gold, level, xp, xpNeeded, message, player, combatStats, dps,
    enemyTier, highestEnemyTier, enemy, battleStarted, autoBattle, recovering, enemyLoading, recoveryRemaining, enemyLoadRemaining,
    heroHealth, enemyHealth, xpPercent, recoveryPercent, enemyLoadPercent, battleButtonLabel,
    woods, rocks, allResources, gearCatalog, slotLabels, gearSlots, shopUpgradeDetails, professions, jobs, inventory, sellPrices, resourceMastery,
    workers, workerPrice, workerAssignments, workerProgress, freeWorkers, equipment, ownedGear, gearSellPrices, shopUpgrades, achievements, craftingId, craftingProfession, craftingStats, factionDefinitions, alliedFaction, factions, dailyObjectives, dailyResetAt,
    craftFilter, filteredRecipes, storeListings, materialGroups, toasts,
    leaderboardCategory, leaderboardLabel, leaderboardRows, leaderboardLoading, leaderboardError,
    chatMessages, chatOnline, chatError,
    auctionListings, auctionError, offlineProgress,
    professionStats, professionXpNeeded, isUnlocked, effectiveDuration, canCraft, shopUpgradeCost, achievementProgress, formatBonus, gearTooltip, resourceTooltip, recipeTooltip,
    submitAuth, switchAuthMode, startBattle, changeEnemyTier, gather, craft, assignWorker, buyWorker, buyShopUpgrade, buyStoreGear, equipGear, toggleAutoBattle, sellItem, sellGear, allyFaction, dismissToast, dismissOfflineProgress, formatOfflineDuration, loadLeaderboard, sendChat, loadAuction, createAuction, buyAuction, cancelAuction,
  }
}
