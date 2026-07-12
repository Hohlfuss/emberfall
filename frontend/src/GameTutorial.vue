<script setup lang="ts">
import { computed, ref } from 'vue'

const emit = defineEmits<{ complete: []; skip: [] }>()
const step = ref(0)

const steps = [
  {
    icon: '⚔', eyebrow: 'STEP 1 · BATTLE', title: 'Begin in the arena',
    body: 'Fight enemies to earn player XP and gold. Victories unlock higher enemy tiers, while defeat starts a short recovery.',
    tip: 'Your first tier-3 victory also reveals the Metal Detector activity.',
  },
  {
    icon: '🌲', eyebrow: 'STEP 2 · GATHERING', title: 'Gather wood and ore',
    body: 'Woodcutting and Mining have separate levels and XP. Higher levels improve speed, bonus yield, and access to new resources.',
    tip: 'Critical harvests finish faster; double and triple yields award extra materials.',
  },
  {
    icon: '♟', eyebrow: 'STEP 3 · WORKERS', title: 'Put gatherers to work',
    body: 'Your first free gatherer unlocks at player level 2, with more awarded at later milestones. Assign them from the Workers page for passive materials.',
    tip: 'A large notification appears whenever a level awards a new gatherer.',
  },
  {
    icon: '⚒', eyebrow: 'STEP 4 · CRAFTING', title: 'Build useful equipment',
    body: 'The forge turns gathered materials into components and gear. Follow its three steps to choose a recipe, check requirements, and begin crafting.',
    tip: 'Crafting has its own level, speed bonuses, conservation, and double-output chance.',
  },
  {
    icon: '⌁', eyebrow: 'STEP 5 · EXPLORATION', title: 'Dig for buried rewards',
    body: 'The Metal Detector spends one charge to uncover a tile. It holds ten charges and restores one every ten minutes.',
    tip: 'Invest gold in the depth drill to reduce empty finds and improve reward and jackpot chances.',
  },
  {
    icon: '★', eyebrow: 'READY · EMBERFALL', title: 'Choose your own path',
    body: 'Battle, gather, craft, automate, trade, join factions, and complete achievements in any order that helps your hero grow.',
    tip: 'Use the ? Guide button in the top bar whenever you want to see this tutorial again.',
  },
] as const

const current = computed(() => steps[step.value]!)
const lastStep = computed(() => step.value === steps.length - 1)
</script>

<template>
  <Teleport to="body">
    <div class="tutorial-backdrop" role="presentation">
      <section class="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        <header>
          <span>TUTORIAL {{ step + 1 }} / {{ steps.length }}</span>
          <button type="button" @click="emit('skip')">SKIP TUTORIAL</button>
        </header>

        <div class="tutorial-progress" aria-hidden="true"><i v-for="(_, index) in steps" :key="index" :class="{ active: index <= step }"></i></div>

        <div class="tutorial-icon" aria-hidden="true">{{ current.icon }}</div>
        <p class="eyebrow">{{ current.eyebrow }}</p>
        <h2 id="tutorial-title">{{ current.title }}</h2>
        <p class="tutorial-copy">{{ current.body }}</p>
        <aside><b>TIP</b><span>{{ current.tip }}</span></aside>

        <footer>
          <button type="button" class="tutorial-back" :disabled="step === 0" @click="step--">BACK</button>
          <button v-if="!lastStep" type="button" class="tutorial-next" @click="step++">NEXT</button>
          <button v-else type="button" class="tutorial-next" @click="emit('complete')">START PLAYING</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
