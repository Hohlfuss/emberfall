<script setup lang="ts">
import type { FactionDefinition } from './useGame'
defineProps<{ definitions: FactionDefinition[]; progress: Record<string, { reputation: number; rank: number }>; allied: string | null; level: number }>()
defineEmits<{ ally: [id: 'wardens' | 'delvers' | 'vanguard'] }>()
</script>

<template>
  <section class="factions-page">
    <div class="page-heading"><div><p class="eyebrow">ALLEGIANCES</p><h1>Factions</h1><p>Ally with one faction at a time. Changing allegiance preserves all reputation and ranks.</p></div></div>
    <div class="faction-grid">
      <article v-for="faction in definitions" :key="faction.id" :class="{ allied: allied === faction.id, locked: level < faction.unlockLevel }">
        <b>{{ faction.icon }}</b><span class="tier">{{ allied === faction.id ? 'CURRENT ALLIANCE' : `UNLOCKS AT LEVEL ${faction.unlockLevel}` }}</span><h2>{{ faction.name }}</h2><p>{{ faction.description }}</p>
        <div class="faction-rank"><strong>Rank {{ progress[faction.id]?.rank || 0 }} / {{ faction.ranks.length }}</strong><span>{{ progress[faction.id]?.reputation || 0 }} reputation</span></div>
        <div class="meter"><i :style="{ width: `${Math.min(100, (progress[faction.id]?.reputation || 0) / (faction.ranks[progress[faction.id]?.rank || 0] || faction.ranks.at(-1) || 1) * 100)}%` }"></i></div>
        <ol><li v-for="(reward,index) in faction.rewards" :key="reward" :class="{ earned: (progress[faction.id]?.rank || 0) > index }"><span>Rank {{ index + 1 }}</span>{{ reward }} <small>+{{ (index + 1) * 40 }} gold{{ index === 3 ? ' · +1 worker' : '' }}</small></li></ol>
        <button :disabled="level < faction.unlockLevel || allied === faction.id" @click="$emit('ally', faction.id)">{{ allied === faction.id ? 'ALLIED' : level < faction.unlockLevel ? `LEVEL ${faction.unlockLevel} REQUIRED` : 'PLEDGE ALLIANCE' }}</button>
      </article>
    </div>
  </section>
</template>
