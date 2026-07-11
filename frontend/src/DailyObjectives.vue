<script setup lang="ts">
defineProps<{ objectives: Array<{ id: string; label: string; target: number; reward: number; icon: string; progress: number; completed: boolean }>; resetAt: number }>()
</script>

<template>
  <section class="daily-objectives">
    <header><div><span class="eyebrow">DAILY ADVENTURES</span><h2>Today's Objectives</h2></div><small>Resets {{ new Date(resetAt).toLocaleString() }}</small></header>
    <div>
      <article v-for="objective in objectives" :key="objective.id" :class="{ completed: objective.completed }">
        <b>{{ objective.icon }}</b><div><strong>{{ objective.label }}</strong><small>{{ objective.progress }} / {{ objective.target }}</small><div class="meter"><i :style="{ width: `${objective.progress / objective.target * 100}%` }"></i></div></div><em>{{ objective.completed ? 'CLAIMED' : `+${objective.reward} GOLD` }}</em>
      </article>
    </div>
  </section>
</template>
