<script setup lang="ts">
import { nextTick, onMounted, onUpdated } from 'vue'
import { useGame } from './useGame'
import type { Skill } from './gameData'
import ChatPanel from './ChatPanel.vue'
import AuctionHouse from './AuctionHouse.vue'
import CraftingProgress from './CraftingProgress.vue'
import AutoBattleControl from './AutoBattleControl.vue'
import CraftingInventoryStats from './CraftingInventoryStats.vue'
import SalvageBuyer from './SalvageBuyer.vue'
import FactionsPage from './FactionsPage.vue'
import DailyObjectives from './DailyObjectives.vue'

const {
  tabs, page, authMode, authUsername, authPassword, authConfirmPassword, authError, authLoading, serverOnline, backendError, playerName, gold, level, xp, xpNeeded, message, player, combatStats, dps,
  enemyTier, highestEnemyTier, enemy, battleStarted, autoBattle, recovering, enemyLoading, recoveryRemaining, enemyLoadRemaining,
  heroHealth, enemyHealth, xpPercent, recoveryPercent, enemyLoadPercent, battleButtonLabel,
  woods, rocks, allResources, gearCatalog, slotLabels, gearSlots, shopUpgradeDetails, professions, jobs, inventory, sellPrices, resourceMastery,
  workers, workerPrice, workerAssignments, workerProgress, freeWorkers, equipment, ownedGear, gearSellPrices, shopUpgrades, achievements, craftingId,
  craftingProfession, craftingStats,
  factionDefinitions, alliedFaction, factions,
  dailyObjectives, dailyResetAt,
  craftFilter, filteredRecipes, storeListings, materialGroups, toasts,
  leaderboardCategory, leaderboardLabel, leaderboardRows, leaderboardLoading, leaderboardError,
  chatMessages, chatOnline, chatError,
  auctionListings, auctionError,
  professionStats, professionXpNeeded, isUnlocked, effectiveDuration, canCraft, shopUpgradeCost, achievementProgress, formatBonus, gearTooltip, resourceTooltip, recipeTooltip,
  submitAuth, switchAuthMode, startBattle, changeEnemyTier, gather, craft, assignWorker, buyWorker, buyShopUpgrade, buyStoreGear, equipGear, toggleAutoBattle, sellItem, sellGear, allyFaction, dismissToast, loadLeaderboard, sendChat, loadAuction, createAuction, buyAuction, cancelAuction,
} = useGame()

function refreshHoverTitles() {
  void nextTick(() => {
    const workerRewardText = document.querySelector<HTMLElement>('.worker-shop p')
    if (workerRewardText) workerRewardText.textContent = 'Assign workers to unlocked materials. Every 10 player levels awards one free worker.'
    document.querySelectorAll<HTMLElement>('.resource-card').forEach((card, index) => {
      const resources = page.value === 'woodcutting' ? woods.value : rocks.value
      if (resources[index]) card.title = resourceTooltip(resources[index])
    })
    document.querySelectorAll<HTMLElement>('.recipe-card').forEach((card, index) => {
      if (filteredRecipes.value[index]) card.title = recipeTooltip(filteredRecipes.value[index])
    })
    document.querySelectorAll<HTMLElement>('.equipment-slot').forEach((card, index) => {
      const id = equipment.value[gearSlots.value[index]]
      card.title = id ? gearTooltip(gearCatalog.value[id]) : `Empty ${slotLabels.value[gearSlots.value[index]]} slot`
    })
    document.querySelectorAll<HTMLElement>('.gear-bag article').forEach((card, index) => {
      const gear = gearCatalog.value[ownedGear.value[index]]
      if (gear) card.title = gearTooltip(gear)
    })
    document.querySelectorAll<HTMLElement>('.store-listing').forEach((card, index) => {
      const gear = storeListings.value[index]?.item
      if (gear) card.title = `${gearTooltip(gear)}\nPrice: ${storeListings.value[index].price.toLocaleString()} gold`
    })
  })
}

onMounted(refreshHoverTitles)
onUpdated(refreshHoverTitles)
</script>

<template>
  <div v-if="!playerName" class="name-screen"><form class="name-card auth-card" @submit.prevent="submitAuth"><div class="crest">E</div><p class="eyebrow">WELCOME TO EMBERFALL</p><h1>{{ authMode === 'login' ? 'Welcome back' : 'Create account' }}</h1><p>{{ authMode === 'login' ? 'Return to your adventure.' : 'Create your hero and begin a new tale.' }}</p><div class="auth-tabs"><button type="button" :class="{ selected: authMode === 'login' }" @click="switchAuthMode('login')">LOGIN</button><button type="button" :class="{ selected: authMode === 'register' }" @click="switchAuthMode('register')">REGISTER</button></div><input v-model="authUsername" maxlength="18" placeholder="Username" autocomplete="username" required><input v-model="authPassword" type="password" minlength="8" placeholder="Password (8+ characters)" :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'" required><input v-if="authMode === 'register'" v-model="authConfirmPassword" type="password" minlength="8" placeholder="Confirm password" autocomplete="new-password" required><p v-if="authError" class="auth-error" role="alert">{{ authError }}</p><p v-if="!serverOnline" class="auth-error" role="status">{{ backendError }}</p><button class="primary" :disabled="!serverOnline || authLoading || !authUsername.trim() || authPassword.length < 8 || (authMode === 'register' && authConfirmPassword !== authPassword)">{{ authLoading ? 'PLEASE WAIT…' : authMode === 'login' ? 'ENTER EMBERFALL' : 'CREATE HERO' }}</button></form></div>
  <main v-else class="game-shell" :class="{ 'high-scores-open': page === 'high scores', 'auction-open': page === 'auction', 'factions-open': page === 'factions' }">
    <div v-if="!serverOnline" class="backend-offline"><strong>SERVER OFFLINE</strong><span>{{ backendError }}</span></div>
    <header class="topbar"><div class="brand"><span class="brand-mark">E</span><span>EMBERFALL</span></div><div class="xp-area"><div class="xp-copy"><span>LEVEL {{ level }}</span><strong>{{ xp }} / {{ xpNeeded }} XP</strong></div><div class="xp-bar"><i :style="{ width: xpPercent }"></i></div></div><div class="wallet">◈ {{ gold.toLocaleString() }} <span>GOLD</span></div></header>
    <nav class="nav-tabs"><button v-for="tab in tabs" :key="tab" :class="{ selected: page === tab }" @click="page = tab">{{ tab }}</button></nav>
    <div class="notice">{{ message }}</div>

    <section v-if="page === 'battle'" class="battlefield" :class="{ active: battleStarted }">
      <div class="tier-selector"><button @click="changeEnemyTier(-1)" :disabled="enemyTier <= 1">−</button><div><span>ENEMY TIER</span><strong>{{ enemyTier }}</strong><small>Highest unlocked: {{ highestEnemyTier }}</small></div><button @click="changeEnemyTier(1)" :disabled="enemyTier >= highestEnemyTier">+</button></div>
      <article class="fighter"><div class="portrait hero-portrait">⚔</div><div class="fighter-info"><div class="eyebrow">YOUR HERO · LEVEL {{ level }}</div><h1>{{ playerName }}</h1><p class="title">Aspiring Adventurer</p><div class="bar-label"><span>{{ recovering ? 'RECOVERING HEALTH' : 'HEALTH' }}</span><strong>{{ player.health }} / {{ combatStats.maxHealth }}</strong></div><div class="meter health" :class="{ recovery: recovering }"><i :style="{ width: heroHealth }"></i></div><div v-if="recovering" class="combat-status"><span>Defeat recovery · {{ (combatStats.recoveryTime / 1000).toFixed(1) }}s</span><div class="meter"><i :style="{ width: recoveryPercent }"></i></div></div><div class="stats"><div><span>Attack</span><strong>{{ combatStats.attack }}</strong></div><div><span>Defense</span><strong>{{ combatStats.defense }}</strong></div><div><span>Attack speed</span><strong>{{ (combatStats.attackSpeed / 1000).toFixed(2) }}s</strong></div></div></div></article>
      <div class="versus"><span></span><b>VS</b><span></span></div>
      <article class="fighter enemy" :class="{ 'enemy-loading': enemyLoading }"><div class="fighter-info"><template v-if="enemyLoading"><div class="eyebrow danger">NEXT ENCOUNTER · TIER {{ enemyTier }}</div><h2>Loading enemy...</h2><p class="title">Preparing a new randomized opponent</p><div class="bar-label"><span>ENEMY LOAD PROGRESS</span><strong>{{ (enemyLoadRemaining / 1000).toFixed(1) }}s</strong></div><div class="meter health enemy-load-bar"><i :style="{ width: enemyLoadPercent }"></i></div><div class="loading-pips"><i></i><i></i><i></i></div></template><template v-else><div class="eyebrow danger">TIER {{ enemyTier }} · {{ enemy.archetype }}</div><h2>{{ enemy.name }}</h2><p class="title">Stats and archetype reroll each encounter</p><div class="bar-label"><span>HEALTH</span><strong>{{ Math.max(0, enemy.health) }} / {{ enemy.maxHealth }}</strong></div><div class="meter health enemy-bar"><i :style="{ width: enemyHealth }"></i></div><div class="stats"><div><span>Attack</span><strong>{{ enemy.attack }}</strong></div><div><span>Defense</span><strong>{{ enemy.defense }}</strong></div><div><span>Attack speed</span><strong>{{ (enemy.attackSpeed / 1000).toFixed(2) }}s</strong></div></div></template></div><div class="portrait enemy-portrait" :class="{ loading: enemyLoading }">{{ enemyLoading ? '···' : '☠' }}</div></article>
      <footer class="battle-controls"><button class="primary" @click="startBattle" :disabled="recovering || enemyLoading">{{ battleButtonLabel }}</button><small v-if="!enemyLoading">Tier reward: {{ enemy.xp }} XP · {{ enemy.gold }} gold · Victory unlocks the next tier</small><small>Base recovery: 10s · Base next-enemy load time: 2s · Both can be upgraded</small></footer>
    </section>

    <section v-else-if="page === 'woodcutting' || page === 'mining'" class="page-content">
      <div class="page-heading"><div><p class="eyebrow">GATHERING · LEVEL {{ professions[page].level }}</p><h1>{{ page }}</h1><p>One manual {{ page }} action can run at a time. Every action rolls its critical chance once.</p></div><div class="skill-xp">SKILL XP {{ professions[page].xp }} / {{ professionXpNeeded(page) }}</div></div>
      <div class="profession-stats"><div><span>Speed</span><strong>+{{ professionStats(page).speed }}%</strong><small>Shorter action interval</small></div><div><span>Yield</span><strong>{{ professionStats(page).yield }}</strong><small>Base items per action</small></div><div><span>Crit chance</span><strong>{{ professionStats(page).critChance.toFixed(1) }}%</strong><small>Faster, stronger action</small></div><div><span>Crit power</span><strong>{{ professionStats(page).critPower.toFixed(2) }}×</strong><small>Speed and yield multiplier</small></div><div><span>Fortune</span><strong>{{ professionStats(page).fortune }}%</strong><small>Chance to double yield</small></div><div><span>Precision</span><strong>{{ professionStats(page).precision.toFixed(1) }}%</strong><small>Chance for +1 material</small></div></div>
      <div class="resource-grid"><article v-for="resource in page === 'woodcutting' ? woods : rocks" :key="resource.id" class="resource-card" :class="{ locked: !isUnlocked(resource) }" :style="{ '--accent': resource.color }"><div class="resource-icon">{{ resource.icon }}</div><div><span class="tier">LEVEL {{ resource.tier }} · {{ resource.family }}</span><h3>{{ resource.name }}</h3><p>{{ resource.item }} · {{ effectiveDuration(resource).toFixed(1) }}s effective</p><small>Mastery {{ resourceMastery[resource.id] || 0 }} · +{{ Math.floor((resourceMastery[resource.id] || 0) / 10) }}% speed</small></div><div class="action-area"><div class="meter" :class="{ critical: jobs[page]?.id === resource.id && jobs[page]?.critical }"><i :style="{ width: `${jobs[page]?.id === resource.id ? jobs[page]?.progress : 0}%` }"></i></div><button @click="gather(resource)" :disabled="!!jobs[page] || !isUnlocked(resource)">{{ !isUnlocked(resource) ? `LEVEL ${resource.tier}` : jobs[page]?.id === resource.id ? `${jobs[page]?.critical ? 'CRIT · ' : ''}${Math.floor(jobs[page]?.progress || 0)}%` : page === 'woodcutting' ? 'CHOP' : 'MINE' }}</button></div><b class="owned">{{ inventory[resource.item] || 0 }} owned</b></article></div>
    </section>

    <section v-else-if="page === 'crafting'" class="page-content"><div class="page-heading"><div><p class="eyebrow">THE EXPANDED FORGE</p><h1>Crafting</h1><p>Components remain available, while every equipment path displays only its next unowned tier.</p></div></div><div class="filter-tabs"><button v-for="filter in (['all','components','tools','combat','accessories'] as const)" :key="filter" :class="{ selected: craftFilter === filter }" @click="craftFilter = filter">{{ filter }}</button></div><div class="recipe-grid"><article v-for="recipe in filteredRecipes" :key="recipe.id" class="recipe-card"><span class="tier">{{ recipe.category }} · {{ recipe.outputGear ? `NEXT TIER ${gearCatalog[recipe.outputGear].tier} GEAR` : `${recipe.outputQty || 1} OUTPUT` }}</span><h3>{{ recipe.name }}</h3><p>{{ recipe.description }}</p><div class="costs"><span v-for="(cost,item) in recipe.costs" :key="item" :class="{ missing: (inventory[item] || 0) < Number(cost) }">{{ item }} {{ inventory[item] || 0 }}/{{ cost }}</span></div><div class="meter"><i :style="{ width: `${recipe.progress}%` }"></i></div><button @click="craft(recipe)" :disabled="!!craftingId || !canCraft(recipe)">{{ recipe.outputGear && ownedGear.includes(recipe.outputGear) ? 'ALREADY CRAFTED' : craftingId === recipe.id ? `${Math.floor(recipe.progress)}% · CRAFTING` : `CRAFT · ${recipe.duration}s` }}</button></article></div></section>

    <section v-else-if="page === 'workers'" class="page-content"><div class="page-heading"><div><p class="eyebrow">AUTOMATION</p><h1>Workers</h1><p>Workers use elapsed time and operate at exactly 20% of manual speed.</p></div><div class="worker-count">{{ freeWorkers }} FREE / {{ workers }} TOTAL</div></div><div v-if="!workers" class="empty-state">You have no workers. Hire your first gatherer in the shop.</div><div class="worker-list"><article v-for="resource in allResources" :key="resource.id" class="worker-row" :class="{ locked: !isUnlocked(resource) }"><span class="resource-icon small">{{ resource.icon }}</span><div class="worker-resource"><h3>{{ resource.name }} <small>Lv. {{ resource.tier }}</small></h3><div class="meter"><i :style="{ width: `${workerProgress[resource.id] || 0}%` }"></i></div></div><button @click="assignWorker(resource,-1)" :disabled="!(workerAssignments[resource.id] || 0)">−</button><strong>{{ workerAssignments[resource.id] || 0 }}</strong><button @click="assignWorker(resource,1)" :disabled="freeWorkers <= 0 || !isUnlocked(resource)">+</button></article></div></section>

    <section v-else-if="page === 'inventory'" class="page-content inventory-page"><div class="page-heading"><div><p class="eyebrow">CHARACTER OVERVIEW</p><h1>Inventory</h1><p>All effective stats, equipped gear, crafted items, and gathered materials.</p></div></div><div class="inventory-layout"><div class="inventory-column"><h2>Equipment</h2><div class="equipment-grid"><article v-for="slot in gearSlots" :key="slot" class="equipment-slot"><span>{{ slotLabels[slot] }}</span><template v-if="equipment[slot]"><b>{{ gearCatalog[equipment[slot]!].icon }}</b><strong>{{ gearCatalog[equipment[slot]!].name }}</strong><small>Tier {{ gearCatalog[equipment[slot]!].tier }}</small></template><template v-else><b>＋</b><strong>Empty</strong></template></article></div><h2>Crafted gear</h2><div class="gear-bag"><article v-for="id in ownedGear" :key="id"><b>{{ gearCatalog[id].icon }}</b><div><strong>{{ gearCatalog[id].name }}</strong><small>{{ gearCatalog[id].description }}</small><em>{{ Object.entries(gearCatalog[id].bonuses).map(([stat,value]) => formatBonus(stat, Number(value))).join(' · ') || 'No bonuses' }}</em></div><button @click="equipGear(id)" :disabled="equipment[gearCatalog[id].slot] === id">{{ equipment[gearCatalog[id].slot] === id ? 'EQUIPPED' : 'EQUIP' }}</button></article></div></div><div class="inventory-column"><h2>Combat stats</h2><div class="detail-stats"><div><span>Maximum health</span><strong>{{ combatStats.maxHealth }}</strong></div><div><span>Attack</span><strong>{{ combatStats.attack }}</strong></div><div><span>Defense</span><strong>{{ combatStats.defense }}</strong></div><div><span>Attack interval</span><strong>{{ (combatStats.attackSpeed / 1000).toFixed(2) }}s</strong></div><div><span>Damage per second</span><strong>{{ dps }}</strong></div><div><span>Highest enemy tier</span><strong>{{ highestEnemyTier }}</strong></div><div><span>Death recovery</span><strong>{{ (combatStats.recoveryTime / 1000).toFixed(1) }}s</strong></div><div><span>Next-enemy load time</span><strong>{{ (combatStats.encounterDelay / 1000).toFixed(1) }}s</strong></div><div><span>Passive regeneration</span><strong>{{ combatStats.passiveRegen.toFixed(1) }} HP/s</strong></div></div><h2>Profession stats</h2><div v-for="skill in (['woodcutting','mining'] as Skill[])" :key="skill" class="skill-summary"><h3>{{ skill }} · Level {{ professions[skill].level }}</h3><div><span>Speed +{{ professionStats(skill).speed }}%</span><span>Yield {{ professionStats(skill).yield }}</span><span>Crit {{ professionStats(skill).critChance.toFixed(1) }}%</span><span>Power {{ professionStats(skill).critPower.toFixed(2) }}×</span><span>Fortune {{ professionStats(skill).fortune }}%</span></div></div></div></div><h2>Materials</h2><div class="material-groups"><article v-for="group in materialGroups" :key="group.name"><h3>{{ group.icon }} {{ group.name }}</h3><div v-if="group.items.length"><p v-for="([item,count]) in group.items" :key="item"><span>{{ item }}</span><strong>{{ count }}</strong></p></div><small v-else>Nothing gathered yet</small></article></div></section>

    <section v-else-if="page === 'achievements'" class="page-content"><div class="page-heading"><div><p class="eyebrow">THE CHRONICLE</p><h1>Achievements</h1><p>Milestones award gold automatically when completed.</p></div><div class="worker-count">{{ achievements.filter(a => a.unlocked).length }} / {{ achievements.length }} COMPLETE</div></div><div class="achievement-grid"><article v-for="achievement in achievements" :key="achievement.id" :class="{ unlocked: achievement.unlocked }"><b>{{ achievement.icon }}</b><div><span>{{ achievement.unlocked ? 'COMPLETED' : 'IN PROGRESS' }}</span><h3>{{ achievement.name }}</h3><p>{{ achievement.description }}</p><div class="meter"><i :style="{ width: `${achievementProgress(achievement) / achievement.goal * 100}%` }"></i></div><small>{{ achievementProgress(achievement) }} / {{ achievement.goal }}</small></div><strong>+{{ achievement.reward }} GOLD</strong></article></div></section>

    <section v-else class="page-content"><div class="page-heading"><div><p class="eyebrow">SETTLEMENT MARKET</p><h1>Shop</h1><p>Each equipment shelf displays only your next unowned tier. Buying or crafting it advances that shelf.</p></div></div><div class="shop-grid"><div class="equipment-store"><h2>Equipment merchant</h2><div class="store-shelves"><article v-for="listing in storeListings" :key="listing.id" class="store-listing"><template v-if="listing.item"><b>{{ listing.item.icon }}</b><div><span class="tier">{{ listing.name }} · NEXT TIER {{ listing.item.tier }}</span><h3>{{ listing.item.name }}</h3><p>{{ listing.item.description }}</p><small>{{ Object.entries(listing.item.bonuses).map(([stat,value]) => formatBonus(stat, Number(value))).join(' · ') }}</small></div><button @click="buyStoreGear(listing)" :disabled="gold < listing.price || !!craftingId">BUY · {{ listing.price.toLocaleString() }} GOLD</button></template><template v-else><b>✓</b><div><span class="tier">{{ listing.name }}</span><h3>All tiers owned</h3><p>This shelf is complete.</p></div><button disabled>SOLD OUT</button></template></article></div></div><article class="shop-card worker-shop"><div class="worker-art">♟</div><div><span class="tier">PERMANENT WORKER</span><h2>Hire a Gatherer</h2><p>Assign to any unlocked material. Level 2 and level 10 each award one free worker.</p><small>Owned: {{ workers }}</small></div><button class="primary" @click="buyWorker" :disabled="gold < workerPrice">HIRE · {{ workerPrice.toLocaleString() }} GOLD</button></article><article v-for="upgrade in shopUpgradeDetails" :key="upgrade.id" class="service-card"><b>{{ upgrade.icon }}</b><div><span class="tier">RANK {{ shopUpgrades[upgrade.id] }} / {{ upgrade.max }}</span><h3>{{ upgrade.name }}</h3><p>{{ upgrade.description }}</p></div><button @click="buyShopUpgrade(upgrade)" :disabled="shopUpgrades[upgrade.id] >= upgrade.max || gold < shopUpgradeCost(upgrade)">{{ shopUpgrades[upgrade.id] >= upgrade.max ? 'MAXIMUM RANK' : `UPGRADE · ${shopUpgradeCost(upgrade).toLocaleString()} GOLD` }}</button></article></div></section>
  </main>
  <AutoBattleControl v-if="playerName && page === 'battle'" :enabled="autoBattle" :unlocked="shopUpgrades.autoBattle > 0" :recovering="recovering" @toggle="toggleAutoBattle" />
  <CraftingProgress v-if="playerName && page === 'crafting'" :level="craftingProfession.level" :xp="craftingProfession.xp" :needed="craftingProfession.xpNeeded" />
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
  <ChatPanel v-if="playerName" :messages="chatMessages" :online="chatOnline" :error="chatError" @send="sendChat" />
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-stack" aria-live="polite">
      <article v-for="toast in toasts" :key="toast.id" class="toast-card" :class="toast.kind" @click="dismissToast(toast.id)">
        <b>{{ toast.kind === 'achievement' ? '★' : '✦' }}</b>
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
