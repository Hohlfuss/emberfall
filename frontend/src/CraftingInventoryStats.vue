<script setup lang="ts">
defineProps<{
  profession: { level: number; xp: number; xpNeeded: number }
  stats: { speed: number; conservationChance: number; bonusOutputChance: number; totalCrafts: number; materialsSaved: number; bonusOutputs: number }
}>()
</script>

<template>
  <section class="crafting-inventory-stats">
    <h2>Crafting profession</h2>
    <div class="crafting-level-row"><strong>Level {{ profession.level }}</strong><span>{{ profession.xp }} / {{ profession.xpNeeded }} XP</span></div>
    <div class="meter"><i :style="{ width: `${Math.min(100, profession.xp / profession.xpNeeded * 100)}%` }"></i></div>
    <div class="detail-stats">
      <div title="Reduces the time required to complete every recipe."><span>Crafting speed</span><strong>+{{ stats.speed }}%</strong></div>
      <div title="Chance to save one of each required material when starting a craft."><span>Conservation</span><strong>{{ stats.conservationChance }}%</strong></div>
      <div title="Chance for component recipes to produce twice their normal output."><span>Bonus output</span><strong>{{ stats.bonusOutputChance }}%</strong></div>
      <div><span>Crafts completed</span><strong>{{ stats.totalCrafts }}</strong></div>
      <div><span>Materials saved</span><strong>{{ stats.materialsSaved }}</strong></div>
      <div><span>Bonus items made</span><strong>{{ stats.bonusOutputs }}</strong></div>
    </div>
    <small>Speed improves every level. Conservation improves every 2 levels. Bonus output improves every 3 levels.</small>
  </section>
</template>
