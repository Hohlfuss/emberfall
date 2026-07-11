<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AuctionListing } from './useGame'

const props = defineProps<{ listings: AuctionListing[]; inventory: Record<string, number>; gold: number; playerName: string; error: string }>()
const emit = defineEmits<{ create: [item: string, quantity: number, price: number]; buy: [id: string]; cancel: [id: string]; refresh: [] }>()
const item = ref('')
const quantity = ref(1)
const price = ref(1)
const items = computed(() => Object.entries(props.inventory).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b)))
</script>

<template>
  <section class="auction-house">
    <div class="page-heading"><div><p class="eyebrow">PLAYER MARKET</p><h1>Auction House</h1><p>List stackable materials and crafted components for other adventurers.</p></div><button @click="$emit('refresh')">REFRESH</button></div>
    <form class="auction-create" @submit.prevent="item && emit('create', item, quantity, price)">
      <select v-model="item" required><option value="" disabled>Choose an item</option><option v-for="([name,count]) in items" :key="name" :value="name">{{ name }} ({{ count }})</option></select>
      <input v-model.number="quantity" type="number" min="1" :max="inventory[item] || 1" aria-label="Quantity">
      <input v-model.number="price" type="number" min="1" aria-label="Total gold price" placeholder="Gold price">
      <button>CREATE LISTING</button>
    </form>
    <p v-if="error" class="auction-error">{{ error }}</p>
    <div class="auction-grid">
      <article v-for="listing in listings" :key="listing.id">
        <span>{{ listing.quantity }}×</span><div><h3>{{ listing.item_name }}</h3><small>Seller: {{ listing.seller_name }} · {{ new Date(listing.created_at).toLocaleString() }}</small></div><strong>{{ listing.price.toLocaleString() }} gold</strong>
        <button v-if="listing.seller_name === playerName" @click="emit('cancel', listing.id)">CANCEL</button>
        <button v-else :disabled="gold < listing.price" @click="emit('buy', listing.id)">BUY</button>
      </article>
      <p v-if="!listings.length" class="empty-state">No active listings.</p>
    </div>
  </section>
</template>
