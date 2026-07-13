<script setup lang="ts">
import { computed, ref } from 'vue'

const emit = defineEmits<{ complete: []; skip: [] }>()
const step = ref(0)

const steps = [
  {
    icon: '⚔', eyebrow: 'STEP 1 · BATTLE', title: 'Begin in the arena',
    body: 'Fight normal enemies to earn player XP and gold. Victories unlock higher enemy tiers, while defeat starts recovery and removes 10% of your current gold.',
    tip: 'All four gathering professions and both workshops are available immediately.',
  },
  {
    icon: '🎣', eyebrow: 'STEP 2 · GATHERING', title: 'Choose a gathering path',
    body: 'Woodcutting, Mining, Fishing, and Farming are available from the beginning. Gather whichever materials your next recipe needs.',
    tip: 'Your health, selected food, and Eat button stay together on your hero card during battle.',
  },
  {
    icon: '🔨', eyebrow: 'STEP 3 · WORKSHOPS', title: 'Craft and cook from the start',
    body: 'Crafting turns gathered materials into components and equipment. Cooking combines fish and crops into food for battle.',
    tip: 'Detailed profession stats live in Inventory so the activity pages stay focused on recipes.',
  },
  {
    icon: '♛', eyebrow: 'STEP 4 · AREA BOSSES', title: 'Prepare for true challenges',
    body: 'Bosses are much stronger than early enemies. The first has normal-enemy Power Tier 10, the second Power Tier 20, and each following boss adds another ten tiers.',
    tip: 'The Buried Colossus unlocks Metal Detector. The Bannerless King unlocks Factions; later boss unlocks can be added in future updates.',
  },
  {
    icon: '🍲', eyebrow: 'STEP 5 · COOKING', title: 'Prepare healing food',
    body: 'Cooking pairs fish and farm crops into tiered meals from the beginning of the game. Every dish restores its listed health in and out of battle.',
    tip: 'Cooking levels improve recipe speed, ingredient conservation, and your chance to make a bonus dish.',
  },
  {
    icon: '♟', eyebrow: 'STEP 6 · AUTOMATION', title: 'Put Workers to work',
    body: 'Workers and the Auction House are available from the beginning. Assign Workers to any gathering activity you have opened and trade materials with other players.',
    tip: 'Player-level milestones award free Workers, and additional Workers can be hired in the Shop.',
  },
  {
    icon: '★', eyebrow: 'READY · EMBERFALL', title: 'Choose your own path',
    body: 'Progress through normal enemy tiers, build your professions, join or create a clan, and approach bosses as long-term challenges. On mobile, swipe the area bar below the header to reach every page directly.',
    tip: 'Clan members can switch the chat panel from Realm to their private Clan channel. Use the ? Guide button whenever you want to see this tutorial again.',
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
