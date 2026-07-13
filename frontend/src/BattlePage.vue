<script setup lang="ts">
import type { BossDefinition } from './gameData'

type Food = { item: string; name: string; icon: string; healing: number; hotHealing: number; hotDuration: number; owned: number }
type CombatStats = { maxHealth: number }
type Enemy = { name: string; archetype: string; health: number; maxHealth: number; xp: number; gold: number }

const props = defineProps<{
  encounterMode: 'normal' | 'boss'
  currentBoss?: BossDefinition
  bosses: BossDefinition[]
  defeatedBossIds: string[]
  defeatedBosses: number
  bossTotal: number
  enemyTier: number
  highestEnemyTier: number
  enemy: Enemy
  enemyLoading: boolean
  enemyLoadRemaining: number
  enemyLoadPercent: string
  battleStarted: boolean
  autoBattle: boolean
  autoBattleUnlocked: boolean
  recovering: boolean
  recoveryPercent: string
  level: number
  playerName: string
  playerTitle: string
  health: number
  heroHealth: string
  enemyHealth: string
  combatStats: CombatStats
  battleButtonLabel: string
  foodEnabled: boolean
  foods: Food[]
  selectedFood: string | null
  activeFoodHot: { item: string; remainingHealing: number; remaining: number; stacks: number } | null
  autoEat: boolean
  autoEatUnlocked: boolean
  autoEatThreshold: number
  autoEatCooldownRemaining: number
  healingPowerBonus: number
}>()

const emit = defineEmits<{
  start: []
  'toggle-auto-battle': [enabled: boolean]
  'change-tier': [change: number]
  'set-encounter-mode': [mode: 'normal' | 'boss']
  'select-food': [item: string | null]
  eat: [item: string]
  'toggle-auto-eat': [enabled: boolean]
}>()

function selectFood(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('select-food', value || null)
}

function selectedFoodDetails() {
  return props.foods.find(food => food.item === props.selectedFood)
}

function bossProgressLabel(boss: BossDefinition) {
  if (props.defeatedBossIds.includes(boss.id)) return boss.unlockName ? `${boss.unlockName} open` : 'Challenge cleared'
  if (props.currentBoss?.id === boss.id) return boss.unlockName ? `Next · unlocks ${boss.unlockName}` : 'Next mastery challenge'
  return boss.unlockName ? `Locked · ${boss.unlockName}` : 'Locked challenge'
}
</script>

<template>
  <section class="battle-page" :class="{ active: battleStarted, 'boss-mode': encounterMode === 'boss' }">
    <header class="encounter-console">
      <div class="encounter-modes" aria-label="Encounter type">
        <button type="button" :class="{ selected: encounterMode === 'normal' }" @click="emit('set-encounter-mode', 'normal')"><b>⚔</b><span>Normal enemies<small>Advance enemy tiers</small></span></button>
        <button type="button" :class="{ selected: encounterMode === 'boss' }" @click="emit('set-encounter-mode', 'boss')"><b>{{ currentBoss?.icon || '♛' }}</b><span>Area boss<small>{{ currentBoss?.name || 'All defeated' }}</small></span></button>
      </div>
      <div v-if="encounterMode === 'normal'" class="tier-selector compact-tier">
        <button type="button" aria-label="Previous enemy tier" :disabled="enemyTier <= 1" @click="emit('change-tier', -1)">−</button>
        <div><span>ENEMY TIER</span><strong>{{ enemyTier }}</strong><small>Highest {{ highestEnemyTier }}</small></div>
        <button type="button" aria-label="Next enemy tier" :disabled="enemyTier >= highestEnemyTier" @click="emit('change-tier', 1)">+</button>
      </div>
      <div v-else class="boss-objective"><span>{{ defeatedBosses >= bossTotal ? 'BOSS PATH COMPLETE' : currentBoss?.unlockName ? 'NEXT BOSS UNLOCK' : 'MASTERY CHALLENGE' }}</span><strong>{{ defeatedBosses >= bossTotal ? 'All bosses defeated' : currentBoss?.unlockName || 'Future unlock coming later' }}</strong><small>{{ defeatedBosses }} / {{ bossTotal }} bosses defeated</small></div>
    </header>

    <div v-if="encounterMode === 'boss' && currentBoss" class="boss-brief">
      <b>{{ currentBoss.icon }}</b><div><span>AREA BOSS · POWER TIER {{ currentBoss.tier }}</span><strong>{{ currentBoss.name }} · {{ currentBoss.title }}</strong><p>{{ currentBoss.description }}</p></div><aside>{{ defeatedBosses >= bossTotal ? 'FINAL BOSS' : currentBoss.unlockName ? 'UNLOCKS' : 'CURRENT REWARD' }}<strong>{{ defeatedBosses >= bossTotal ? 'Rematch' : currentBoss.unlockName || 'XP & gold' }}</strong></aside>
    </div>
    <details v-if="encounterMode === 'boss'" class="boss-path">
      <summary>VIEW ALL 10 AREA BOSSES <span>{{ defeatedBosses }} / {{ bossTotal }} DEFEATED</span></summary>
      <div><article v-for="boss in bosses" :key="boss.id" :class="{ defeated: defeatedBossIds.includes(boss.id), current: currentBoss?.id === boss.id && defeatedBosses < bossTotal, locked: !defeatedBossIds.includes(boss.id) && currentBoss?.id !== boss.id }"><b>{{ boss.icon }}</b><span>POWER TIER {{ boss.tier }}</span><strong>{{ boss.name }}</strong><small>{{ bossProgressLabel(boss) }}</small></article></div>
    </details>

    <div class="combatants">
      <article class="combatant hero-card">
        <header><div class="combatant-icon hero-icon">⚔</div><div><span>YOUR HERO · LEVEL {{ level }}</span><h1>{{ playerName }}</h1><p>{{ playerTitle }}</p></div></header>
        <div class="health-label"><span>{{ recovering ? 'RECOVERING HEALTH' : 'HEALTH' }}</span><strong>{{ health }} / {{ combatStats.maxHealth }}</strong></div>
        <div class="meter health" :class="{ recovery: recovering }"><i :style="{ width: heroHealth }"></i></div>
        <div v-if="recovering" class="recovery-line"><span>Defeat recovery</span><div class="meter"><i :style="{ width: recoveryPercent }"></i></div></div>

        <section v-if="foodEnabled" class="food-dock">
          <div><label for="battle-food">FOOD</label><select id="battle-food" :value="selectedFood || ''" @change="selectFood"><option value="">Select food</option><option v-for="food in foods" :key="food.item" :value="food.item">{{ food.icon }} {{ food.name }} · {{ food.owned }} owned · +{{ food.healing }} HP{{ food.hotHealing ? ` · HoT +${food.hotHealing}/${food.hotDuration}s` : '' }}</option></select></div>
          <button type="button" :disabled="!selectedFood || !selectedFoodDetails()?.owned || (health >= combatStats.maxHealth && !selectedFoodDetails()?.hotHealing) || recovering" @click="selectedFood && emit('eat', selectedFood)">EAT <span v-if="selectedFoodDetails()">+{{ selectedFoodDetails()?.healing }} HP</span></button>
          <button v-if="autoEatUnlocked" type="button" class="auto-eat" :class="{ enabled: autoEat }" @click="emit('toggle-auto-eat', !autoEat)"><span>AUTO-EAT</span><b>{{ autoEat ? 'ON' : 'OFF' }}</b></button>
        </section>
        <template v-if="foodEnabled">
          <small v-if="selectedFoodDetails()?.hotHealing" class="food-hot-note">HOT · +{{ selectedFoodDetails()?.hotHealing }} health over {{ selectedFoodDetails()?.hotDuration }}s · additional meals stack duration</small>
          <small v-if="activeFoodHot" class="food-hot-active">✦ REGENERATING · {{ activeFoodHot.remainingHealing }} health queued over {{ (activeFoodHot.remaining / 1000).toFixed(1) }}s<span v-if="activeFoodHot.stacks > 1"> · {{ activeFoodHot.stacks }} stacks</span></small>
          <small v-if="autoEatUnlocked && autoEat" class="auto-eat-note">Uses selected food below {{ autoEatThreshold }}% health<span v-if="autoEatCooldownRemaining"> · ready in {{ (autoEatCooldownRemaining / 1000).toFixed(1) }}s</span></small>
          <small v-else-if="healingPowerBonus" class="auto-eat-note">Food healing +{{ healingPowerBonus }}% from Shop upgrades</small>
        </template>

      </article>

      <div class="versus-mark">VS</div>

      <article class="combatant enemy-card" :class="{ loading: enemyLoading }">
        <header><div><span>{{ encounterMode === 'boss' ? 'AREA BOSS' : `TIER ${enemyTier}` }} · {{ enemy.archetype || 'ENCOUNTER' }}</span><h2>{{ enemyLoading ? (encounterMode === 'boss' ? 'Summoning boss…' : 'Loading enemy…') : enemy.name }}</h2><p>{{ encounterMode === 'boss' ? currentBoss?.title : 'Stats and archetype reroll each encounter' }}</p></div><div class="combatant-icon enemy-icon">{{ enemyLoading ? '···' : encounterMode === 'boss' ? currentBoss?.icon : '☠' }}</div></header>
        <template v-if="enemyLoading">
          <div class="health-label"><span>ENCOUNTER LOAD</span><strong>{{ (enemyLoadRemaining / 1000).toFixed(1) }}s</strong></div><div class="meter health enemy-load"><i :style="{ width: enemyLoadPercent }"></i></div>
        </template>
        <template v-else>
          <div class="health-label"><span>HEALTH</span><strong>{{ Math.max(0, enemy.health) }} / {{ enemy.maxHealth }}</strong></div><div class="meter health enemy-health"><i :style="{ width: enemyHealth }"></i></div>
          <footer><span>VICTORY REWARD</span><strong>{{ enemy.xp }} XP · {{ enemy.gold }} gold</strong></footer>
        </template>
      </article>
    </div>

    <footer class="battle-action">
      <div><button type="button" class="primary" :disabled="recovering || enemyLoading" @click="emit('start')">{{ battleButtonLabel }}</button><button v-if="encounterMode === 'normal' && autoBattleUnlocked" type="button" class="inline-auto-battle" :class="{ enabled: autoBattle }" :disabled="recovering" @click="emit('toggle-auto-battle', !autoBattle)"><span>AUTO-BATTLE</span><b>{{ autoBattle ? 'ON' : 'OFF' }}</b></button></div>
      <small v-if="encounterMode === 'normal'">Win to unlock the next enemy tier.</small>
      <small v-else>{{ defeatedBosses >= bossTotal ? 'All current bosses are defeated. Rematch the final boss for its XP and gold reward.' : currentBoss?.unlockName ? `Defeat this boss to open ${currentBoss.unlockName}.` : 'This mastery boss currently rewards XP and gold; more boss unlocks can be added later.' }}</small>
    </footer>
  </section>
</template>

<style scoped>
.battle-page{width:min(1180px,100%);margin:auto;padding:24px clamp(16px,4vw,48px) 115px}.encounter-console{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;gap:10px;margin-bottom:14px}.encounter-modes{display:grid;grid-template-columns:repeat(2,minmax(160px,240px));gap:6px}.encounter-modes button{min-height:59px;padding:9px 13px;display:flex;align-items:center;gap:11px;border:1px solid #ffffff11;color:#777a80;background:#ffffff03;text-align:left;cursor:pointer}.encounter-modes button>b{width:28px;color:#98753e;font-size:20px;text-align:center}.encounter-modes button span,.encounter-modes button small{display:block}.encounter-modes button span{font:700 10px Cinzel}.encounter-modes button small{margin-top:3px;color:#5f6268;font:500 8px Inter}.encounter-modes button.selected{border-color:#d5a54e66;color:#edc26a;background:#d5a54e0d}.encounter-modes button.selected>b{color:#e1ae53}.compact-tier{width:225px;margin:0;padding:5px;grid-template-columns:38px 1fr 38px;background:#090a0e}.compact-tier>div strong{font-size:20px}.boss-objective{min-width:220px;padding:9px 14px;border:1px solid #a8584d55;background:#a8584d0a;text-align:right}.boss-objective span,.boss-objective strong,.boss-objective small{display:block}.boss-objective span{color:#a85b50;font-size:7px;font-weight:800;letter-spacing:.13em}.boss-objective strong{margin:4px 0;color:#e0a397;font:700 15px Cinzel}.boss-objective small{color:#706566;font-size:8px}.boss-brief{margin-bottom:8px;padding:11px 15px;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:12px;border:1px solid #a9554855;background:linear-gradient(110deg,#a9554813,transparent)}.boss-brief>b{font-size:29px}.boss-brief span,.boss-brief strong{display:block}.boss-brief span,.boss-brief aside{color:#a95f54;font-size:7px;font-weight:800;letter-spacing:.12em}.boss-brief>div>strong{margin:3px 0;color:#dcb0a7;font:700 12px Cinzel}.boss-brief p{margin:0;color:#77777c;font-size:9px}.boss-brief aside{text-align:right}.boss-brief aside strong{margin-top:4px;color:#e3b0a4;font:700 11px Cinzel}.boss-path{margin-bottom:12px;border:1px solid #ffffff0d;background:#090a0d}.boss-path summary{padding:8px 11px;color:#91645d;font-size:7px;font-weight:800;letter-spacing:.11em;cursor:pointer}.boss-path summary span{float:right;color:#65666b}.boss-path>div{padding:7px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;border-top:1px solid #ffffff0d}.boss-path article{min-width:0;padding:7px;border:1px solid #ffffff0c;background:#ffffff02}.boss-path article>b{float:left;margin-right:6px;font-size:18px}.boss-path article span,.boss-path article strong,.boss-path article small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.boss-path article span{color:#5f6065;font-size:6px}.boss-path article strong{margin-top:2px;color:#797b80;font:700 8px Cinzel}.boss-path article small{margin-top:3px;color:#55575c;font-size:6px}.boss-path article.current{border-color:#b15e5266;background:#b15e520b}.boss-path article.current strong,.boss-path article.current small{color:#d19b91}.boss-path article.defeated{border-color:#608a6655;background:#608a6608}.boss-path article.defeated strong{color:#8fb394}.boss-path article.locked{opacity:.55}.combatants{display:grid;grid-template-columns:minmax(0,1fr) 34px minmax(0,1fr);align-items:stretch}.combatant{min-width:0;padding:20px;border:1px solid #ffffff11;background:linear-gradient(145deg,#111318cc,#090a0dcc);box-shadow:0 18px 55px #0004}.combatant>header{min-height:61px;display:flex;align-items:center;gap:13px}.combatant>header>div:nth-child(2),.enemy-card>header>div:first-child{min-width:0;flex:1}.combatant header span{color:#b58a45;font-size:7px;font-weight:800;letter-spacing:.13em}.combatant h1,.combatant h2{margin:3px 0;color:#e8dfcd;font-size:clamp(19px,2.2vw,28px);line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-transform:none}.combatant header p{margin:0;color:#777980;font:600 9px Cinzel;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.combatant-icon{width:52px;height:52px;flex:0 0 52px;display:grid;place-items:center;border:1px solid #d5a54e38;border-radius:50%;background:#d5a54e09;font-size:27px}.enemy-card{text-align:right}.enemy-card>header{justify-content:flex-end}.enemy-card header span{color:#b75c50}.enemy-icon{border-color:#b75c5044;background:#b75c5009}.health-label{margin:17px 0 6px;display:flex;justify-content:space-between;color:#818389;font-size:8px;font-weight:700;letter-spacing:.1em}.health{height:12px}.enemy-health i{margin-left:auto;background:linear-gradient(90deg,#7f211d,#c74e3d);box-shadow:0 0 10px #a53329}.enemy-load i{margin-left:auto;background:linear-gradient(90deg,#63302b,#c35b4c)}.recovery-line{margin-top:8px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px;color:#756d61;font-size:7px}.recovery-line .meter{height:6px}.food-dock{margin-top:14px;padding:8px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:end;gap:6px;border:1px solid #d5a54e2e;background:#d5a54e07}.food-dock label{display:block;margin-bottom:4px;color:#9b753d;font-size:7px;font-weight:800;letter-spacing:.12em}.food-dock select{width:100%;height:34px;min-width:0;padding:0 8px;border:1px solid #ffffff16;color:#d7d7d5;background:#08090c;font-size:9px}.food-dock>button{height:34px;padding:0 12px;border:1px solid #d5a54e77;color:#e7bd68;background:#d5a54e0d;font:800 8px Cinzel;white-space:nowrap;cursor:pointer}.food-dock>button>span{font:600 7px Inter}.food-dock>button.auto-eat{display:grid;place-items:center;padding:0 9px;border-color:#ffffff18;color:#777}.food-dock>button.auto-eat span{font-size:6px}.food-dock>button.auto-eat b{font-size:8px}.food-dock>button.auto-eat.enabled{border-color:#6eaa7766;color:#96cc9d;background:#6eaa770d}.auto-eat-note{display:block;margin-top:5px;color:#777;font-size:7px}.combat-stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:13px;border:1px solid #ffffff0d}.combat-stats div{padding:8px;display:flex;justify-content:space-between;gap:5px;border-right:1px solid #ffffff0d}.combat-stats div:last-child{border:0}.combat-stats span{color:#676a70;font-size:7px;text-transform:uppercase}.combat-stats strong{font:700 10px Cinzel}.enemy-card>footer{margin-top:11px;display:flex;justify-content:space-between;color:#76787d;font-size:7px;letter-spacing:.08em}.enemy-card>footer strong{color:#bc9250}.versus-mark{z-index:1;align-self:center;width:44px;height:44px;margin-left:-5px;display:grid;place-items:center;border:1px solid #ffffff16;border-radius:50%;color:#777;background:#0a0b0f;font:700 10px Cinzel}.battle-action{padding-top:16px;text-align:center}.battle-action>div{display:flex;justify-content:center;gap:7px}.battle-action .primary{min-width:260px}.inline-auto-battle{min-width:105px;padding:7px 12px;border:1px solid #ffffff1b;color:#777;background:#ffffff05;font:700 8px Cinzel;cursor:pointer}.inline-auto-battle span,.inline-auto-battle b{display:block}.inline-auto-battle b{margin-top:3px}.inline-auto-battle.enabled{border-color:#d5a54e66;color:#e5b55d;background:#d5a54e0d}.battle-action small{display:block;margin-top:7px;color:#707278;font-size:8px}.boss-mode .battle-action .primary{border-color:#d07a69;background:linear-gradient(#d49684,#9d4a3e)}.active .combatant-icon{animation:battle-pulse 1.7s infinite}@keyframes battle-pulse{50%{transform:scale(1.035);filter:brightness(1.15)}}
.food-hot-note,.food-hot-active{display:block;margin-top:5px;font-size:7px}.food-hot-note{color:#b7774e}.food-hot-active{padding:6px 8px;border:1px solid #68a36f44;color:#91ca98;background:#68a36f0b}
@media(max-width:760px){.battle-page{padding:12px 10px 155px}.encounter-console{grid-template-columns:1fr}.encounter-modes{grid-template-columns:1fr 1fr}.encounter-modes button{min-width:0;min-height:52px;padding:7px}.encounter-modes button>b{width:23px;font-size:17px}.encounter-modes button span{font-size:8px}.encounter-modes button small{max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.compact-tier{width:100%}.boss-objective{min-width:0;text-align:left}.boss-brief{grid-template-columns:32px 1fr;padding:9px}.boss-brief>b{font-size:23px}.boss-brief aside{grid-column:2;text-align:left}.boss-path>div{grid-template-columns:repeat(2,minmax(0,1fr))}.combatants{grid-template-columns:1fr;gap:7px}.versus-mark{display:none}.combatant{padding:14px}.combatant>header{min-height:46px}.combatant-icon{width:43px;height:43px;flex-basis:43px;font-size:22px}.combatant h1,.combatant h2{font-size:19px}.health-label{margin-top:12px}.food-dock{grid-template-columns:minmax(0,1fr) auto}.food-dock>button.auto-eat{grid-column:1/-1;display:flex;justify-content:center;gap:8px}.combat-stats{margin-top:10px}.enemy-card{text-align:left}.enemy-card>header{flex-direction:row-reverse}.enemy-health i,.enemy-load i{margin-left:0}.enemy-card>footer{justify-content:flex-start;gap:12px}.battle-action{position:sticky;bottom:70px;z-index:4;padding:8px;background:linear-gradient(transparent,#08090ce8 22%)}.battle-action>div{display:grid;grid-template-columns:minmax(0,1fr) auto}.battle-action .primary{width:100%;min-width:0}.inline-auto-battle{min-width:90px}.battle-action small{display:none}}
@media(max-width:760px){.battle-page{padding-bottom:85px}.battle-action{bottom:0}}
</style>
