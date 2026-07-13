<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGame } from './useGame'
import type { Skill } from './gameData'
import ChatPanel from './ChatPanel.vue'
import AuctionHouse from './AuctionHouse.vue'
import CraftingPage from './CraftingPage.vue'
import BattlePage from './BattlePage.vue'
import GameNavigation from './GameNavigation.vue'
import ShopPage from './ShopPage.vue'
import CraftingInventoryStats from './CraftingInventoryStats.vue'
import SalvageBuyer from './SalvageBuyer.vue'
import FactionsPage from './FactionsPage.vue'
import DailyObjectives from './DailyObjectives.vue'
import MetalDetectorPage from './MetalDetectorPage.vue'
import GameTutorial from './GameTutorial.vue'
import GoogleLoginButton from './GoogleLoginButton.vue'
import ClanPage from './ClanPage.vue'
import AboutPage from './AboutPage.vue'

const {
  tabs, page, authMode, authUsername, authPassword, authConfirmPassword, authError, authUsernameError, authLoading, sessionRestoring, serverOnline, backendError, googleClientId, playerName, playerTitle, gold, level, xp, xpNeeded, message, player, combatStats, dps,
  enemyTier, highestEnemyTier, encounterMode, defeatedBosses, bossDefinitions, currentBoss, enemy, battleStarted, autoBattle, selectedFood, autoEat, autoEatThreshold, autoEatCooldownRemaining, foodHealingPowerBonus, activeFoodHot, recovering, enemyLoading, recoveryRemaining, enemyLoadRemaining,
  heroHealth, enemyHealth, xpPercent, recoveryPercent, enemyLoadPercent, battleButtonLabel,
  woods, rocks, allResources, rareMaterials, gearCatalog, slotLabels, gearSlots, shopUpgradeDetails, professions, jobs, inventory, sellPrices,
  workers, workerPrice, workerAssignments, workerProgress, freeWorkers, equipment, ownedGear, gearSellPrices, shopUpgrades, achievements, craftingId,
  craftingProfession, craftingStats,
  factionDefinitions, alliedFaction, factions,
  dailyObjectives, dailyResetAt, metalDetector,
  craftingRecipes, battleFoods, recipeLevels, storeListings, materialGroups, toasts,
  leaderboardCategory, leaderboardLabel, leaderboardRows, leaderboardLoading, leaderboardError,
  chatMessages, chatOnline, chatError, clan, clanInvitations, publicClans, clanMessages, clanOnline, clanError, clanChatError, clanNotice, clanActionRunning, giftError, giftNotice, giftRunning,
  auctionListings, auctionError, offlineProgress,
  professionStats, professionXpNeeded, isUnlocked, shopUpgradeCost, achievementProgress, formatBonus, gearTooltip, resourceTooltip,
  submitAuth, switchAuthMode, loginWithGoogle, submitDisplayName, startBattle, setEncounterMode, changeEnemyTier, gather, craft, eatFood, selectFood, toggleAutoEat, assignWorker, buyWorker, buyShopUpgrade, buyStoreGear, equipGear, toggleAutoBattle, sellItem, sellGear, allyFaction, revealDetectorTile, startDetectorDrill, newDetectorSite, equipAchievementTitle, dismissToast, dismissOfflineProgress, formatOfflineDuration, loadLeaderboard, sendChat, loadClans, createClan, joinClan, inviteClanMember, acceptClanInvitation, declineClanInvitation, leaveClan, disbandClan, contributeToClan, sendGift, loadAuction, createAuction, buyAuction, cancelAuction,
  displayNameRequired, displayNameDraft, displayNameError, displayNameLoading,
} = useGame()

const craftingRecipeId = ref('')
const craftingRecipeView = ref<'all' | 'gear' | 'components'>('gear')
const craftingRecipeTrail = ref<string[]>([])

const toastIcons = {
  achievement: '★',
  critical: '✦',
  gift: '🎁',
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
  <div v-if="sessionRestoring" class="name-screen"><section class="name-card auth-card"><div class="crest">E</div><p class="eyebrow">WELCOME BACK</p><h1>Returning to Emberfall</h1><p class="auth-status" role="status">RESTORING YOUR ADVENTURE…</p></section></div>
  <div v-else-if="displayNameRequired" class="name-screen"><section class="name-card auth-card"><div class="crest">E</div><p class="eyebrow">DISPLAY NAME</p><h1>Choose your public name</h1><p>Use a unique nickname for the game and leaderboards. Your real Google name stays private.</p><input v-model="displayNameDraft" maxlength="18" placeholder="Enter a display name" aria-label="Display name" autocomplete="nickname" @keydown.enter.prevent="submitDisplayName" /><button class="primary" type="button" :disabled="displayNameLoading || !displayNameDraft.trim()" @click="submitDisplayName">{{ displayNameLoading ? 'SAVING…' : 'CONTINUE' }}</button><p v-if="displayNameError" class="auth-error" role="alert">{{ displayNameError }}</p></section></div>
  <div v-else-if="!playerName" class="name-screen"><section class="name-card auth-card"><div class="crest">E</div><p class="eyebrow">WELCOME TO EMBERFALL</p><h1>{{ authMode === 'login' ? 'Enter Emberfall' : 'Create your hero' }}</h1><p>{{ authMode === 'login' ? 'Log in to return to your adventure.' : 'Choose login details to begin your adventure.' }}</p><form class="auth-form" @submit.prevent="submitAuth"><label><span>USERNAME</span><input v-model="authUsername" minlength="3" maxlength="18" pattern="[A-Za-z0-9_-]{3,18}" autocomplete="username" placeholder="Username" required :aria-invalid="Boolean(authUsernameError)" :aria-describedby="authUsernameError ? 'auth-username-error' : undefined" /><small v-if="authUsernameError" id="auth-username-error" class="auth-field-error" role="alert">{{ authUsernameError }}</small></label><label><span>PASSWORD</span><input v-model="authPassword" type="password" minlength="8" :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'" placeholder="At least 8 characters" required /></label><label v-if="authMode === 'register'"><span>CONFIRM PASSWORD</span><input v-model="authConfirmPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Repeat your password" required /></label><button class="primary" type="submit" :disabled="authLoading || !serverOnline || authUsername.trim().length < 3 || authPassword.length < 8 || (authMode === 'register' && authConfirmPassword.length < 8)">{{ authLoading ? 'PLEASE WAIT…' : authMode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT' }}</button></form><button class="auth-mode-button" type="button" :disabled="authLoading" @click="switchAuthMode(authMode === 'login' ? 'register' : 'login')">{{ authMode === 'login' ? 'NEW HERE? REGISTER' : 'ALREADY HAVE AN ACCOUNT? LOG IN' }}</button><div class="auth-divider"><span>OR</span></div><GoogleLoginButton v-if="googleClientId" :client-id="googleClientId" :disabled="authLoading || !serverOnline" @credential="loginWithGoogle" @error="authError = $event" /><p v-else-if="serverOnline" class="auth-error" role="status">Google login is not configured. Set GOOGLE_CLIENT_ID for the backend service.</p><p v-if="authError" class="auth-error" role="alert">{{ authError }}</p><p v-if="!serverOnline" class="auth-error" role="status">{{ backendError }}</p><small class="session-note">You’ll stay logged in on this device. Passwords are never stored in your browser.</small></section></div>
  <main v-else class="game-shell" :class="{ 'high-scores-open': page === 'high scores', 'auction-open': page === 'auction', 'factions-open': page === 'factions' }">
    <div v-if="!serverOnline" class="backend-offline"><strong>SERVER OFFLINE</strong><span>{{ backendError }}</span></div>
    <header class="topbar"><div class="brand"><span class="brand-mark">E</span><span>EMBERFALL</span></div><div class="xp-area"><div class="xp-copy"><span>LEVEL {{ level }}</span><strong>{{ xp }} / {{ xpNeeded }} XP</strong></div><div class="xp-bar"><i :style="{ width: xpPercent }"></i></div></div><div class="wallet"><button type="button" class="tutorial-open" title="Open game tutorial" aria-label="Open game tutorial" @click="tutorialOpen = true">?</button> ◈ {{ gold.toLocaleString() }} <span>GOLD</span></div></header>
    <GameNavigation v-model="page" :available="tabs" />
    <div class="notice">{{ message }}</div>

    <BattlePage v-if="page === 'battle'" :encounter-mode="encounterMode" :current-boss="currentBoss" :bosses="bossDefinitions" :defeated-boss-ids="defeatedBosses" :defeated-bosses="defeatedBosses.length" :boss-total="bossDefinitions.length" :enemy-tier="enemyTier" :highest-enemy-tier="highestEnemyTier" :enemy="enemy" :enemy-loading="enemyLoading" :enemy-load-remaining="enemyLoadRemaining" :enemy-load-percent="enemyLoadPercent" :battle-started="battleStarted" :auto-battle="autoBattle" :auto-battle-unlocked="shopUpgrades.autoBattle > 0" :recovering="recovering" :recovery-percent="recoveryPercent" :level="level" :player-name="playerName" :player-title="playerTitle" :health="player.health" :hero-health="heroHealth" :enemy-health="enemyHealth" :combat-stats="combatStats" :battle-button-label="battleButtonLabel" :food-enabled="false" :foods="battleFoods" :selected-food="selectedFood" :active-food-hot="activeFoodHot" :auto-eat="autoEat" :auto-eat-unlocked="shopUpgrades.autoEat > 0" :auto-eat-threshold="autoEatThreshold" :auto-eat-cooldown-remaining="autoEatCooldownRemaining" :healing-power-bonus="foodHealingPowerBonus" @start="startBattle" @toggle-auto-battle="toggleAutoBattle" @change-tier="changeEnemyTier" @set-encounter-mode="setEncounterMode" @select-food="selectFood" @eat="eatFood" @toggle-auto-eat="toggleAutoEat" />

    <section v-else-if="page === 'woodcutting' || page === 'mining'" class="page-content">
      <div class="page-heading gathering-heading"><div><p class="eyebrow">GATHERING</p><h1>{{ page }}</h1><p>Choose a resource and start gathering.</p></div><div class="skill-progress-card" :class="page"><span>LEVEL {{ professions[page].level }}</span><strong>{{ professions[page].xp.toLocaleString() }} / {{ professionXpNeeded(page).toLocaleString() }} XP</strong></div></div>
      <div class="resource-grid"><article v-for="resource in page === 'woodcutting' ? woods : rocks" :key="resource.id" class="resource-card" :class="{ locked: !isUnlocked(resource) }" :style="{ '--accent': resource.color }" :title="resourceTooltip(resource)"><div class="resource-icon">{{ resource.icon }}</div><div><span class="tier">TIER {{ resource.tier }} · {{ resource.family }}</span><h3>{{ resource.name }}</h3><p>{{ resource.item }}</p></div><div class="action-area"><div class="meter" :class="{ critical: jobs[page]?.id === resource.id && jobs[page]?.critical }"><i :style="{ width: `${jobs[page]?.id === resource.id ? jobs[page]?.progress : 0}%` }"></i></div><button @click="gather(resource)" :disabled="!!jobs[page] || !isUnlocked(resource)">{{ !isUnlocked(resource) ? `SKILL LV ${resource.tier}` : jobs[page]?.id === resource.id ? `${jobs[page]?.critical ? 'CRIT · ' : ''}${Math.floor(jobs[page]?.progress || 0)}%` : page === 'woodcutting' ? 'CHOP' : 'MINE' }}</button></div><b class="owned">{{ inventory[resource.item] || 0 }} owned</b></article></div>
    </section>

    <CraftingPage v-else-if="page === 'crafting'" v-model:selected-id="craftingRecipeId" v-model:view="craftingRecipeView" v-model:trail="craftingRecipeTrail" :recipes="craftingRecipes" :inventory="inventory" :gear-catalog="gearCatalog" :equipment="equipment" :resources="allResources" :rare-materials="rareMaterials" :recipe-levels="recipeLevels" :crafting-id="craftingId" :profession="craftingProfession" :stats="craftingStats" @craft="craft" @navigate="page = $event" />

    <MetalDetectorPage v-else-if="page === 'metal detector'" :detector="metalDetector" :gold="gold" @reveal="revealDetectorTile" @drill="startDetectorDrill" @relocate="newDetectorSite" />

    <ClanPage v-else-if="page === 'clans'" :clan="clan" :invitations="clanInvitations" :public-clans="publicClans" :inventory="inventory" :error="clanError" :notice="clanNotice" :busy="clanActionRunning" :gift-error="giftError" :gift-notice="giftNotice" :gift-busy="giftRunning" @refresh="loadClans" @create="createClan" @join="joinClan" @invite="inviteClanMember" @accept="acceptClanInvitation" @decline="declineClanInvitation" @leave="leaveClan" @disband="disbandClan" @contribute="contributeToClan" @gift="sendGift" />

    <section v-else-if="page === 'workers'" class="page-content"><div class="page-heading"><div><p class="eyebrow">AUTOMATION</p><h1>Workers</h1><p>Workers use elapsed time and operate at exactly 20% of manual speed. Free Workers join at levels 2, 5, 10, 15, and every 5 levels after.</p></div><div class="worker-count">{{ freeWorkers }} FREE / {{ workers }} TOTAL</div></div><div v-if="!workers" class="empty-state">You have no Workers yet. Reach level 2 for a free Worker, or hire one in the Shop.</div><div class="worker-list"><article v-for="resource in allResources.filter(candidate => tabs.includes(candidate.skill))" :key="resource.id" class="worker-row" :class="{ locked: !isUnlocked(resource) }"><span class="resource-icon small">{{ resource.icon }}</span><div class="worker-resource"><h3>{{ resource.name }} <small>Tier {{ resource.tier }}</small></h3><div class="meter"><i :style="{ width: `${workerProgress[resource.id] || 0}%` }"></i></div></div><button @click="assignWorker(resource,-1)" :disabled="!(workerAssignments[resource.id] || 0)">−</button><strong>{{ workerAssignments[resource.id] || 0 }}</strong><button @click="assignWorker(resource,1)" :disabled="freeWorkers <= 0 || !isUnlocked(resource)">+</button></article></div></section>

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

    <AboutPage v-else-if="page === 'about'" />

    <ShopPage v-else :gold="gold" :workers="workers" :worker-price="workerPrice" :store-listings="storeListings" :upgrades="shopUpgradeDetails" :shop-upgrades="shopUpgrades" :crafting-busy="!!craftingId" :upgrade-cost="shopUpgradeCost" :gear-tooltip="gearTooltip" :format-bonus="formatBonus" @buy-worker="buyWorker" @buy-upgrade="buyShopUpgrade" @buy-gear="buyStoreGear">
      <SalvageBuyer :inventory="inventory" :prices="sellPrices" :gear="ownedGear.map(id => ({ id, name: gearCatalog[id].name, icon: gearCatalog[id].icon, equipped: equipment[gearCatalog[id].slot] === id, price: gearSellPrices[id] || 5 }))" @sell="sellItem" @sell-gear="sellGear" />
    </ShopPage>
  </main>
  <GameTutorial v-if="playerName && tutorialOpen" @complete="dismissTutorial" @skip="dismissTutorial" />
  <Teleport v-if="playerName && page === 'inventory'" defer to=".inventory-column:last-child">
    <CraftingInventoryStats :profession="craftingProfession" :stats="craftingStats" />
  </Teleport>
  <Teleport v-if="playerName && page === 'achievements'" defer to=".achievement-grid">
    <DailyObjectives :objectives="dailyObjectives" :reset-at="dailyResetAt" />
  </Teleport>
  <AuctionHouse v-if="playerName && page === 'auction'" :listings="auctionListings" :inventory="inventory" :gold="gold" :player-name="playerName" :error="auctionError" @refresh="loadAuction" @create="createAuction" @buy="buyAuction" @cancel="cancelAuction" />
  <FactionsPage v-if="playerName && page === 'factions'" :definitions="factionDefinitions" :progress="factions" :allied="alliedFaction" :level="level" @ally="allyFaction" />
  <ChatPanel v-if="playerName" :messages="chatMessages" :online="chatOnline" :error="chatError" :clan-messages="clanMessages" :clan-online="clanOnline" :clan-name="clan?.name || null" :clan-error="clanChatError" @send="sendChat" />
  <Teleport to="body">
    <div v-if="offlineProgress" class="offline-progress-backdrop" role="presentation" @click.self="dismissOfflineProgress">
      <section class="offline-progress" role="dialog" aria-modal="true" aria-labelledby="offline-progress-title">
        <div class="crest">E</div>
        <p class="eyebrow">WELCOME BACK · AWAY {{ formatOfflineDuration(offlineProgress.durationMs) }}</p>
        <h2 id="offline-progress-title">While you were away</h2>
        <p>Your workers and active tasks kept making progress.</p>
        <div v-if="offlineProgress.gold || offlineProgress.xp || offlineProgress.levels || offlineProgress.kills || offlineProgress.gathered || offlineProgress.crafted || offlineProgress.cooked" class="offline-totals">
          <div v-if="offlineProgress.gold"><span>Gold</span><strong>+{{ offlineProgress.gold.toLocaleString() }}</strong></div>
          <div v-if="offlineProgress.xp"><span>Player XP</span><strong>+{{ offlineProgress.xp.toLocaleString() }}</strong></div>
          <div v-if="offlineProgress.levels"><span>Levels</span><strong>+{{ offlineProgress.levels }}</strong></div>
          <div v-if="offlineProgress.kills"><span>Victories</span><strong>+{{ offlineProgress.kills }}</strong></div>
          <div v-if="offlineProgress.gathered"><span>Gathered</span><strong>+{{ offlineProgress.gathered.toLocaleString() }}</strong></div>
          <div v-if="offlineProgress.crafted"><span>Crafted</span><strong>+{{ offlineProgress.crafted.toLocaleString() }}</strong></div>
          <div v-if="offlineProgress.cooked"><span>Cooked</span><strong>+{{ offlineProgress.cooked.toLocaleString() }}</strong></div>
        </div>
        <div v-if="offlineProgress.items.length" class="offline-items">
          <h3>Items collected</h3>
          <p v-for="entry in offlineProgress.items" :key="entry.item"><span>{{ entry.item }}</span><strong>+{{ entry.quantity.toLocaleString() }}</strong></p>
        </div>
        <div v-if="offlineProgress.gear.length" class="offline-items">
          <h3>Gear acquired</h3>
          <p v-for="entry in offlineProgress.gear" :key="entry.id"><span>{{ entry.icon }} {{ entry.name }}</span><strong>NEW</strong></p>
        </div>
        <p v-if="!offlineProgress.items.length && !offlineProgress.gear.length && !offlineProgress.gold && !offlineProgress.xp && !offlineProgress.kills && !offlineProgress.gathered && !offlineProgress.crafted && !offlineProgress.cooked" class="offline-empty">No rewards were earned. Assign workers or leave a task active before signing out.</p>
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

      <button :class="{ selected: leaderboardCategory === 'clans' }" @click="loadLeaderboard('clans')">
        Clans
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
          <span>{{ player.name }}<small v-if="player.subtitle">{{ player.subtitle }}</small></span>
          <b>{{ player.score.toLocaleString() }}</b>
        </li>
      </ol>
    </div>
  </section>
</template>
