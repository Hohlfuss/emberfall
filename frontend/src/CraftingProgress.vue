<script setup lang="ts">
defineProps<{ level: number; xp: number; needed: number }>()
</script>

<template>
  <aside class="crafting-progress">
    <span>CRAFTING LEVEL {{ level }}</span>
    <strong>{{ xp }} / {{ needed }} XP</strong>
    <div><i :style="{ width: `${Math.min(100, xp / needed * 100)}%` }"></i></div>
    <small>Higher levels unlock more complex recipes.</small>
  </aside>
</template>
