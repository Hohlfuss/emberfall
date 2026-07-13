<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ inventory: Record<string, number>; error: string; notice: string; busy: boolean }>()
const emit = defineEmits<{ send: [recipient: string, item: string, quantity: number] }>()
const recipient = ref('')
const item = ref('')
const quantity = ref(1)
const items = computed(() => Object.entries(props.inventory).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b)))

watch(items, available => {
  if (item.value && !available.some(([name]) => name === item.value)) item.value = ''
})

watch(() => props.notice, notice => {
  if (!notice) return
  recipient.value = ''
  item.value = ''
  quantity.value = 1
})
</script>

<template>
  <details class="gift-panel">
    <summary><span>🎁</span><div><strong>Send a Gift</strong><small>Transfer inventory items directly to another player</small></div><b>OPEN</b></summary>
    <form @submit.prevent="emit('send', recipient, item, quantity)">
      <label><span>PLAYER NAME</span><input v-model="recipient" maxlength="30" placeholder="Unique display name or username" required></label>
      <label><span>ITEM OR MATERIAL</span><select v-model="item" required><option value="" disabled>Choose from inventory</option><option v-for="([name,count]) in items" :key="name" :value="name">{{ name }} ({{ count }})</option></select></label>
      <label><span>QUANTITY</span><input v-model.number="quantity" type="number" min="1" :max="inventory[item] || 1" required></label>
      <button :disabled="busy || !recipient.trim() || !item || quantity < 1">SEND GIFT</button>
    </form>
    <p v-if="error" class="gift-feedback error" role="alert">{{ error }}</p>
    <p v-else-if="notice" class="gift-feedback success" role="status">{{ notice }}</p>
    <small class="gift-note">Gifts are immediate and cannot be taken back.</small>
  </details>
</template>

<style scoped>
.gift-panel{margin:0 0 14px;border:1px solid #7f6aa044;background:linear-gradient(120deg,#765c9210,transparent)}.gift-panel summary{padding:14px 17px;display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:10px;list-style:none;cursor:pointer}.gift-panel summary::-webkit-details-marker{display:none}.gift-panel summary>span{font-size:24px}.gift-panel summary strong,.gift-panel summary small{display:block}.gift-panel summary strong{font:700 13px Cinzel}.gift-panel summary small{margin-top:3px;color:#707278;font-size:8px}.gift-panel summary>b{color:#aa86c4;font-size:7px;letter-spacing:.12em}.gift-panel[open] summary>b{font-size:0}.gift-panel[open] summary>b::after{content:'CLOSE';font-size:7px}.gift-panel form{padding:0 17px 14px;display:grid;grid-template-columns:1.2fr 1.4fr .55fr auto;align-items:end;gap:7px}.gift-panel label{display:grid;gap:5px}.gift-panel label>span{color:#777a80;font-size:7px;font-weight:800;letter-spacing:.1em}.gift-panel input,.gift-panel select{width:100%;min-width:0;padding:10px;border:1px solid #ffffff17;outline:0;color:#ddd;background:#06070a}.gift-panel input:focus,.gift-panel select:focus{border-color:#9a75b5}.gift-panel button{height:37px;padding:0 15px;border:1px solid #9871b4;color:#d4adee;background:#865ba016;font:700 8px Cinzel;cursor:pointer}.gift-feedback{margin:0 17px 10px;padding:9px;border:1px solid;font-size:9px}.gift-feedback.error{border-color:#a9564c55;color:#d77b70}.gift-feedback.success{border-color:#60a86c55;color:#82c98d}.gift-note{display:block;padding:0 17px 13px;color:#56585e;font-size:7px}
@media(max-width:760px){.gift-panel form{grid-template-columns:1fr 1fr}.gift-panel label:first-child{grid-column:1/-1}.gift-panel button{width:100%}}
@media(max-width:480px){.gift-panel form{grid-template-columns:1fr}.gift-panel label:first-child{grid-column:auto}.gift-panel summary{padding:12px}.gift-panel form{padding:0 12px 12px}}
</style>
