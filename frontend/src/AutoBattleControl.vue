<script setup lang="ts">
defineProps<{ enabled: boolean; unlocked: boolean; recovering: boolean }>()
defineEmits<{ toggle: [enabled: boolean] }>()
</script>

<template>
  <aside v-if="unlocked" class="auto-battle-control" :class="{ enabled }">
    <div><span>AUTO-BATTLE</span><small>{{ enabled ? 'Fighting continuously until defeated' : recovering ? 'Recovering — enable when ready' : 'Ready for automated combat' }}</small></div>
    <button type="button" :aria-pressed="enabled" @click="$emit('toggle', !enabled)">{{ enabled ? 'ON' : 'OFF' }}</button>
  </aside>
</template>
