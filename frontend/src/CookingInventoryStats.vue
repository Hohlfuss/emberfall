<script setup lang="ts">
defineProps<{
  profession: { level: number; xp: number; xpNeeded: number }
  stats: { speed: number; conservationChance: number; bonusDishChance: number; totalCooked: number; ingredientsSaved: number; bonusDishes: number }
}>()
</script>

<template>
  <section class="crafting-inventory-stats cooking-inventory-stats">
    <h2>Cooking profession</h2>
    <div class="crafting-level-row"><strong>Level {{ profession.level }}</strong><span>{{ profession.xp }} / {{ profession.xpNeeded }} XP</span></div>
    <div class="meter"><i :style="{ width: `${Math.min(100, profession.xp / Math.max(1, profession.xpNeeded) * 100)}%` }"></i></div>
    <div class="detail-stats">
      <div title="Reduces the time required to prepare every dish."><span>Cooking speed</span><strong>+{{ stats.speed }}%</strong></div>
      <div title="Chance to save one of each ingredient when cooking starts."><span>Conservation</span><strong>{{ stats.conservationChance }}%</strong></div>
      <div title="Chance to prepare a second dish."><span>Bonus dish</span><strong>{{ stats.bonusDishChance }}%</strong></div>
      <div><span>Meals cooked</span><strong>{{ stats.totalCooked }}</strong></div>
      <div><span>Ingredients saved</span><strong>{{ stats.ingredientsSaved }}</strong></div>
      <div><span>Bonus dishes</span><strong>{{ stats.bonusDishes }}</strong></div>
    </div>
    <small>Cooking level improves speed, ingredient conservation, and the chance to make bonus food.</small>
  </section>
</template>
