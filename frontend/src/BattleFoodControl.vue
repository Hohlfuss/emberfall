<script setup lang="ts">
import { computed } from 'vue'

type BattleFood = { item: string; name: string; icon: string; healing: number; owned: number }

const props = defineProps<{
  foods: BattleFood[]
  selectedFood: string | null
  health: number
  maxHealth: number
  recovering: boolean
  autoEat: boolean
  autoEatUnlocked: boolean
  autoEatThreshold: number
  autoEatCooldownRemaining: number
  healingPowerBonus: number
}>()

const emit = defineEmits<{
  select: [item: string | null]
  eat: [item: string]
  toggleAutoEat: [enabled: boolean]
}>()

const selected = computed(() => props.foods.find(food => food.item === props.selectedFood))
const canEat = computed(() => Boolean(selected.value?.owned) && props.health < props.maxHealth && !props.recovering)

function selectFood(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('select', value || null)
}
</script>

<template>
  <article class="battle-food-control">
    <header>
      <div class="food-mark">{{ selected?.icon || '🍲' }}</div>
      <div>
        <span>BATTLE PROVISIONS</span>
        <h3>{{ selected?.name || 'Select a healing food' }}</h3>
        <small v-if="selected">{{ selected.owned }} owned · restores up to {{ selected.healing }} HP</small>
        <small v-else>Cook food from fish and crops, then choose it here.</small>
      </div>
      <strong v-if="healingPowerBonus">+{{ healingPowerBonus }}% HEALING POWER</strong>
    </header>

    <div class="food-actions">
      <label>
        <span>SELECT CURRENT FOOD</span>
        <select :value="selectedFood || ''" @change="selectFood">
          <option value="">No food selected</option>
          <option v-for="food in foods" :key="food.item" :value="food.item">
            {{ food.icon }} {{ food.name }} · {{ food.owned }} owned · +{{ food.healing }} HP
          </option>
        </select>
      </label>
      <button class="eat-button" type="button" :disabled="!canEat" @click="selected && emit('eat', selected.item)">
        {{ recovering ? 'RECOVERING' : health >= maxHealth ? 'HEALTH FULL' : selected ? `EAT · +${selected.healing} HP` : 'SELECT FOOD' }}
      </button>
      <button
        v-if="autoEatUnlocked"
        class="auto-eat-button"
        :class="{ enabled: autoEat }"
        type="button"
        :disabled="!selectedFood"
        @click="emit('toggleAutoEat', !autoEat)"
      >
        AUTO-EAT {{ autoEat ? 'ON' : 'OFF' }}
      </button>
      <div v-else class="auto-eat-locked"><span>AUTO-EAT LOCKED</span><small>Buy Battle Provisioner in the shop for 1,000 gold.</small></div>
    </div>

    <footer>
      <span v-if="autoEatUnlocked">Auto-Eat uses one selected food at {{ autoEatThreshold }}% health or lower<span v-if="autoEatCooldownRemaining"> · ready in {{ (autoEatCooldownRemaining / 1000).toFixed(1) }}s</span>.</span>
      <span>Death penalty: lose 10% of current gold.</span>
    </footer>
  </article>
</template>

<style scoped>
.battle-food-control { width: min(100%, 820px); margin: 22px auto 0; padding: 16px 18px; border: 1px solid #5b4938; background: linear-gradient(135deg, rgba(183,116,53,.13), #111216); text-align: left; }
.battle-food-control header { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; }
.food-mark { display: grid; place-items: center; width: 46px; height: 46px; border: 1px solid #715238; background: #251d17; font-size: 25px; }
header span, label span, .auto-eat-locked span { display: block; color: #be945f; font-size: 9px; font-weight: 900; letter-spacing: .13em; }
header h3 { margin: 3px 0; color: #e8d8c4; font: 700 16px Cinzel, serif; }
header small, footer, .auto-eat-locked small { color: #8e8580; font-size: 10px; }
header > strong { color: #83b777; font-size: 10px; letter-spacing: .08em; }
.food-actions { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; align-items: end; gap: 9px; margin-top: 14px; }
label select { width: 100%; min-height: 39px; margin-top: 5px; padding: 8px 10px; border: 1px solid #4c443d; color: #ddd2c5; background: #0b0d10; }
.food-actions button { min-height: 39px; padding: 9px 16px; font-size: 10px; font-weight: 900; letter-spacing: .06em; cursor: pointer; }
.eat-button { border: 1px solid #6c8d5d; color: #c7e2bb; background: #263722; }
.auto-eat-button { border: 1px solid #63533e; color: #9d9080; background: #201c18; }
.auto-eat-button.enabled { border-color: #a7713f; color: #f0c38b; background: #422c1c; box-shadow: 0 0 14px rgba(210,130,59,.18); }
.auto-eat-locked { min-width: 190px; min-height: 39px; padding: 6px 10px; border: 1px solid #3c3834; background: #171719; }
.battle-food-control footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #ffffff10; }
.battle-food-control footer span:last-child { color: #b26c63; }
@media (max-width: 720px) {
  .battle-food-control header { grid-template-columns: auto 1fr; }
  header > strong { grid-column: 2; }
  .food-actions { grid-template-columns: 1fr 1fr; }
  .food-actions label { grid-column: 1 / -1; }
  .auto-eat-locked { min-width: 0; }
  .battle-food-control footer { display: grid; }
}
</style>
