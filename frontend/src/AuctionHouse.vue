<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AuctionListing } from './useGame'

type MarketView = 'browse' | 'mine'
type MarketSort = 'newest' | 'price-low' | 'price-high' | 'quantity'

const props = defineProps<{ listings: AuctionListing[]; inventory: Record<string, number>; gold: number; playerName: string; error: string }>()
const emit = defineEmits<{ create: [item: string, quantity: number, price: number]; buy: [id: string]; cancel: [id: string]; refresh: [] }>()
const item = ref('')
const quantity = ref(1)
const price = ref(1)
const view = ref<MarketView>('browse')
const sort = ref<MarketSort>('newest')
const search = ref('')

const items = computed(() => Object.entries(props.inventory).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b)))
const ownListings = computed(() => props.listings.filter(isOwnListing))
const publicListings = computed(() => props.listings.filter(listing => !isOwnListing(listing)))
const marketValue = computed(() => props.listings.reduce((total, listing) => total + listing.price, 0))
const selectedOwned = computed(() => props.inventory[item.value] || 0)
const unitPrice = computed(() => quantity.value > 0 ? Math.max(0, price.value) / quantity.value : 0)
const canCreate = computed(() => Boolean(item.value) && Number.isInteger(quantity.value) && quantity.value > 0 && quantity.value <= selectedOwned.value && Number.isInteger(price.value) && price.value > 0)

const visibleListings = computed(() => {
  const query = search.value.trim().toLowerCase()
  const source = view.value === 'mine' ? ownListings.value : publicListings.value
  return source
    .filter(listing => !query || `${listing.item_name} ${listing.seller_name}`.toLowerCase().includes(query))
    .sort((left, right) => {
      if (sort.value === 'price-low') return left.price - right.price
      if (sort.value === 'price-high') return right.price - left.price
      if (sort.value === 'quantity') return right.quantity - left.quantity
      return Date.parse(right.created_at) - Date.parse(left.created_at)
    })
})

function isOwnListing(listing: AuctionListing) {
  return listing.seller_name === props.playerName
}

function itemIcon(name: string) {
  const value = name.toLowerCase()
  if (/log|wood|plank|resin|bark/.test(value)) return '🌲'
  if (/ore|ingot|iron|copper|silver|gold|steel|mythril/.test(value)) return '⛏️'
  if (/stone|rock|granite|obsidian|limestone/.test(value)) return '🪨'
  if (/gem|crystal|pearl|moon|star|rune/.test(value)) return '💎'
  return '◆'
}

function age(value: string) {
  const elapsed = Math.max(0, Date.now() - Date.parse(value))
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return 'Just listed'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function createListing() {
  if (canCreate.value) emit('create', item.value, quantity.value, price.value)
}
</script>

<template>
  <section class="auction-house">
    <header class="auction-hero">
      <div class="auction-sigil" aria-hidden="true">⚖</div>
      <div class="auction-title"><p class="eyebrow">THE GILDED EXCHANGE</p><h1>Auction House</h1><p>Trade materials and crafted components directly with Emberfall’s adventurers.</p><span><i></i> MARKET OPEN · {{ listings.length }} ACTIVE LISTING{{ listings.length === 1 ? '' : 'S' }}</span></div>
      <aside class="auction-wallet"><span>YOUR PURSE</span><strong>◈ {{ gold.toLocaleString() }}</strong><small>GOLD AVAILABLE</small></aside>
    </header>

    <div class="market-summary">
      <article><b>◇</b><div><span>MARKET OFFERS</span><strong>{{ publicListings.length }}</strong></div></article>
      <article><b>✦</b><div><span>YOUR LISTINGS</span><strong>{{ ownListings.length }}</strong></div></article>
      <article><b>◈</b><div><span>TOTAL MARKET VALUE</span><strong>{{ marketValue.toLocaleString() }}</strong></div></article>
      <button type="button" @click="emit('refresh')"><b>↻</b><span>REFRESH MARKET</span></button>
    </div>

    <section class="listing-forge">
      <header><div><p class="eyebrow">SELL AN ITEM</p><h2>Open a market stall</h2><p>Choose an owned stack, set the amount, and name your total price.</p></div><div v-if="item" class="listing-preview"><span>UNIT PRICE</span><strong>{{ unitPrice.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}</strong><small>gold each</small></div></header>
      <form class="auction-create" @submit.prevent="createListing">
        <label class="item-field"><span>ITEM TO SELL</span><select v-model="item" required><option value="" disabled>Choose an item from inventory</option><option v-for="([name,count]) in items" :key="name" :value="name">{{ itemIcon(name) }} {{ name }} · {{ count.toLocaleString() }} owned</option></select></label>
        <label><span>QUANTITY</span><input v-model.number="quantity" type="number" min="1" :max="selectedOwned || 1" aria-label="Quantity"><small>{{ item ? `${selectedOwned.toLocaleString()} available` : 'Select an item first' }}</small></label>
        <label><span>TOTAL PRICE</span><div class="gold-input"><b>◈</b><input v-model.number="price" type="number" min="1" aria-label="Total gold price" placeholder="Gold"></div><small>Buyer pays this amount</small></label>
        <button :disabled="!canCreate"><b>＋</b><span>CREATE LISTING<small>{{ item ? `${quantity || 0} × ${item}` : 'Choose goods to continue' }}</small></span></button>
      </form>
      <p v-if="!items.length" class="auction-inventory-empty">Your inventory has no stackable items available to list.</p>
    </section>

    <p v-if="error" class="auction-error" role="alert"><b>!</b>{{ error }}</p>

    <section class="market-board">
      <header class="market-toolbar">
        <div class="market-tabs"><button type="button" :class="{ selected: view === 'browse' }" @click="view = 'browse'">BROWSE MARKET <span>{{ publicListings.length }}</span></button><button type="button" :class="{ selected: view === 'mine' }" @click="view = 'mine'">MY LISTINGS <span>{{ ownListings.length }}</span></button></div>
        <label class="market-search"><b>⌕</b><input v-model="search" type="search" placeholder="Search items or sellers" aria-label="Search auction listings"></label>
        <label class="market-sort"><span>SORT</span><select v-model="sort" aria-label="Sort auction listings"><option value="newest">Newest</option><option value="price-low">Lowest price</option><option value="price-high">Highest price</option><option value="quantity">Largest stack</option></select></label>
      </header>

      <div class="auction-grid">
        <article v-for="listing in visibleListings" :key="listing.id" class="market-listing" :class="{ owned: isOwnListing(listing), unaffordable: !isOwnListing(listing) && gold < listing.price }">
          <header><div class="listing-icon">{{ itemIcon(listing.item_name) }}</div><div><span>{{ isOwnListing(listing) ? 'YOUR MARKET STALL' : 'ADVENTURER LISTING' }}</span><h3>{{ listing.item_name }}</h3></div><small>{{ age(listing.created_at) }}</small></header>
          <div class="listing-stack"><span>STACK SIZE</span><strong>{{ listing.quantity.toLocaleString() }}<small> items</small></strong></div>
          <div class="listing-seller"><span>SELLER</span><strong>{{ listing.seller_name }}</strong></div>
          <footer>
            <div><span>TOTAL PRICE</span><strong>◈ {{ listing.price.toLocaleString() }}</strong><small>{{ (listing.price / listing.quantity).toLocaleString(undefined, { maximumFractionDigits: 1 }) }} gold each</small></div>
            <button v-if="isOwnListing(listing)" class="cancel-listing" type="button" @click="emit('cancel', listing.id)">CANCEL LISTING</button>
            <button v-else type="button" :disabled="gold < listing.price" @click="emit('buy', listing.id)">{{ gold < listing.price ? 'NOT ENOUGH GOLD' : 'BUY NOW' }}</button>
          </footer>
        </article>

        <div v-if="!visibleListings.length" class="auction-empty">
          <b>{{ view === 'mine' ? '◇' : '⚖' }}</b><h3>{{ search ? 'No matching listings' : view === 'mine' ? 'Your market stall is empty' : 'The market is quiet' }}</h3><p>{{ search ? 'Try a different item or seller name.' : view === 'mine' ? 'Create a listing above to start selling.' : 'No adventurer listings are available right now.' }}</p>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.auction-house{width:min(1240px,calc(100% - 36px));margin:24px auto 110px;padding:0}.auction-hero{min-height:190px;padding:30px 34px;display:grid;grid-template-columns:86px minmax(0,1fr) auto;align-items:center;gap:24px;border:1px solid #9b7139;background:radial-gradient(circle at 80% 0,#d29b4224,transparent 38%),linear-gradient(135deg,#1b1712,#0b0d11 65%);box-shadow:0 22px 70px #0007,inset 0 1px #f3c36a18}.auction-sigil{width:80px;height:80px;display:grid;place-items:center;border:1px solid #b9843e;color:#edbd61;background:#c18a3712;font-size:40px;box-shadow:inset 0 0 28px #bd85331c,0 0 25px #bd853315}.auction-title h1{margin:5px 0;color:#f0d29b;font-size:clamp(34px,5vw,58px);text-shadow:0 3px 20px #000}.auction-title>p:nth-of-type(2){max-width:620px;margin:0;color:#8d8982;font-size:11px}.auction-title>span{display:block;margin-top:16px;color:#806d4f;font-size:7px;font-weight:800;letter-spacing:.14em}.auction-title>span i{display:inline-block;width:6px;height:6px;margin-right:6px;border-radius:50%;background:#70bd79;box-shadow:0 0 9px #70bd79}.auction-wallet{min-width:190px;padding:18px 20px;border:1px solid #9b713955;background:#08090c99;text-align:right}.auction-wallet span,.auction-wallet strong,.auction-wallet small{display:block}.auction-wallet span,.market-summary span{color:#82745e;font-size:7px;font-weight:800;letter-spacing:.14em}.auction-wallet strong{margin:7px 0 4px;color:#edbc5d;font:800 25px Cinzel}.auction-wallet small{color:#55585e;font-size:7px}.market-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:7px;margin:9px 0}.market-summary article,.market-summary>button{min-height:68px;padding:12px 15px;display:flex;align-items:center;gap:11px;border:1px solid #ffffff10;color:#aaa;background:#ffffff04;text-align:left}.market-summary article>b{width:30px;color:#bd8b43;font-size:21px;text-align:center}.market-summary article strong{display:block;margin-top:4px;color:#d9c4a1;font:700 16px Cinzel}.market-summary>button{border-color:#a7783755;color:#c6964c;cursor:pointer}.market-summary>button b{font-size:20px}.market-summary>button span{font:700 8px Cinzel;white-space:nowrap}.listing-forge{padding:22px;border:1px solid #ffffff12;background:linear-gradient(145deg,#ffffff06,transparent)}.listing-forge>header{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:16px}.listing-forge h2{margin:4px 0;font-size:24px;text-transform:none}.listing-forge header p:last-child{margin:0;color:#72757a;font-size:9px}.listing-preview{min-width:125px;padding:10px;border-left:2px solid #b9853f;background:#b9853f0a;text-align:right}.listing-preview span,.listing-preview strong,.listing-preview small{display:block}.listing-preview span{color:#7f6f59;font-size:6px;font-weight:800;letter-spacing:.12em}.listing-preview strong{margin:3px 0;color:#dfac54;font:800 17px Cinzel}.listing-preview small{color:#5c5e63;font-size:7px}.auction-create{display:grid;grid-template-columns:minmax(240px,2fr) minmax(115px,.7fr) minmax(150px,.85fr) minmax(190px,1fr);align-items:stretch;gap:8px}.auction-create label{min-width:0;padding:11px;border:1px solid #ffffff0e;background:#07080b}.auction-create label>span{display:block;margin-bottom:7px;color:#8c7a60;font-size:7px;font-weight:800;letter-spacing:.12em}.auction-create select,.auction-create input,.market-toolbar input,.market-toolbar select{width:100%;min-width:0;height:37px;padding:0 10px;border:1px solid #ffffff17;outline:0;color:#ddd;background:#090a0d}.auction-create select:focus,.auction-create input:focus,.market-toolbar input:focus,.market-toolbar select:focus{border-color:#b88741}.auction-create label>small{display:block;margin-top:5px;color:#55585e;font-size:7px}.gold-input{position:relative}.gold-input>b{position:absolute;top:10px;left:10px;color:#d6a54e;font-size:11px}.gold-input input{padding-left:28px}.auction-create>button{min-height:70px;padding:10px 16px;display:grid;grid-template-columns:26px 1fr;align-items:center;gap:7px;border:1px solid #c18c3f;color:#191107;background:linear-gradient(#e4ba63,#b97c2d);text-align:left;cursor:pointer}.auction-create>button>b{font-size:21px}.auction-create>button>span{font:800 9px Cinzel}.auction-create>button small{display:block;margin-top:4px;font:600 7px Inter;opacity:.65}.auction-inventory-empty{margin:10px 0 0;color:#a76a61;font-size:8px}.auction-error{padding:12px 14px;display:flex;align-items:center;gap:9px;border:1px solid #a9564c66;color:#dc8378;background:#a9564c12;font-size:9px}.auction-error>b{width:19px;height:19px;display:grid;place-items:center;border:1px solid #a9564c88}.market-board{margin-top:12px}.market-toolbar{display:grid;grid-template-columns:auto minmax(200px,1fr) 160px;align-items:center;gap:8px;padding:10px;border:1px solid #ffffff11;background:#0c0d11}.market-tabs{display:flex;gap:3px}.market-tabs button{min-height:38px;padding:0 13px;border:1px solid transparent;color:#6e7076;background:transparent;font:700 8px Cinzel;cursor:pointer}.market-tabs button span{margin-left:5px;color:#9b7841}.market-tabs button.selected{border-color:#ad7f3d66;color:#e0ae56;background:#ad7f3d0d}.market-search{position:relative}.market-search>b{position:absolute;z-index:1;top:8px;left:11px;color:#806b4b;font-size:17px}.market-search input{padding-left:35px}.market-sort{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:7px}.market-sort>span{color:#696b71;font-size:6px;font-weight:800;letter-spacing:.12em}.auction-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:9px}.market-listing{padding:17px;border:1px solid #ffffff11;background:linear-gradient(140deg,#15161a,#0b0c0f);transition:transform .18s,border-color .18s,box-shadow .18s}.market-listing:hover{transform:translateY(-2px);border-color:#9a713d77;box-shadow:0 14px 35px #0005}.market-listing.owned{border-color:#63856b55;background:linear-gradient(140deg,#121915,#0b0c0f)}.market-listing.unaffordable{opacity:.68}.market-listing>header{display:grid;grid-template-columns:47px minmax(0,1fr) auto;align-items:center;gap:11px}.listing-icon{width:45px;height:45px;display:grid;place-items:center;border:1px solid #9a713d55;background:#ad7d350d;font-size:24px}.market-listing>header span{color:#866c45;font-size:6px;font-weight:800;letter-spacing:.12em}.market-listing>header h3{margin:4px 0 0;color:#ded4c4;font:700 14px Cinzel}.market-listing>header>small{align-self:start;color:#595c62;font-size:7px}.listing-stack,.listing-seller{margin-top:11px;padding:9px 10px;display:flex;align-items:center;justify-content:space-between;border:1px solid #ffffff0c;background:#07080b}.listing-stack span,.listing-seller span,.market-listing>footer>div>span{color:#686a70;font-size:6px;font-weight:800;letter-spacing:.11em}.listing-stack>strong{color:#dbb46c;font:800 18px Cinzel}.listing-stack>strong small{color:#6d6e72;font:500 8px Inter}.listing-seller{margin-top:4px}.listing-seller strong{color:#9b9da1;font:600 9px Cinzel}.market-listing>footer{margin-top:11px;display:grid;grid-template-columns:1fr minmax(130px,.65fr);align-items:end;gap:10px}.market-listing>footer>div>*{display:block}.market-listing>footer>div>strong{margin:4px 0 3px;color:#e1ae52;font:800 18px Cinzel}.market-listing>footer>div>small{color:#5e6065;font-size:7px}.market-listing>footer>button{min-height:39px;padding:8px;border:1px solid #bd8a3d;color:#e5b35d;background:#bd8a3d13;font:800 8px Cinzel;cursor:pointer}.market-listing>footer>button.cancel-listing{border-color:#8f514b;color:#c77b72;background:#8f514b0d}.auction-empty{grid-column:1/-1;min-height:230px;padding:40px;display:grid;place-items:center;align-content:center;border:1px dashed #ffffff15;color:#696b70;text-align:center}.auction-empty>b{color:#8d6a3b;font-size:42px}.auction-empty h3{margin:12px 0 5px;color:#a6a29a;font:700 17px Cinzel}.auction-empty p{margin:0;color:#62646a;font-size:9px}
@media(max-width:900px){.auction-hero{grid-template-columns:68px 1fr}.auction-sigil{width:64px;height:64px}.auction-wallet{grid-column:1/-1;text-align:left}.market-summary{grid-template-columns:repeat(3,1fr)}.market-summary>button{grid-column:1/-1;justify-content:center}.auction-create{grid-template-columns:2fr 1fr 1fr}.auction-create>button{grid-column:1/-1}.market-toolbar{grid-template-columns:1fr 1fr}.market-tabs{grid-column:1/-1}.auction-grid{grid-template-columns:1fr}}
@media(max-width:620px){.auction-house{width:100%;margin-top:10px;padding:0 10px}.auction-hero{min-height:0;padding:20px 16px;grid-template-columns:48px 1fr;gap:12px}.auction-sigil{width:46px;height:46px;font-size:25px}.auction-title h1{font-size:32px}.auction-title>p:nth-of-type(2){font-size:9px}.auction-wallet{min-width:0}.market-summary{grid-template-columns:1fr 1fr}.market-summary article:last-of-type{grid-column:1/-1}.listing-forge{padding:15px}.listing-forge>header{align-items:start;flex-direction:column}.listing-preview{width:100%;text-align:left}.auction-create{grid-template-columns:1fr 1fr}.auction-create .item-field{grid-column:1/-1}.market-toolbar{grid-template-columns:1fr}.market-tabs{display:grid;grid-template-columns:1fr 1fr}.market-search,.market-sort{grid-column:1/-1}.market-listing{padding:13px}.market-listing>footer{grid-template-columns:1fr}.market-listing>footer>button{width:100%}}
</style>
