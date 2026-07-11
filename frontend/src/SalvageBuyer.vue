<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ inventory: Record<string, number>; prices: Record<string, number> }>()
const emit = defineEmits<{ sell: [item: string, quantity: number] }>()
const item = ref('')
const quantity = ref(1)
const items = computed(() => Object.entries(props.inventory).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b)))
const unitPrice = computed(() => props.prices[item.value] || 1)
watch(item, () => { quantity.value = 1 })

function sell() {
  if (!item.value || quantity.value < 1) return
  emit('sell', item.value, quantity.value)
}
</script>

<template>
  <section class="salvage-buyer">
    <div><span class="tier">LOW-VALUE INSTANT SALES</span><h2>Salvage Buyer</h2><p>Need gold now? The buyer accepts materials and components, but pays far less than other players might.</p></div>
    <form @submit.prevent="sell">
      <label><span>Item</span><select v-model="item" required><option value="" disabled>Choose an item</option><option v-for="([name,count]) in items" :key="name" :value="name">{{ name }} ({{ count }}) · {{ prices[name] || 1 }}g each</option></select></label>
      <label><span>Amount</span><input v-model.number="quantity" type="number" min="1" :max="inventory[item] || 1"></label>
      <div class="salvage-total"><span>You receive</span><strong>{{ (unitPrice * quantity).toLocaleString() }} gold</strong></div>
      <button :disabled="!item || quantity < 1">SELL NOW</button>
    </form>
  </section>
</template>
