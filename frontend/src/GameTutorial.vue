<script setup lang="ts">
import { computed, ref } from 'vue'

const emit = defineEmits<{ complete: []; skip: [] }>()
const step = ref(0)

const steps = [
  {
    icon: '⚔', eyebrow: 'STEP 1 · BATTLE', title: 'Begin in the arena',
    body: 'Fight normal enemies to earn player XP and gold. Victories unlock higher enemy tiers, while defeat starts recovery and removes 10% of your current gold.',
    tip: 'Your health, selected food, and Eat button stay together on your hero card during battle.',
  },
  {
    icon: '♛', eyebrow: 'STEP 2 · AREA BOSSES', title: 'Open the realm',
    body: 'Use the Area Boss selector beside enemy tiers to challenge ten named bosses. Each first victory opens a new profession or part of Emberfall.',
    tip: 'Bramblemaw opens Woodcutting first. The navigation menu always shows the next boss and its unlock.',
  },
  {
    icon: '🪓', eyebrow: 'STEP 3 · PROFESSIONS', title: 'Grow one area at a time',
    body: 'Woodcutting, Mining, Fishing, and Farming each have profession levels and XP. Their activities and resources use tiers, with stronger tiers requiring higher profession levels.',
    tip: 'Critical actions finish faster. Upgrade each profession’s tool for stronger gathering stats.',
  },
  {
    icon: '⚒', eyebrow: 'STEP 4 · CRAFTING', title: 'Build useful equipment',
    body: 'Defeat the Ashen Forgemaster to open Crafting. The forge turns gathered materials into components and tiered gear.',
    tip: 'Crafting has its own level, speed bonuses, conservation, and double-output chance.',
  },
  {
    icon: '🍲', eyebrow: 'STEP 5 · COOKING', title: 'Prepare healing food',
    body: 'After Cindermaw falls, Cooking pairs fish and farm crops into tiered meals. Every dish restores its listed health in and out of battle.',
    tip: 'Cooking levels improve recipe speed, ingredient conservation, and your chance to make a bonus dish.',
  },
  {
    icon: '♟', eyebrow: 'STEP 6 · AUTOMATION', title: 'Put Workers to work',
    body: 'Workers become available later in the boss path. Once open, assign them to unlocked gathering activities for passive materials.',
    tip: 'Player-level milestones still award free Workers, ready for you when the Workers area opens.',
  },
  {
    icon: '★', eyebrow: 'READY · EMBERFALL', title: 'Choose your own path',
    body: 'Grow strong enough for the next boss, then explore each newly opened area. On mobile, Battle, Explore, Inventory, and Menu are always at the bottom of the screen.',
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
