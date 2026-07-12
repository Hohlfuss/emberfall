<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MetalDetectorState } from './useGame'

const props = defineProps<{ detector: MetalDetectorState; gold: number }>()
const emit = defineEmits<{
  reveal: [tileId: number]
  drill: [gold: number]
  relocate: []
}>()

const drillGold = ref(10)
const allRevealed = computed(() => props.detector.tiles.every(tile => tile.revealed))
const revealedCount = computed(() => props.detector.tiles.filter(tile => tile.revealed).length)
const rechargePercent = computed(() => props.detector.charges >= props.detector.maxCharges
  ? 100
  : Math.max(0, Math.min(100, (1 - props.detector.nextChargeIn / props.detector.rechargeMs) * 100)))
const selectedGold = computed(() => Math.max(0, Math.min(props.gold, Math.floor(Number(drillGold.value) || 0))))
const depthGain = computed(() => Math.max(0, Math.floor(Math.sqrt(props.detector.investment + selectedGold.value)) - props.detector.depth))
const nextMeterCost = computed(() => Math.max(1, (props.detector.depth + 1) ** 2 - props.detector.investment))

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return minutes ? `${minutes}:${remaining.toString().padStart(2, '0')}` : `${remaining}s`
}

function chooseGold(amount: number) {
  drillGold.value = Math.max(1, Math.min(props.gold, Math.floor(amount)))
}

function startDrill() {
  if (!selectedGold.value || !depthGain.value || props.detector.drilling) return
  emit('drill', selectedGold.value)
}
</script>

<template>
  <section class="page-content detector-page">
    <header class="page-heading detector-heading">
      <div>
        <p class="eyebrow">BURIED SIGNALS · SITE {{ detector.site }}</p>
        <h1>Metal Detector</h1>
        <p>Uncover one tile per charge. Most shallow signals are worthless, but anything in Emberfall can be buried below.</p>
      </div>
      <div class="detector-depth-heading"><span>CURRENT DEPTH</span><strong>{{ detector.depth }}m</strong></div>
    </header>

    <div class="detector-layout">
      <article class="detector-site">
        <header>
          <div><span>EXCAVATION GRID</span><strong>Site {{ detector.site }}</strong></div>
          <small>{{ revealedCount }} / 16 uncovered</small>
        </header>

        <div class="detector-grid" :class="{ drilling: detector.drilling }">
          <button
            v-for="tile in detector.tiles"
            :key="tile.id"
            type="button"
            class="detector-tile"
            :class="[tile.revealed ? `revealed is-${tile.reward?.kind || 'empty'}` : 'covered']"
            :disabled="tile.revealed || detector.charges < 1 || !!detector.drilling"
            :aria-label="tile.revealed ? `Tile ${tile.id + 1}: ${tile.reward?.label}` : `Uncover tile ${tile.id + 1}`"
            @click="emit('reveal', tile.id)"
          >
            <template v-if="tile.revealed">
              <b>{{ tile.reward?.icon }}</b>
              <strong>{{ tile.reward?.label }}</strong>
              <small>{{ tile.reward?.detail }}</small>
            </template>
            <template v-else><b>⌁</b><span>SIGNAL {{ tile.id + 1 }}</span></template>
          </button>
        </div>

        <footer>
          <p v-if="detector.drilling">Scanning is paused while the depth drill is running.</p>
          <p v-else-if="!detector.charges">No charge remains. The next charge restores in {{ formatTime(detector.nextChargeIn) }}.</p>
          <p v-else-if="allRevealed">This site is exhausted. Move to fresh ground without spending a charge.</p>
          <p v-else>Choose carefully—every covered tile has a completely independent reward roll.</p>
          <button v-if="allRevealed" type="button" :disabled="!!detector.drilling" @click="emit('relocate')">MOVE TO NEW SITE</button>
        </footer>
      </article>

      <aside class="detector-console">
        <div class="detector-device" aria-hidden="true"><i></i><b>◉</b><span>EF-03</span></div>

        <section class="detector-charges">
          <div class="detector-console-title"><span>DETECTOR CHARGE</span><strong>{{ detector.charges }} / {{ detector.maxCharges }}</strong></div>
          <div class="charge-pips" aria-hidden="true"><i v-for="charge in detector.maxCharges" :key="charge" :class="{ full: charge <= detector.charges }"></i></div>
          <div v-if="detector.charges < detector.maxCharges" class="meter"><i :style="{ width: `${rechargePercent}%` }"></i></div>
          <small>{{ detector.charges >= detector.maxCharges ? 'Fully charged' : `Next charge in ${formatTime(detector.nextChargeIn)} · one every 10 minutes` }}</small>
        </section>

        <section class="detector-depth">
          <div class="detector-console-title"><span>DEPTH METER</span><strong>{{ detector.depth }}m</strong></div>
          <div class="depth-track"><i :style="{ height: `${Math.min(100, 12 + detector.depth / 2.5)}%` }"></i><b>{{ detector.depth }}m</b></div>
          <div class="detector-odds">
            <div><span>EMPTY GROUND</span><strong>{{ detector.emptyChance.toFixed(1) }}%</strong></div>
            <div><span>JACKPOT / TILE</span><strong>{{ detector.jackpotChance.toFixed(2) }}%</strong></div>
          </div>
        </section>

        <section v-if="detector.drilling" class="detector-drilling">
          <div class="detector-console-title"><span>DRILL RUNNING</span><strong>{{ formatTime(detector.drilling.remaining) }}</strong></div>
          <p>Cutting from {{ detector.drilling.startDepth }}m to {{ detector.drilling.targetDepth }}m</p>
          <div class="meter"><i :style="{ width: `${detector.drilling.progress}%` }"></i></div>
          <div><span>GOLD IN DRILL</span><strong>{{ detector.drilling.goldRemaining.toLocaleString() }} ◈</strong></div>
        </section>

        <form v-else class="detector-drill-form" @submit.prevent="startDrill">
          <div class="detector-console-title"><span>DRILL DEEPER</span><strong>10 SECOND RUN</strong></div>
          <p>Commit any amount of gold. Larger investments reach farther, with diminishing returns.</p>
          <label><span>GOLD TO COMMIT</span><input v-model.number="drillGold" type="number" min="1" :max="gold" step="1"></label>
          <div class="drill-presets"><button type="button" :disabled="gold < 10" @click="chooseGold(10)">10</button><button type="button" :disabled="gold < 100" @click="chooseGold(100)">100</button><button type="button" :disabled="gold < 1000" @click="chooseGold(1000)">1K</button><button type="button" :disabled="gold < 1" @click="chooseGold(gold)">MAX</button></div>
          <div class="drill-preview"><span>{{ selectedGold.toLocaleString() }} gold</span><b>→</b><strong>{{ depthGain ? `+${depthGain}m depth` : `${nextMeterCost} gold needed` }}</strong></div>
          <button class="drill-start" :disabled="!selectedGold || !depthGain || selectedGold > gold">START DEPTH DRILL</button>
          <small>Future rig upgrades can improve drill speed and gold efficiency.</small>
        </form>
      </aside>
    </div>
  </section>
</template>
