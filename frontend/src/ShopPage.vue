<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Gear } from './gameData'

type UpgradeId = 'medic' | 'scouting' | 'training' | 'fortitude' | 'autoBattle' | 'autoEat' | 'healingPower'
type Upgrade = { id: UpgradeId; name: string; description: string; icon: string; baseCost: number; max: number }
type StoreListing = { id: string; name: string; icon: string; itemId?: string; item?: Gear; price: number; index: number }
type ShopSection = 'automation' | 'equipment' | 'upgrades'

const props = defineProps<{
  gold: number
  workers: number
  workerPrice: number
  storeListings: StoreListing[]
  upgrades: Upgrade[]
  shopUpgrades: Record<UpgradeId, number>
  craftingBusy: boolean
  upgradeCost: (upgrade: Upgrade) => number
  gearTooltip: (gear: Gear) => string
  formatBonus: (stat: string, amount: number) => string
}>()

const emit = defineEmits<{
  buyWorker: []
  buyUpgrade: [upgrade: Upgrade]
  buyGear: [listing: StoreListing]
}>()

const section = ref<ShopSection>('automation')
const automationUpgrades = computed(() => props.upgrades.filter(upgrade => upgrade.id === 'autoBattle' || upgrade.id === 'autoEat'))
const regularUpgrades = computed(() => props.upgrades.filter(upgrade => upgrade.id !== 'autoBattle' && upgrade.id !== 'autoEat'))

function upgradeButtonLabel(upgrade: Upgrade) {
  if (props.shopUpgrades[upgrade.id] >= upgrade.max) return upgrade.max === 1 ? 'UNLOCKED' : 'MAXIMUM RANK'
  const verb = upgrade.max === 1 ? 'UNLOCK' : 'UPGRADE'
  return `${verb} · ${props.upgradeCost(upgrade).toLocaleString()} GOLD`
}
</script>

<template>
  <section class="page-content shop-page">
    <div class="page-heading shop-heading">
      <div><p class="eyebrow">SETTLEMENT MARKET</p><h1>Shop</h1><p>Choose a department to keep purchases focused and easy to compare.</p></div>
      <div class="shop-wallet"><span>AVAILABLE GOLD</span><strong>◈ {{ gold.toLocaleString() }}</strong></div>
    </div>

    <nav class="shop-departments" aria-label="Shop departments">
      <button :class="{ selected: section === 'automation' }" type="button" @click="section = 'automation'"><b>⚙️</b><span>Automation<strong>Workers and battle helpers</strong></span></button>
      <button :class="{ selected: section === 'equipment' }" type="button" @click="section = 'equipment'"><b>⚔️</b><span>Equipment<strong>Your next gear tier</strong></span></button>
      <button :class="{ selected: section === 'upgrades' }" type="button" @click="section = 'upgrades'"><b>⬆️</b><span>Upgrades<strong>Permanent stat improvements</strong></span></button>
    </nav>

    <div class="shop-grid">
      <template v-if="section === 'automation'">
        <div class="department-heading"><div><p class="eyebrow">AUTOMATION</p><h2>Build your support team</h2></div><p>These purchases reduce repeated clicks and keep your adventure moving.</p></div>
        <div class="automation-grid">
          <article class="feature-shop-card worker-feature">
            <div class="feature-icon">♟</div>
            <div class="feature-copy"><span>REPEATABLE · PERMANENT</span><h2>Hire a Worker</h2><p>Assign a Worker to any unlocked resource for passive gathering at 20% of manual speed.</p><small>{{ workers }} owned · price increases by 500 gold after each hire</small></div>
            <button type="button" :disabled="gold < workerPrice" @click="emit('buyWorker')">HIRE WORKER · {{ workerPrice.toLocaleString() }} GOLD</button>
          </article>

          <article v-for="upgrade in automationUpgrades" :key="upgrade.id" class="feature-shop-card" :class="{ unlocked: shopUpgrades[upgrade.id] >= upgrade.max }">
            <div class="feature-icon">{{ upgrade.icon }}</div>
            <div class="feature-copy"><span>{{ shopUpgrades[upgrade.id] ? 'OWNED · ACTIVE' : 'ONE-TIME UNLOCK' }}</span><h2>{{ upgrade.name }}</h2><p>{{ upgrade.description }}</p><small v-if="upgrade.id === 'autoBattle'">Adds an Auto-Battle control to the Battle page.</small><small v-else>Adds an Auto-Eat control to Battle and uses your selected food.</small></div>
            <button type="button" :disabled="shopUpgrades[upgrade.id] >= upgrade.max || gold < upgradeCost(upgrade)" @click="emit('buyUpgrade', upgrade)">{{ upgradeButtonLabel(upgrade) }}</button>
          </article>
        </div>
      </template>

      <template v-else-if="section === 'equipment'">
        <div class="department-heading"><div><p class="eyebrow">EQUIPMENT MERCHANT</p><h2>Your next available gear</h2></div><p>Each shelf shows only the next tier you do not own.</p></div>
        <div class="store-shelves">
          <article v-for="listing in storeListings" :key="listing.id" class="store-listing" :title="listing.item ? `${gearTooltip(listing.item)}\nPrice: ${listing.price.toLocaleString()} gold` : `${listing.name}: all tiers owned`">
            <template v-if="listing.item"><b>{{ listing.item.icon }}</b><div><span class="tier">{{ listing.name }} · NEXT TIER {{ listing.item.tier }}</span><h3>{{ listing.item.name }}</h3><p>{{ listing.item.description }}</p><small>{{ Object.entries(listing.item.bonuses).map(([stat,value]) => formatBonus(stat, Number(value))).join(' · ') }}</small></div><button type="button" :disabled="gold < listing.price || craftingBusy" @click="emit('buyGear', listing)">BUY · {{ listing.price.toLocaleString() }} GOLD</button></template>
            <template v-else><b>✓</b><div><span class="tier">{{ listing.name }}</span><h3>All tiers owned</h3><p>This shelf is complete.</p></div><button disabled>SOLD OUT</button></template>
          </article>
        </div>
        <div class="salvage-slot"><slot /></div>
      </template>

      <template v-else>
        <div class="department-heading"><div><p class="eyebrow">PERMANENT UPGRADES</p><h2>Improve your hero</h2></div><p>Compare one category at a time without equipment and automation competing for attention.</p></div>
        <div class="upgrade-grid">
          <article v-for="upgrade in regularUpgrades" :key="upgrade.id" class="service-card">
            <b>{{ upgrade.icon }}</b><div><span class="tier">RANK {{ shopUpgrades[upgrade.id] }} / {{ upgrade.max }}</span><h3>{{ upgrade.name }}</h3><p>{{ upgrade.description }}</p></div>
            <button type="button" :disabled="shopUpgrades[upgrade.id] >= upgrade.max || gold < upgradeCost(upgrade)" @click="emit('buyUpgrade', upgrade)">{{ upgradeButtonLabel(upgrade) }}</button>
          </article>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.shop-heading { align-items: center; }
.shop-wallet { min-width: 180px; padding: 14px 18px; border: 1px solid #6f552e; background: #d19a3f0d; text-align: right; }
.shop-wallet span { display: block; color: #8f806c; font-size: 9px; letter-spacing: .12em; }
.shop-wallet strong { display: block; margin-top: 5px; color: #e1b45d; font-size: 18px; }
.shop-departments { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: -10px 0 24px; }
.shop-departments button { min-width: 0; padding: 13px 15px; display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 10px; border: 1px solid #ffffff14; color: #aaa; background: #ffffff05; text-align: left; cursor: pointer; }
.shop-departments button.selected { border-color: #bf8d3e; color: #ebc16f; background: linear-gradient(120deg, #be873f21, transparent); box-shadow: inset 3px 0 #c99645; }
.shop-departments b { font-size: 22px; }
.shop-departments span { font: 700 13px Cinzel, serif; }
.shop-departments strong { display: block; margin-top: 3px; color: #777; font: 500 9px Inter, sans-serif; }
.shop-grid { display: block; }
.department-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 13px; }
.department-heading h2 { margin: 3px 0 0; font-size: 26px; }
.department-heading > p { max-width: 440px; margin: 0; color: #777; font-size: 11px; text-align: right; }
.automation-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 11px; }
.feature-shop-card { min-height: 330px; padding: 24px; display: flex; flex-direction: column; border: 1px solid #6c5033; background: radial-gradient(circle at 50% 0, #c1843c1b, transparent 45%), linear-gradient(145deg, #191714, #0f1114); }
.feature-shop-card.unlocked { border-color: #58774f; background: radial-gradient(circle at 50% 0, #72a86618, transparent 45%), linear-gradient(145deg, #151914, #0f1114); }
.feature-icon { font-size: 52px; line-height: 1; margin-bottom: 18px; }
.feature-copy { flex: 1; }
.feature-copy > span { color: #bc8b48; font-size: 9px; font-weight: 800; letter-spacing: .13em; }
.feature-shop-card.unlocked .feature-copy > span { color: #82af75; }
.feature-copy h2 { margin: 7px 0 10px; color: #ecd4b0; font-size: 25px; }
.feature-copy p { min-height: 52px; margin: 0 0 10px; color: #938980; font-size: 12px; line-height: 1.5; }
.feature-copy small { color: #6f8fa0; font-size: 10px; }
.feature-shop-card > button, .service-card button { width: 100%; min-height: 42px; margin-top: 18px; border: 1px solid #bd8c43; color: #e9bc69; background: #bd872719; font: 800 10px Cinzel, serif; letter-spacing: .06em; cursor: pointer; }
.feature-shop-card.unlocked > button { border-color: #58774f; color: #92bf86; background: #58804a17; }
.upgrade-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
.service-card { min-height: 190px; }
.salvage-slot { margin-top: 16px; }
@media (max-width: 900px) {
  .automation-grid { grid-template-columns: 1fr; }
  .feature-shop-card { min-height: 0; }
  .feature-copy p { min-height: 0; }
}
@media (max-width: 720px) {
  .shop-heading, .department-heading { display: block; }
  .shop-wallet { margin: 0 0 18px; text-align: left; }
  .shop-departments { grid-template-columns: 1fr; }
  .department-heading > p { margin-top: 7px; text-align: left; }
  .upgrade-grid { grid-template-columns: 1fr; }
}
</style>
