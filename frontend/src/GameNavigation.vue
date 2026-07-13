<script setup lang="ts">
import { computed } from 'vue'
import type { Page } from './gameData'

const props = defineProps<{ modelValue: Page; available: Page[] }>()
const emit = defineEmits<{ 'update:modelValue': [page: Page] }>()

const groups: Array<{ name: string; pages: Page[] }> = [
  { name: 'Adventure', pages: ['battle'] },
  { name: 'Professions', pages: ['woodcutting', 'mining', 'fishing', 'farming', 'crafting', 'cooking'] },
  { name: 'Realm', pages: ['workers', 'metal detector', 'factions', 'auction', 'shop'] },
  { name: 'Character', pages: ['inventory', 'achievements', 'high scores'] },
]

const visibleGroups = computed(() => groups.map(group => ({
  ...group,
  pages: group.pages.filter(page => props.available.includes(page)),
})).filter(group => group.pages.length))

const labels: Record<Page, string> = {
  battle: 'Battle', woodcutting: 'Woodcutting', mining: 'Mining', fishing: 'Fishing', farming: 'Farming', crafting: 'Crafting', cooking: 'Cooking',
  'metal detector': 'Metal Detector', workers: 'Workers', inventory: 'Inventory', achievements: 'Achievements', factions: 'Factions', auction: 'Auction', 'high scores': 'High Scores', shop: 'Shop',
}

const icons: Record<Page, string> = {
  battle: '⚔', woodcutting: '🪓', mining: '⛏', fishing: '🎣', farming: '🌾', crafting: '🔨', cooking: '🍲',
  'metal detector': '⌁', workers: '♟', inventory: '🎒', achievements: '★', factions: '⚑', auction: '⚖', 'high scores': '♛', shop: '◈',
}
</script>

<template>
  <nav class="area-navigation" aria-label="Game navigation">
    <section v-for="group in visibleGroups" :key="group.name" class="navigation-group">
      <span>{{ group.name }}</span>
      <div>
        <template v-for="item in group.pages" :key="item">
          <i v-if="item === 'cooking'" class="cooking-separator" aria-hidden="true">|</i>
          <button type="button" :class="{ selected: modelValue === item }" @click="emit('update:modelValue', item)">
            <b>{{ icons[item] }}</b>{{ labels[item] }}
          </button>
        </template>
      </div>
    </section>
  </nav>
</template>

<style scoped>
.area-navigation{position:sticky;top:68px;z-index:9;min-height:57px;padding:7px clamp(12px,2vw,30px);display:flex;justify-content:center;gap:18px;border-bottom:1px solid #ffffff0d;background:#0b0c10f5;backdrop-filter:blur(9px);overflow-x:auto;scrollbar-width:thin;scrollbar-color:#8b6835 #0b0c10}.navigation-group{flex:0 0 auto}.navigation-group>span{display:block;margin:0 0 3px 7px;color:#515359;font-size:7px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.navigation-group>div{display:flex;align-items:center;gap:2px}.navigation-group button{padding:7px 9px;border:1px solid transparent;color:#74777c;background:transparent;font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;cursor:pointer}.navigation-group button b{margin-right:5px;color:#8c7042}.navigation-group button:hover{color:#c5c6c7;background:#ffffff05}.navigation-group button.selected{border-color:#d5a54e45;color:#edc46f;background:#d5a54e0c}.navigation-group button.selected b{color:#e4b45d}.cooking-separator{margin:0 5px;color:#d88445;font:800 19px/1 Cinzel;text-shadow:0 0 8px #d8844588}
@media(max-width:720px){.area-navigation{min-height:44px;padding:5px 7px;justify-content:flex-start;gap:3px}.navigation-group>span{display:none}.navigation-group>div{gap:0}.navigation-group button{min-height:34px;padding:6px 9px;font-size:7px}.navigation-group button b{margin-right:4px}.cooking-separator{margin:0 3px;font-size:17px}}
</style>
