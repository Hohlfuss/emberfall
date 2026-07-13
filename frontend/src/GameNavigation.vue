<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Page } from './gameData'

const props = defineProps<{
  modelValue: Page
  available: Page[]
}>()

const emit = defineEmits<{ 'update:modelValue': [page: Page] }>()
const menuOpen = ref(false)
const menuSection = ref<'gather' | 'make' | 'more'>('gather')

const groups: Array<{ name: string; icon: string; pages: Page[] }> = [
  { name: 'Adventure', icon: '⚔', pages: ['battle'] },
  { name: 'Professions', icon: '◆', pages: ['woodcutting', 'mining', 'fishing', 'farming', 'crafting', 'cooking'] },
  { name: 'Realm', icon: '⌂', pages: ['workers', 'metal detector', 'factions', 'auction', 'shop'] },
  { name: 'Character', icon: '♙', pages: ['inventory', 'achievements', 'high scores'] },
]

const visibleGroups = computed(() => groups.map(group => ({
  ...group,
  pages: group.pages.filter(page => props.available.includes(page)),
})).filter(group => group.pages.length))

const gatheringPages: Page[] = ['woodcutting', 'mining', 'fishing', 'farming']
const makingPages: Page[] = ['crafting', 'cooking']
const isGathering = computed(() => gatheringPages.includes(props.modelValue))
const isMaking = computed(() => makingPages.includes(props.modelValue))
const isMore = computed(() => props.modelValue !== 'battle' && props.modelValue !== 'inventory' && !isGathering.value && !isMaking.value)
const sheetGroups = computed(() => {
  if (menuSection.value === 'gather') {
    return [{ name: 'Gathering', icon: '◆', pages: gatheringPages.filter(page => props.available.includes(page)) }]
  }
  if (menuSection.value === 'make') {
    return [{ name: 'Workshop', icon: '◇', pages: makingPages.filter(page => props.available.includes(page)) }]
  }
  return visibleGroups.value
    .map(group => ({ ...group, pages: group.pages.filter(page => !['battle', 'inventory', ...gatheringPages, ...makingPages].includes(page)) }))
    .filter(group => group.pages.length)
})
const sheetTitle = computed(() => menuSection.value === 'gather' ? 'Choose a gathering area' : menuSection.value === 'make' ? 'Choose a workshop' : 'More destinations')

const labels: Record<Page, string> = {
  battle: 'Battle', woodcutting: 'Woodcutting', mining: 'Mining', fishing: 'Fishing', farming: 'Farming', crafting: 'Crafting', cooking: 'Cooking',
  'metal detector': 'Metal Detector', workers: 'Workers', inventory: 'Inventory', achievements: 'Achievements', factions: 'Factions', auction: 'Auction', 'high scores': 'High Scores', shop: 'Shop',
}

const icons: Record<Page, string> = {
  battle: '⚔', woodcutting: '🪓', mining: '⛏', fishing: '🎣', farming: '🌾', crafting: '🔨', cooking: '🍲',
  'metal detector': '⌁', workers: '♟', inventory: '🎒', achievements: '★', factions: '⚑', auction: '⚖', 'high scores': '♛', shop: '◈',
}

function select(page: Page) {
  emit('update:modelValue', page)
  menuOpen.value = false
}

function openMenu(section: 'gather' | 'make' | 'more') {
  menuSection.value = section
  menuOpen.value = true
}
</script>

<template>
  <nav class="desktop-navigation" aria-label="Game navigation">
    <section v-for="group in visibleGroups" :key="group.name" class="navigation-group">
      <span>{{ group.name }}</span>
      <div>
        <button v-for="item in group.pages" :key="item" type="button" :class="{ selected: modelValue === item }" @click="select(item)">
          <b>{{ icons[item] }}</b>{{ labels[item] }}
        </button>
      </div>
    </section>
  </nav>

  <nav class="mobile-navigation" aria-label="Game navigation">
    <button type="button" :class="{ selected: modelValue === 'battle' }" @click="select('battle')"><b>⚔</b><span>Battle</span></button>
    <button type="button" :class="{ selected: isGathering }" @click="openMenu('gather')"><b>◆</b><span>Gather</span></button>
    <button type="button" :class="{ selected: isMaking }" @click="openMenu('make')"><b>◇</b><span>Make</span></button>
    <button type="button" :class="{ selected: modelValue === 'inventory' }" @click="select('inventory')"><b>🎒</b><span>Inventory</span></button>
    <button type="button" :class="{ selected: isMore }" @click="openMenu('more')"><b>☰</b><span>More</span></button>
  </nav>

  <Teleport to="body">
    <Transition name="navigation-sheet">
      <div v-if="menuOpen" class="navigation-backdrop" @click.self="menuOpen = false">
        <section class="navigation-sheet" role="dialog" aria-modal="true" aria-label="Explore Emberfall">
          <header><div><span>EMBERFALL</span><strong>{{ sheetTitle }}</strong></div><button type="button" aria-label="Close menu" @click="menuOpen = false">×</button></header>
          <div class="navigation-sheet-groups">
            <section v-for="group in sheetGroups" :key="group.name">
              <h2>{{ group.icon }} {{ group.name }}</h2>
              <div>
                <button v-for="item in group.pages" :key="item" type="button" :class="{ selected: modelValue === item }" @click="select(item)">
                  <b>{{ icons[item] }}</b><span>{{ labels[item] }}</span>
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.desktop-navigation{position:sticky;top:68px;z-index:9;min-height:57px;padding:7px clamp(12px,2vw,30px);display:flex;justify-content:center;gap:18px;border-bottom:1px solid #ffffff0d;background:#0b0c10f5;backdrop-filter:blur(9px);overflow-x:auto}.navigation-group{flex:0 0 auto}.navigation-group>span{display:block;margin:0 0 3px 7px;color:#515359;font-size:7px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.navigation-group>div{display:flex;gap:2px}.navigation-group button{padding:7px 9px;border:1px solid transparent;color:#74777c;background:transparent;font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;cursor:pointer}.navigation-group button b{margin-right:5px;color:#8c7042}.navigation-group button:hover{color:#c5c6c7;background:#ffffff05}.navigation-group button.selected{border-color:#d5a54e45;color:#edc46f;background:#d5a54e0c}.navigation-group button.selected b{color:#e4b45d}.mobile-navigation{display:none}.navigation-backdrop{position:fixed;inset:0;z-index:190;display:flex;align-items:flex-end;background:#050609b8;backdrop-filter:blur(4px)}.navigation-sheet{width:100%;max-height:min(82vh,720px);overflow:auto;padding:18px 16px calc(88px + env(safe-area-inset-bottom));border-top:1px solid #d5a54e55;background:radial-gradient(circle at 50% 0,#d5a54e15,transparent 34%),#0b0d11;box-shadow:0 -24px 80px #000c}.navigation-sheet>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.navigation-sheet>header span,.navigation-sheet>header strong{display:block}.navigation-sheet>header span{color:#a47c3e;font-size:8px;font-weight:800;letter-spacing:.18em}.navigation-sheet>header strong{margin-top:4px;font:700 20px Cinzel}.navigation-sheet>header button{width:36px;height:36px;border:1px solid #ffffff18;color:#aaa;background:#ffffff06;font-size:22px}.navigation-sheet-groups{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.navigation-sheet-groups h2{margin:0 0 8px;color:#777a80;font:700 10px Cinzel;letter-spacing:.08em;text-transform:uppercase}.navigation-sheet-groups section>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.navigation-sheet-groups button{min-height:58px;padding:8px;display:flex;align-items:center;gap:9px;border:1px solid #ffffff0f;color:#b8b9bc;background:#ffffff04;text-align:left}.navigation-sheet-groups button b{width:23px;color:#d3a24f;font-size:17px;text-align:center}.navigation-sheet-groups button span{font-size:9px;font-weight:700}.navigation-sheet-groups button.selected{border-color:#d5a54e66;color:#f0c675;background:#d5a54e10}.navigation-sheet>footer{margin-top:18px;padding:13px;display:grid;grid-template-columns:35px 1fr auto;align-items:center;gap:11px;border:1px solid #a87d3f4d;background:#a87d3f0b}.navigation-sheet>footer>b{font-size:25px}.navigation-sheet>footer span,.navigation-sheet>footer strong{display:block}.navigation-sheet>footer span{color:#8e7042;font-size:7px;font-weight:800;letter-spacing:.1em}.navigation-sheet>footer strong{margin-top:4px;color:#d7c39d;font:700 10px Cinzel}.navigation-sheet>footer button{padding:9px 11px;border:1px solid #d2a04a;color:#171008;background:#d2a04a;font:800 8px Cinzel}.navigation-sheet>footer.all-areas-open{grid-template-columns:35px 1fr}.navigation-sheet-enter-active,.navigation-sheet-leave-active{transition:opacity .2s ease}.navigation-sheet-enter-active .navigation-sheet,.navigation-sheet-leave-active .navigation-sheet{transition:transform .2s ease}.navigation-sheet-enter-from,.navigation-sheet-leave-to{opacity:0}.navigation-sheet-enter-from .navigation-sheet,.navigation-sheet-leave-to .navigation-sheet{transform:translateY(35px)}
@media(max-width:720px){.desktop-navigation{display:none}.mobile-navigation{position:fixed;left:0;right:0;bottom:0;z-index:160;height:66px;padding:5px 4px calc(5px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid #ffffff16;background:#090b0ff7;box-shadow:0 -12px 35px #000a;backdrop-filter:blur(10px)}.mobile-navigation button{min-width:0;display:grid;place-items:center;align-content:center;gap:2px;border:0;color:#66696f;background:transparent;font-size:7px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.mobile-navigation button b{font-size:16px;font-weight:400}.mobile-navigation button.selected{color:#e6b75f}.mobile-navigation button.selected b{filter:drop-shadow(0 0 7px #d5a54e88)}.navigation-sheet-groups{grid-template-columns:1fr}.navigation-sheet-groups section>div{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:410px){.navigation-sheet-groups section>div{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
