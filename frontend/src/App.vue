<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGame } from './useGame'
import type { Skill } from './gameData'
import ChatPanel from './ChatPanel.vue'
import AuctionHouse from './AuctionHouse.vue'
import CraftingPage from './CraftingPage.vue'
import AutoBattleControl from './AutoBattleControl.vue'
import CraftingInventoryStats from './CraftingInventoryStats.vue'
import SalvageBuyer from './SalvageBuyer.vue'
import FactionsPage from './FactionsPage.vue'
import DailyObjectives from './DailyObjectives.vue'
import MetalDetectorPage from './MetalDetectorPage.vue'
import GameTutorial from './GameTutorial.vue'
import GoogleLoginButton from './GoogleLoginButton.vue'

const {
  tabs, page, authError, authLoading, serverOnline, backendError, googleClientId, playerName, playerTitle, gold, level, xp, xpNeeded, message, player, combatStats, dps,
  enemyTier, highestEnemyTier, enemy, battleStarted, autoBattle, recovering, enemyLoading, recoveryRemaining, enemyLoadRemaining,
  heroHealth, enemyHealth, xpPercent, recoveryPercent, enemyLoadPercent, battleButtonLabel,
  woods, rocks, allResources, rareMaterials, gearCatalog, slotLabels, gearSlots, shopUpgradeDetails, professions, jobs, inventory, sellPrices, resourceMastery,
  workers, workerPrice, workerAssignments, workerProgress, freeWorkers, equipment, ownedGear, gearSellPrices, shopUpgrades, achievements, craftingId,
  craftingProfession, craftingStats,
  factionDefinitions, alliedFaction, factions,
  dailyObjectives, dailyResetAt, metalDetector,
  craftingRecipes, recipeLevels, storeListings, materialGroups, toasts,
  leaderboardCategory, leaderboardLabel, leaderboardRows, leaderboardLoading, leaderboardError,
  chatMessages, chatOnline, chatError,
  auctionListings, auctionError, offlineProgress,
  professionStats, professionXpNeeded, isUnlocked, effectiveDuration, shopUpgradeCost, achievementProgress, formatBonus, gearTooltip, resourceTooltip,
  loginWithGoogle, startBattle, changeEnemyTier, gather, craft, assignWorker, buyWorker, buyShopUpgrade, buyStoreGear, equipGear, toggleAutoBattle, sellItem, sellGear, allyFaction, revealDetectorTile, startDetectorDrill, newDetectorSite, equipAchievementTitle, dismissToast, dismissOfflineProgress, formatOfflineDuration, loadLeaderboard, sendChat, loadAuction, createAuction, buyAuction, cancelAuction,
} = useGame()

const craftingRecipeId = ref('')
const craftingRecipeView = ref<'all' | 'gear' | 'components'>('gear')
const craftingRecipeTrail = ref<string[]>([])

const toastIcons = {
  achievement: '★',
  critical: '✦',
  level: '▲',
  rare: '◆',
  yield: '×',
  worker: '♟',
} as const

const tutorialOpen = ref(false)

function tutorialStorageKey(name: string) {
  return `emberfall-tutorial-v1:${name.trim().toLowerCase()}`
}

function dismissTutorial() {
  if (playerName.value) localStorage.setItem(tutorialStorageKey(playerName.value), 'complete')
  tutorialOpen.value = false
}

watch(playerName, name => {
  tutorialOpen.value = Boolean(name && localStorage.getItem(tutorialStorageKey(name)) !== 'complete')
}, { immediate: true })

</script>

<template>
  <div v-if="!playerName" class="name-screen"><section class="name-card auth-card"><div class="crest">E</div><p class="eyebrow">WELCOME TO EMBERFALL</p><h1>Enter Emberfall</h1><p>Continue with Google to create your hero or return to your adventure.</p><GoogleLoginButton v-if="googleClientId" :client-id="googleClientId" :disabled="authLoading || !serverOnline" @credential="loginWithGoogle" @error="authError = $event" /><p v-else-if="serverOnline" class="auth-error" role="status">Google login is not configured. Set GOOGLE_CLIENT_ID for the backend service.</p><p v-if="authLoading" class="auth-status" role="status">VERIFYING GOOGLE ACCOUNT…</p><p v-if="authError" class="auth-error" role="alert">{{ authError }}</p><p v-if="!serverOnline" class="auth-error" role="status">{{ backendError }}</p></section></div>
  <main v-else class="game-shell" :class="{ 'high-scores-open': page === 'high scores', 'auction-open': page === 'auction', 'factions-open': page === 'factions' }">
    <div v-if="!serverOnline" class="backend-offline"><strong>SERVER OFFLINE</strong><span>{{ backendError }}</span></div>
    <header class="topbar"><div class="brand"><span class="brand-mark">E</span><span>EMBERFALL</span></div><div class="xp-area"><div class="xp-copy"><span>LEVEL {{ level }}</span><strong>{{ xp }} / {{ xpNeeded }} XP</strong></div><div class="xp-bar"><i :style="{ width: xpPercent }"></i></div></div><div class="wallet"><button type="button" class="tutorial-open" title="Open game tutorial" aria-label="Open game tutorial" @click="tutorialOpen = true">?</button> ◈ {{ gold.toLocaleString() }} <span>GOLD</span></div></header>
    <nav class="nav-tabs"><button v-for="tab in tabs" :key="tab" :class="{ selected: page === tab }" @click="page = tab">{{ tab }}</button></nav>
    <div class="notice">{{ message }}</div>

    <section v-if="page === 'battle'" class="battlefield" :class="{ active: battleStarted }">
      <div class="tier-selector"><button @click="changeEnemyTier(-1)" :disabled="enemyTier <= 1">−</button><div><span>ENEMY TIER</span><strong>{{ enemyTier }}</strong><small>Highest unlocked: {{ highestEnemyTier }}</small></div><button @click="changeEnemyTier(1)" :disabled="enemyTier >= highestEnemyTier">+</button></div>
      <article class="fighter"><div class="portrait hero-portrait">⚔</div><div class="fighter-info"><div class="eyebrow">YOUR HERO · LEVEL {{ level }}</div><h1>{{ playerName }}</h1><p class="title">{{ playerTitle }}</p><div class="bar-label"><span>{{ recovering ? 'RECOVERING HEALTH' : 'HEALTH' }}</span><strong>{{ player.health }} / {{ combatStats.maxHealth }}</strong></div><div class="meter health" :class="{ recovery: recovering }"><i :style="{ width: heroHealth }"></i></div><div v-if="recovering" class="combat-status"><span>Defeat recovery · {{ (combatStats.recoveryTime / 1000).toFixed(1) }}s</span><div class="meter"><i :style="{ width: recoveryPercent }"></i></div></div><div class="stats"><div><span>Attack</span><strong>{{ combatStats.attack }}</strong></div><div><span>Defense</span><strong>{{ combatStats.defense }}</strong></div><div><span>Attack speed</span><strong>{{ (combatStats.attackSpeed / 1000).toFixed(2) }}s</strong></div></div></div></article>
      <div class="versus"><span></span><b>VS</b><span></span></div>
      <article class="fighter enemy" :class="{ 'enemy-loading': enemyLoading }"><div class="fighter-info"><template v-if="enemyLoading"><div class="eyebrow danger">NEXT ENCOUNTER · TIER {{ enemyTier }}</div><h2>Loading enemy...</h2><p class="title">Preparing a new randomized opponent</p><div class="bar-label"><span>ENEMY LOAD PROGRESS</span><strong>{{ (enemyLoadRemaining / 1000).toFixed(1) }}s</strong></div><div class="meter health enemy-load-bar"><i :style="{ width: enemyLoadPercent }"></i></div><div class="loading-pips"><i></i><i></i><i></i></div></template><template v-else><div class="eyebrow danger">TIER {{ enemyTier }} · {{ enemy.archetype }}</div><h2>{{ enemy.name }}</h2><p class="title">Stats and archetype reroll each encounter</p><div class="bar-label"><span>HEALTH</span><strong>{{ Math.max(0, enemy.health) }} / {{ enemy.maxHealth }}</strong></div><div class="meter health enemy-bar"><i :style="{ width: enemyHealth }"></i></div><div class="stats"><div><span>Attack</span><strong>{{ enemy.attack }}</strong></div><div><span>Defense</span><strong>{{ enemy.defense }}</strong></div><div><span>Attack speed</span><strong>{{ (enemy.attackSpeed / 1000).toFixed(2) }}s</strong></div></div></template></div><div class="portrait enemy-portrait" :class="{ loading: enemyLoading }">{{ enemyLoading ? '···' : '☠' }}</div></article>
      <footer class="battle-controls"><button class="primary" @click="startBattle" :disabled="recovering || enemyLoading">{{ battleButtonLabel }}</button><small v-if="!enemyLoading">Tier reward: {{ enemy.xp }} XP · {{ enemy.gold }} gold · Victory unlocks the next tier</small><small>Death recovery and next-enemy load time can both be upgraded</small></footer>
    </section>

    <section v-else-if="page === 'woodcutting' || page === 'mining'" class="page-content">
      <div class="page-heading gathering-heading"><div><p class="eyebrow">GATHERING SKILL</p><h1>{{ page }}</h1><p>Levels mainly improve speed. Critical harvests and bonus yield roll independently.</p></div><div class="skill-progress-card" :class="page"><div><span>{{ page }} level</span><strong>{{ professions[page].level }}</strong></div><small><b>{{ professions[page].xp.toLocaleString() }}</b> / {{ professionXpNeeded(page).toLocaleString() }} XP</small><div class="meter" role="progressbar" :aria-label="`${page} experience progress`" aria-valuemin="0" :aria-valuemax="professionXpNeeded(page)" :aria-valuenow="professions[page].xp"><i :style="{ width: `${Math.min(100, professions[page].xp / professionXpNeeded(page) * 100)}%` }"></i></div><p>{{ Math.max(0, professionXpNeeded(page) - professions[page].xp).toLocaleString() }} XP until level {{ professions[page].level + 1 }}</p></div></div>
      <div class="profession-stats"><div><span>Speed</span><strong>+{{ professionStats(page).speed.toFixed(1) }}%</strong><small>Every action takes less time</small></div><div><span>Bonus yield</span><strong>+{{ professionStats(page).bonusYieldPercent.toFixed(1) }}%</strong><small>Each 100% guarantees +1; the remainder can add one more</small></div><div><span>Crit chance</span><strong>{{ professionStats(page).critChance.toFixed(1) }}%</strong><small>Chance for a faster action</small></div><div><span>Crit power</span><strong>{{ professionStats(page).critPower.toFixed(2) }}×</strong><small>Action speed on a critical harvest</small></div></div>
      <div class="resource-grid"><article v-for="resource in page === 'woodcutting' ? woods : rocks" :key="resource.id" class="resource-card" :class="{ locked: !isUnlocked(resource) }" :style="{ '--accent': resource.color }" :title="resourceTooltip(resource)"><div class="resource-icon">{{ resource.icon }}</div><div><span class="tier">LEVEL {{ resource.tier }} · {{ resource.family }}</span><h3>{{ resource.name }}</h3><p>{{ resource.item }} · {{ effectiveDuration(resource).toFixed(1) }}s effective</p><small>Mastery {{ resourceMastery[resource.id] || 0 }} · +{{ Math.floor((resourceMastery[resource.id] || 0) / 10) }}% speed</small></div><div class="action-area"><div class="meter" :class="{ critical: jobs[page]?.id === resource.id && jobs[page]?.critical }"><i :style="{ width: `${jobs[page]?.id === resource.id ? jobs[page]?.progress : 0}%` }"></i></div><button @click="gather(resource)" :disabled="!!jobs[page] || !isUnlocked(resource)">{{ !isUnlocked(resource) ? `LEVEL ${resource.tier}` : jobs[page]?.id === resource.id ? `${jobs[page]?.critical ? 'CRIT · ' : ''}${Math.floor(jobs[page]?.progress || 0)}%` : page === 'woodcutting' ? 'CHOP' : 'MINE' }}</button></div><b class="owned">{{ inventory[resource.item] || 0 }} owned</b></article></div>
    </section>

    <CraftingPage v-else-if="page === 'crafting'" v-model:selected-id="craftingRecipeId" v-model:view="craftingRecipeView" v-model:trail="craftingRecipeTrail" :recipes="craftingRecipes" :inventory="inventory" :gear-catalog="gearCatalog" :equipment="equipment" :resources="allResources" :rare-materials="rareMaterials" :recipe-levels="recipeLevels" :crafting-id="craftingId" :profession="craftingProfession" :stats="craftingStats" @craft="craft" @navigate="page = $event" />

    <MetalDetectorPage v-else-if="page === 'metal detector'" :detector="metalDetector" :gold="gold" @reveal="revealDetectorTile" @drill="startDetectorDrill" @relocate="newDetectorSite" />

    <section v-else-if="page === 'workers'" class="page-content"><div class="page-heading"><div><p class="eyebrow">AUTOMATION</p><h1>Workers</h1><p>Workers use elapsed time and operate at exactly 20% of manual speed. Free gatherers join at levels 2, 5, 10, 15, and every 5 levels after.</p></div><div class="worker-count">{{ freeWorkers }} FREE / {{ workers }} TOTAL</div></div><div v-if="!workers" class="empty-state">You have no workers yet. Reach level 2 for a free gatherer, or hire one in the shop.</div><div class="worker-list"><article v-for="resource in allResources" :key="resource.id" class="worker-row" :class="{ locked: !isUnlocked(resource) }"><span class="resource-icon small">{{ resource.icon }}</span><div class="worker-resource"><h3>{{ resource.name }} <small>Lv. {{ resource.tier }}</small></h3><div class="meter"><i :style="{ width: `${workerProgress[resource.id] || 0}%` }"></i></div></div><button @click="assignWorker(resource,-1)" :disabled="!(workerAssignments[resource.id] || 0)">−</button><strong>{{ workerAssignments[resource.id] || 0 }}</strong><button @click="assignWorker(resource,1)" :disabled="freeWorkers <= 0 || !isUnlocked(resource)">+</button></article></div></section>

    <section v-else-if="page === 'inventory'" class="page-content inventory-page"><div class="page-heading"><div><p class="eyebrow">CHARACTER OVERVIEW</p><h1>Inventory</h1><p>All effective stats, equipped gear, crafted items, and gathered materials.</p></div></div><div class="inventory-layout"><div class="inventory-column"><h2>Equipment</h2><div class="equipment-grid"><article v-for="slot in gearSlots" :key="slot" class="equipment-slot" :title="equipment[slot] ? gearTooltip(gearCatalog[equipment[slot]!]) : `Empty ${slotLabels[slot]} slot`"><span>{{ slotLabels[slot] }}</span><template v-if="equipment[slot]"><b>{{ gearCatalog[equipment[slot]!].icon }}</b><strong>{{ gearCatalog[equipment[slot]!].name }}</strong><small>Tier {{ gearCatalog[equipment[slot]!].tier }}</small></template><template v-else><b>＋</b><strong>Empty</strong></template></article></div><h2>Crafted gear</h2><div class="gear-bag"><article v-for="id in ownedGear" :key="id" :title="gearTooltip(gearCatalog[id])"><b>{{ gearCatalog[id].icon }}</b><div><strong>{{ gearCatalog[id].name }}</strong><small>{{ gearCatalog[id].description }}</small><em>{{ Object.entries(gearCatalog[id].bonuses).map(([stat,value]) => formatBonus(stat, Number(value))).join(' · ') || 'No bonuses' }}</em></div><button @click="equipGear(id)" :disabled="equipment[gearCatalog[id].slot] === id">{{ equipment[gearCatalog[id].slot] === id ? 'EQUIPPED' : 'EQUIP' }}</button></article></div></div><div class="inventory-column"><h2>Combat stats</h2><div class="detail-stats"><div><span>Maximum health</span><strong>{{ combatStats.maxHealth }}</strong></div><div><span>Attack</span><strong>{{ combatStats.attack }}</strong></div><div><span>Defense</span><strong>{{ combatStats.defense }}</strong></div><div><span>Attack interval</span><strong>{{ (combatStats.attackSpeed / 1000).toFixed(2) }}s</strong></div><div><span>Damage per second</span><strong>{{ dps }}</strong></div><div><span>Highest enemy tier</span><strong>{{ highestEnemyTier }}</strong></div><div><span>Death recovery</span><strong>{{ (combatStats.recoveryTime / 1000).toFixed(1) }}s</strong></div><div><span>Next-enemy load time</span><strong>{{ (combatStats.encounterDelay / 1000).toFixed(1) }}s</strong></div><div><span>Passive regeneration</span><strong>{{ combatStats.passiveRegen.toFixed(1) }} HP/s</strong></div></div><h2>Profession stats</h2><div v-for="skill in (['woodcutting','mining'] as Skill[])" :key="skill" class="skill-summary"><h3>{{ skill }} · Level {{ professions[skill].level }}</h3><div><span>Speed +{{ professionStats(skill).speed.toFixed(1) }}%</span><span>Bonus yield +{{ professionStats(skill).bonusYieldPercent.toFixed(1) }}%</span><span>Crit chance {{ professionStats(skill).critChance.toFixed(1) }}%</span><span>Crit power {{ professionStats(skill).critPower.toFixed(2) }}×</span></div></div></div></div><h2>Materials</h2><div class="material-groups"><article v-for="group in materialGroups" :key="group.name"><h3>{{ group.icon }} {{ group.name }}</h3><div v-if="group.items.length"><p v-for="([item,count]) in group.items" :key="item"><span>{{ item }}</span><strong>{{ count }}</strong></p></div><small v-else>Nothing gathered yet</small></article></div></section>

    <section v-else-if="page === 'achievements'" class="page-content">
      <div class="page-heading"><div><p class="eyebrow">THE CHRONICLE</p><h1>Achievements</h1><p>Milestones award gold automatically. The hardest challenges also unlock equippable titles.</p></div><div class="worker-count">{{ achievements.filter(a => a.unlocked).length }} / {{ achievements.length }} COMPLETE</div></div>
      <div class="achievement-grid">
        <article v-for="achievement in achievements" :key="achievement.id" :class="{ unlocked: achievement.unlocked, 'has-title': achievement.titleReward, equipped: achievement.equipped }">
          <b>{{ achievement.icon }}</b>
          <div><span>{{ achievement.equipped ? 'TITLE EQUIPPED' : achievement.unlocked ? 'COMPLETED' : 'IN PROGRESS' }}</span><h3>{{ achievement.name }}</h3><p>{{ achievement.description }}</p><div class="meter"><i :style="{ width: `${achievementProgress(achievement) / achievement.goal * 100}%` }"></i></div><small>{{ achievementProgress(achievement).toLocaleString() }} / {{ achievement.goal.toLocaleString() }}</small></div>
          <aside class="achievement-rewards">
            <strong>+{{ achievement.reward.toLocaleString() }} GOLD</strong>
            <span v-if="achievement.titleReward">TITLE · “{{ achievement.titleReward }}”</span>
            <button v-if="achievement.titleReward && achievement.unlocked" type="button" :class="{ equipped: achievement.equipped }" @click="equipAchievementTitle(achievement.equipped ? null : achievement.id)">{{ achievement.equipped ? 'USE DEFAULT' : 'EQUIP TITLE' }}</button>
          </aside>
        </article>
      </div>
    </section>

    <section v-else class="page-content">
      <div class="page-heading"><div><p class="eyebrow">SETTLEMENT MARKET</p><h1>Shop</h1><p>Each equipment shelf displays only your next unowned tier. Buying or crafting it advances that shelf.</p></div></div>
      <div class="shop-grid">
        <div class="equipment-store">
          <h2>Equipment merchant</h2>
          <div class="store-shelves">
            <article v-for="listing in storeListings" :key="listing.id" class="store-listing" :title="listing.item ? `${gearTooltip(listing.item)}\nPrice: ${listing.price.toLocaleString()} gold` : `${listing.name}: all tiers owned`">
              <template v-if="listing.item"><b>{{ listing.item.icon }}</b><div><span class="tier">{{ listing.name }} · NEXT TIER {{ listing.item.tier }}</span><h3>{{ listing.item.name }}</h3><p>{{ listing.item.description }}</p><small>{{ Object.entries(listing.item.bonuses).map(([stat,value]) => formatBonus(stat, Number(value))).join(' · ') }}</small></div><button @click="buyStoreGear(listing)" :disabled="gold < listing.price || !!craftingId">BUY · {{ listing.price.toLocaleString() }} GOLD</button></template>
              <template v-else><b>✓</b><div><span class="tier">{{ listing.name }}</span><h3>All tiers owned</h3><p>This shelf is complete.</p></div><button disabled>SOLD OUT</button></template>
            </article>
          </div>
        </div>
        <article class="shop-card worker-shop"><div class="worker-art">♟</div><div><span class="tier">PERMANENT WORKER</span><h2>Hire a Gatherer</h2><p>Assign to any unlocked material. Free workers are awarded at levels 2, 5, 10, 15, and every 5 levels after.</p><small>Owned: {{ workers }} · Shop price increases by 500 gold per hire</small></div><button class="primary" @click="buyWorker" :disabled="gold < workerPrice">HIRE · {{ workerPrice.toLocaleString() }} GOLD</button></article>
        <article v-for="upgrade in shopUpgradeDetails" :key="upgrade.id" class="service-card"><b>{{ upgrade.icon }}</b><div><span class="tier">RANK {{ shopUpgrades[upgrade.id] }} / {{ upgrade.max }}</span><h3>{{ upgrade.name }}</h3><p>{{ upgrade.description }}</p></div><button @click="buyShopUpgrade(upgrade)" :disabled="shopUpgrades[upgrade.id] >= upgrade.max || gold < shopUpgradeCost(upgrade)">{{ shopUpgrades[upgrade.id] >= upgrade.max ? 'MAXIMUM RANK' : `UPGRADE · ${shopUpgradeCost(upgrade).toLocaleString()} GOLD` }}</button></article>
      </div>
    </section>
  </main>
  <GameTutorial v-if="playerName && tutorialOpen" @complete="dismissTutorial" @skip="dismissTutorial" />
  <AutoBattleControl v-if="playerName && page === 'battle'" :enabled="autoBattle" :unlocked="shopUpgrades.autoBattle > 0" :recovering="recovering" @toggle="toggleAutoBattle" />
  <Teleport v-if="playerName && page === 'inventory'" defer to=".inventory-column:last-child">
    <CraftingInventoryStats :profession="craftingProfession" :stats="craftingStats" />
  </Teleport>
  <Teleport v-if="playerName && page === 'shop'" defer to=".shop-grid">
    <SalvageBuyer :inventory="inventory" :prices="sellPrices" :gear="ownedGear.map(id => ({ id, name: gearCatalog[id].name, icon: gearCatalog[id].icon, equipped: equipment[gearCatalog[id].slot] === id, price: gearSellPrices[id] || 5 }))" @sell="sellItem" @sell-gear="sellGear" />
  </Teleport>
  <Teleport v-if="playerName && page === 'achievements'" defer to=".achievement-grid">
    <DailyObjectives :objectives="dailyObjectives" :reset-at="dailyResetAt" />
  </Teleport>
  <AuctionHouse v-if="playerName && page === 'auction'" :listings="auctionListings" :inventory="inventory" :gold="gold" :player-name="playerName" :error="auctionError" @refresh="loadAuction" @create="createAuction" @buy="buyAuction" @cancel="cancelAuction" />
  <FactionsPage v-if="playerName && page === 'factions'" :definitions="factionDefinitions" :progress="factions" :allied="alliedFaction" :level="level" @ally="allyFaction" />
  <ChatPanel v-if="playerName" :class="{ 'above-auto-battle': page === 'battle' && shopUpgrades.autoBattle > 0 }" :messages="chatMessages" :online="chatOnline" :error="chatError" @send="sendChat" />
  <Teleport to="body">
    <div v-if="offlineProgress" class="offline-progress-backdrop" role="presentation" @click.self="dismissOfflineProgress">
      <section class="offline-progress" role="dialog" aria-modal="true" aria-labelledby="offline-progress-title">
        <div class="crest">E</div>
        <p class="eyebrow">WELCOME BACK · AWAY {{ formatOfflineDuration(offlineProgress.durationMs) }}</p>
        <h2 id="offline-progress-title">While you were away</h2>
        <p>Your workers and active tasks kept making progress.</p>
        <div v-if="offlineProgress.gold || offlineProgress.xp || offlineProgress.levels || offlineProgress.kills || offlineProgress.gathered || offlineProgress.crafted" class="offline-totals">
          <div v-if="offlineProgress.gold"><span>Gold</span><strong>+{{ offlineProgress.gold.toLocaleString() }}</strong></div>
          <div v-if="offlineProgress.xp"><span>Player XP</span><strong>+{{ offlineProgress.xp.toLocaleString() }}</strong></div>
          <div v-if="offlineProgress.levels"><span>Levels</span><strong>+{{ offlineProgress.levels }}</strong></div>
          <div v-if="offlineProgress.kills"><span>Victories</span><strong>+{{ offlineProgress.kills }}</strong></div>
          <div v-if="offlineProgress.gathered"><span>Gathered</span><strong>+{{ offlineProgress.gathered.toLocaleString() }}</strong></div>
          <div v-if="offlineProgress.crafted"><span>Crafted</span><strong>+{{ offlineProgress.crafted.toLocaleString() }}</strong></div>
        </div>
        <div v-if="offlineProgress.items.length" class="offline-items">
          <h3>Items collected</h3>
          <p v-for="entry in offlineProgress.items" :key="entry.item"><span>{{ entry.item }}</span><strong>+{{ entry.quantity.toLocaleString() }}</strong></p>
        </div>
        <div v-if="offlineProgress.gear.length" class="offline-items">
          <h3>Gear acquired</h3>
          <p v-for="entry in offlineProgress.gear" :key="entry.id"><span>{{ entry.icon }} {{ entry.name }}</span><strong>NEW</strong></p>
        </div>
        <p v-if="!offlineProgress.items.length && !offlineProgress.gear.length && !offlineProgress.gold && !offlineProgress.xp && !offlineProgress.kills && !offlineProgress.gathered && !offlineProgress.crafted" class="offline-empty">No rewards were earned. Assign workers or leave a task active before signing out.</p>
        <button class="primary" autofocus @click="dismissOfflineProgress">CONTINUE</button>
      </section>
    </div>
  </Teleport>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-stack" aria-live="polite">
      <article v-for="toast in toasts" :key="toast.id" class="toast-card" :class="toast.kind" @click="dismissToast(toast.id)">
        <b>{{ toastIcons[toast.kind] }}</b>
        <div><span>{{ toast.kind }}</span><strong>{{ toast.title }}</strong><small>{{ toast.detail }}</small></div>
      </article>
    </TransitionGroup>
  </Teleport>

  <section v-if="playerName && page === 'high scores'" class="leaderboard leaderboard-page">
    <h2>High Scores</h2>

    <div class="leaderboard-tabs">
      <button :class="{ selected: leaderboardCategory === 'level' }" @click="loadLeaderboard('level')">
        Player Level
      </button>

      <button :class="{ selected: leaderboardCategory === 'gold' }" @click="loadLeaderboard('gold')">
        Gold
      </button>

      <button :class="{ selected: leaderboardCategory === 'woodcutting' }" @click="loadLeaderboard('woodcutting')">
        Woodcutting
      </button>

      <button :class="{ selected: leaderboardCategory === 'mining' }" @click="loadLeaderboard('mining')">
        Mining
      </button>

      <button :class="{ selected: leaderboardCategory === 'kills' }" @click="loadLeaderboard('kills')">
        Kills
      </button>
      <button :class="{ selected: leaderboardCategory === 'gathered' }" @click="loadLeaderboard('gathered')">
        Gathered
      </button>
      <button :class="{ selected: leaderboardCategory === 'crafted' }" @click="loadLeaderboard('crafted')">
        Crafted
      </button>
      <button :class="{ selected: leaderboardCategory === 'clicks' }" @click="loadLeaderboard('clicks')">
        Actions
      </button>
    </div>

    <p v-if="leaderboardLoading">
      Loading leaderboard...
    </p>

    <p v-else-if="leaderboardError">
      {{ leaderboardError }}
    </p>

    <div v-else>
      <h3>{{ leaderboardLabel }}</h3>

      <ol>
        <li
          v-for="player in leaderboardRows"
          :key="player.username"
        >
          <strong>#{{ player.rank }}</strong>
          <span>{{ player.name }}</span>
          <b>{{ player.score.toLocaleString() }}</b>
        </li>
      </ol>
    </div>
  </section>
</template>
