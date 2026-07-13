<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { GAME_PACE_MULTIPLIER, type Gear, type GearSlot, type RareMaterial, type Recipe, type Resource, type Skill } from './gameData'

type DisplayRecipe = Recipe & { progress: number; remaining?: number }
type RecipeState = 'active' | 'ready' | 'missing' | 'locked'
type RecipeView = 'all' | 'gear' | 'components'

const props = defineProps<{
  recipes: DisplayRecipe[]
  inventory: Record<string, number>
  gearCatalog: Record<string, Gear>
  equipment: Partial<Record<GearSlot, string | undefined>>
  resources: Resource[]
  rareMaterials: RareMaterial[]
  recipeLevels: Record<string, number>
  craftingId: string
  profession: { level: number; xp: number; xpNeeded: number }
  stats: { speed: number; conservationChance: number; bonusOutputChance: number }
}>()

const emit = defineEmits<{
  craft: [recipe: Recipe]
  navigate: [skill: Skill]
}>()

const view = defineModel<RecipeView>('view', { default: 'gear' })
const selectedId = defineModel<string>('selectedId', { default: '' })
const recipeTrail = defineModel<string[]>('trail', { default: () => [] })
const search = ref('')

const views: Array<{ id: RecipeView; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'gear', label: 'Equipment' },
  { id: 'components', label: 'Components' },
]

const detailPanel = ref<HTMLElement>()

function requiredLevel(recipe: Recipe) {
  return props.recipeLevels[recipe.id] || 1
}

function missingMaterials(recipe: Recipe) {
  return Object.entries(recipe.costs).filter(([item, needed]) => (props.inventory[item] || 0) < needed)
}

function recipeState(recipe: DisplayRecipe): RecipeState {
  if (props.craftingId === recipe.id) return 'active'
  if (props.profession.level < requiredLevel(recipe)) return 'locked'
  if (missingMaterials(recipe).length) return 'missing'
  return 'ready'
}

function stateRank(recipe: DisplayRecipe) {
  const ranks: Record<RecipeState, number> = { active: 0, ready: 1, missing: 2, locked: 3 }
  return ranks[recipeState(recipe)]
}

function matchesView(recipe: Recipe, target: RecipeView) {
  if (target === 'all') return true
  return target === 'gear' ? Boolean(recipe.outputGear) : Boolean(recipe.outputItem)
}

const visibleRecipes = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.recipes
    .filter(recipe => matchesView(recipe, view.value))
    .filter(recipe => !query || [
      recipe.name,
      recipe.description,
      recipe.outputItem || '',
      ...Object.keys(recipe.costs),
    ].join(' ').toLowerCase().includes(query))
    .slice()
    .sort((a, b) => stateRank(a) - stateRank(b) || requiredLevel(a) - requiredLevel(b) || props.recipes.indexOf(a) - props.recipes.indexOf(b))
})

watch([visibleRecipes, () => props.craftingId], ([recipes, activeId]) => {
  if (!selectedId.value && activeId) {
    const active = props.recipes.find(recipe => recipe.id === activeId)
    if (active) {
      view.value = active.outputGear ? 'gear' : 'components'
      selectedId.value = active.id
      return
    }
  }
  if (recipes.some(recipe => recipe.id === selectedId.value)) return
  if (!search.value && !recipes.length) {
    const fallbackView: RecipeView | undefined = props.recipes.some(recipe => recipe.outputGear)
      ? 'gear'
      : props.recipes.some(recipe => recipe.outputItem) ? 'components' : undefined
    if (fallbackView && view.value !== fallbackView) {
      view.value = fallbackView
      return
    }
  }
  selectedId.value = recipes[0]?.id || ''
}, { immediate: true })

const selectedRecipe = computed(() => props.recipes.find(recipe => recipe.id === selectedId.value))
const activeRecipe = computed(() => props.recipes.find(recipe => recipe.id === props.craftingId))
const parentRecipe = computed(() => {
  const parentId = recipeTrail.value[recipeTrail.value.length - 1]
  return parentId ? props.recipes.find(recipe => recipe.id === parentId) : undefined
})

const xpPercent = computed(() => Math.max(0, Math.min(100, props.profession.xp / Math.max(1, props.profession.xpNeeded) * 100)))

function viewCount(target: RecipeView) {
  return props.recipes.filter(recipe => matchesView(recipe, target)).length
}

function selectView(target: RecipeView) {
  view.value = target
  recipeTrail.value = []
}

function selectRecipe(recipe: DisplayRecipe) {
  selectedId.value = recipe.id
  recipeTrail.value = []
  revealDetailsOnSmallScreen()
}

function ingredientRecipe(item: string) {
  return props.recipes.find(recipe => recipe.outputItem === item)
}

function ingredientSource(item: string): Skill | undefined {
  return props.resources.find(resource => resource.item === item)?.skill || props.rareMaterials.find(material => material.name === item)?.skill
}

function revealDetailsOnSmallScreen() {
  if (!window.matchMedia('(max-width: 900px)').matches) return
  void nextTick(() => {
    detailPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    detailPanel.value?.focus({ preventScroll: true })
  })
}

function openIngredient(item: string) {
  const recipe = ingredientRecipe(item)
  if (!recipe || !selectedRecipe.value) return
  recipeTrail.value = [...recipeTrail.value, selectedRecipe.value.id]
  view.value = 'components'
  search.value = ''
  selectedId.value = recipe.id
  revealDetailsOnSmallScreen()
}

function returnToParent() {
  const trail = [...recipeTrail.value]
  const parentId = trail.pop()
  if (!parentId) return
  const recipe = props.recipes.find(candidate => candidate.id === parentId)
  if (!recipe) return
  recipeTrail.value = trail
  view.value = recipe.outputGear ? 'gear' : 'components'
  search.value = ''
  selectedId.value = recipe.id
  revealDetailsOnSmallScreen()
}

function categoryIcon(recipe: Recipe) {
  if (recipe.outputGear) return props.gearCatalog[recipe.outputGear]?.icon || '⚒'
  return recipe.category === 'components' ? '◆' : recipe.category === 'tools' ? '⚒' : recipe.category === 'combat' ? '⚔' : '◈'
}

function outputLabel(recipe: Recipe) {
  if (recipe.outputGear) return props.gearCatalog[recipe.outputGear]?.name || recipe.name
  return `${recipe.outputQty || 1} × ${recipe.outputItem}`
}

function effectiveDuration(recipe: Recipe) {
  return Math.max(.1, recipe.duration * GAME_PACE_MULTIPLIER * (1 - props.stats.speed / 100))
}

function formatDuration(seconds: number) {
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`
}

function stateLabel(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'active') return 'Crafting'
  if (state === 'ready') return props.craftingId ? 'Ready next' : 'Ready'
  if (state === 'locked') return `Level ${requiredLevel(recipe)}`
  const count = missingMaterials(recipe).length
  return `Need ${count} ${count === 1 ? 'item' : 'items'}`
}

function statusTitle(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'active') return 'In the forge now'
  if (state === 'locked') return `Requires crafting level ${requiredLevel(recipe)}`
  if (state === 'missing') return 'Finish gathering these materials'
  if (props.craftingId) return 'Ready when the forge clears'
  return 'Everything is ready'
}

function statusMessage(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'active') return `${Math.floor(recipe.progress)}% complete. Its materials were handled when the project began.`
  if (state === 'locked') {
    const levels = requiredLevel(recipe) - props.profession.level
    return `Gain ${levels} more crafting ${levels === 1 ? 'level' : 'levels'} to unlock this recipe.`
  }
  if (state === 'missing') {
    const shortages = missingMaterials(recipe).map(([item, needed]) => `${Number(needed) - (props.inventory[item] || 0)} more ${item}`)
    return `You need ${shortages.join(', ')}.`
  }
  if (props.craftingId && activeRecipe.value) return `${activeRecipe.value.name} must finish before you can start this project.`
  return `Start this project now. It will take ${formatDuration(effectiveDuration(recipe))}.`
}

function actionLabel(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'active') return `CRAFTING · ${Math.floor(recipe.progress)}%`
  if (state === 'locked') return `LOCKED UNTIL LEVEL ${requiredLevel(recipe)}`
  if (state === 'missing') return 'MATERIALS STILL NEEDED'
  if (props.craftingId) return 'FORGE IS BUSY'
  return `START CRAFT · ${formatDuration(effectiveDuration(recipe))}`
}

function canCraft(recipe: DisplayRecipe) {
  return recipeState(recipe) === 'ready' && !props.craftingId
}

function gearFor(recipe: Recipe) {
  return recipe.outputGear ? props.gearCatalog[recipe.outputGear] : undefined
}

function equippedGearFor(recipe: Recipe) {
  const gear = gearFor(recipe)
  const equippedId = gear ? props.equipment[gear.slot] : undefined
  return equippedId ? props.gearCatalog[equippedId] : undefined
}

function formatBonus(stat: string, amount: number) {
  const labels: Record<string, string> = {
    attack: 'Attack', defense: 'Defense', maxHealth: 'Health', attackSpeed: 'Attack speed',
    woodSpeed: 'Woodcutting speed', miningSpeed: 'Mining speed', fishingSpeed: 'Fishing speed', woodYield: 'Woodcutting yield', miningYield: 'Mining yield', fishingYield: 'Fishing yield',
    woodBonusYieldPercent: 'Woodcutting bonus yield', miningBonusYieldPercent: 'Mining bonus yield', fishingBonusYieldPercent: 'Fishing bonus yield',
    woodCrit: 'Woodcutting crit chance', miningCrit: 'Mining crit chance', fishingCrit: 'Fishing crit chance',
    critPower: 'Crit power', recoverySpeed: 'Recovery time', encounterSpeed: 'Enemy load time',
  }
  const percent = stat.includes('Speed') && stat !== 'attackSpeed' || stat.includes('Crit') || stat.includes('BonusYield')
  const value = stat === 'attackSpeed' || stat === 'recoverySpeed' || stat === 'encounterSpeed'
    ? `-${amount}ms`
    : stat === 'critPower'
      ? `+${amount}×`
      : `+${amount}${percent ? '%' : ''}`
  return `${value} ${labels[stat] || stat}`
}

function outputOwned(recipe: Recipe) {
  return recipe.outputItem ? props.inventory[recipe.outputItem] || 0 : 0
}

function formatDelta(stat: string, difference: number) {
  const absolute = Math.abs(difference)
  if (stat === 'attackSpeed' || stat === 'recoverySpeed' || stat === 'encounterSpeed') return `${difference >= 0 ? '-' : '+'}${absolute}ms`
  if (stat === 'critPower') return `${difference >= 0 ? '+' : '-'}${absolute}×`
  const percent = stat.includes('Speed') || stat.includes('Crit') || stat.includes('BonusYield')
  return `${difference >= 0 ? '+' : '-'}${absolute}${percent ? '%' : ''}`
}

function gearComparison(recipe: Recipe) {
  const gear = gearFor(recipe)
  if (!gear) return ''
  const equipped = equippedGearFor(recipe)
  if (!equipped) return 'Your equipment slot is empty, so every listed bonus is an upgrade.'
  const stats = new Set([...Object.keys(gear.bonuses), ...Object.keys(equipped.bonuses)])
  const changes = [...stats].map(stat => {
    const amount = Number(gear.bonuses[stat as keyof Gear['bonuses']] || 0)
    const current = Number(equipped.bonuses[stat as keyof Gear['bonuses']] || 0)
    const difference = amount - current
    const label = stat === 'maxHealth'
      ? 'health'
      : stat === 'woodBonusYieldPercent'
        ? 'woodcutting bonus yield'
        : stat === 'miningBonusYieldPercent'
          ? 'mining bonus yield'
          : stat === 'fishingBonusYieldPercent'
            ? 'fishing bonus yield'
          : stat.replace(/([A-Z])/g, ' $1').toLowerCase()
    return difference === 0 ? '' : `${formatDelta(stat, difference)} ${label}`
  }).filter(Boolean)
  return `Compared with ${equipped.name}: ${changes.join(' · ') || 'no stat change'}`
}

function missingMaterialHint(item: string, needed: number) {
  const deficit = needed - (props.inventory[item] || 0)
  const component = ingredientRecipe(item)
  if (component) {
    const batches = Math.ceil(deficit / (component.outputQty || 1))
    return `Craft ${batches} ${batches === 1 ? 'batch' : 'batches'} to make ${deficit} more`
  }
  const rareSource = props.rareMaterials.find(material => material.name === item)
  if (rareSource) return `${rareSource.description} · find ${deficit} more`
  const source = ingredientSource(item)
  return source ? `${source} · gather ${deficit} more` : `Find ${deficit} more`
}

function activeTimeRemaining(recipe: DisplayRecipe) {
  return Math.max(0, recipe.remaining ?? effectiveDuration(recipe) * (1 - recipe.progress / 100))
}
</script>

<template>
  <section class="page-content crafting-page">
    <header class="crafting-heading">
      <div>
        <p class="eyebrow">THE EMBER FORGE</p>
        <h1>Crafting</h1>
        <p>Pick a recipe. The forge will show exactly what you have, what is missing, and where to get it.</p>
      </div>
      <div class="crafting-level" aria-label="Crafting level progress">
        <div><span>CRAFTING LEVEL</span><strong>{{ profession.level }}</strong></div>
        <small>{{ profession.xp.toLocaleString() }} / {{ profession.xpNeeded.toLocaleString() }} XP</small>
        <div class="meter" role="progressbar" aria-label="Crafting experience" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(xpPercent)"><i :style="{ width: `${xpPercent}%` }"></i></div>
        <p><span>Speed +{{ stats.speed }}%</span><span>Save {{ stats.conservationChance }}%</span><span>Double {{ stats.bonusOutputChance }}%</span></p>
      </div>
    </header>

    <article v-if="activeRecipe" class="crafting-job">
      <b>{{ categoryIcon(activeRecipe) }}</b>
      <div class="crafting-job-copy">
        <span>FORGE ACTIVE</span>
        <strong>{{ activeRecipe.name }}</strong>
        <small>{{ formatDuration(activeTimeRemaining(activeRecipe)) }} remaining</small>
      </div>
      <div class="crafting-job-progress">
        <strong>{{ Math.floor(activeRecipe.progress) }}%</strong>
        <div class="meter" role="progressbar" :aria-label="`${activeRecipe.name} crafting progress`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(activeRecipe.progress)"><i :style="{ width: `${activeRecipe.progress}%` }"></i></div>
      </div>
    </article>

    <div class="crafting-workbench">
      <aside class="recipe-browser">
        <div class="recipe-browser-heading">
          <div><span>STEP 1</span><h2>Choose a recipe</h2></div>
          <small>{{ visibleRecipes.length }} shown</small>
        </div>

        <div class="recipe-view-tabs" aria-label="Recipe type">
          <button v-for="item in views" :key="item.id" :class="{ selected: view === item.id }" :aria-pressed="view === item.id" @click="selectView(item.id)">
            {{ item.label }} <span>{{ viewCount(item.id) }}</span>
          </button>
        </div>

        <div class="recipe-search">
          <span class="sr-only">Search recipes or materials</span>
          <b aria-hidden="true">⌕</b>
          <input v-model="search" type="search" aria-label="Search recipes or materials" placeholder="Search recipes or materials…">
          <button v-if="search" type="button" aria-label="Clear search" @click="search = ''">×</button>
        </div>

        <div v-if="visibleRecipes.length" class="recipe-list">
          <button
            v-for="recipe in visibleRecipes"
            :key="recipe.id"
            class="recipe-row"
            :class="[`is-${recipeState(recipe)}`, { selected: selectedRecipe?.id === recipe.id }]"
            :aria-pressed="selectedRecipe?.id === recipe.id"
            @click="selectRecipe(recipe)"
          >
            <b class="recipe-row-icon">{{ categoryIcon(recipe) }}</b>
            <span class="recipe-row-copy">
              <strong>{{ recipe.name }}</strong>
              <small>{{ recipe.outputGear ? 'Equipment' : outputLabel(recipe) }} · {{ formatDuration(effectiveDuration(recipe)) }}</small>
            </span>
            <em>{{ stateLabel(recipe) }}</em>
          </button>
        </div>

        <div v-else class="recipe-list-empty">
          <b>◇</b>
          <strong>No matching recipes</strong>
          <button @click="search = ''; view = 'all'">CLEAR FILTERS</button>
        </div>
      </aside>

      <article v-if="selectedRecipe" ref="detailPanel" class="recipe-detail" tabindex="-1">
        <button v-if="parentRecipe" class="recipe-back" @click="returnToParent">
          <span>← BACK TO</span><strong>{{ parentRecipe.name }}</strong>
        </button>

        <header class="recipe-detail-heading">
          <div class="recipe-detail-icon" :class="`is-${recipeState(selectedRecipe)}`">{{ categoryIcon(selectedRecipe) }}</div>
          <div>
            <span>STEP 2 · {{ selectedRecipe.outputGear ? 'EQUIPMENT' : 'COMPONENT' }} · LEVEL {{ requiredLevel(selectedRecipe) }}</span>
            <h2>{{ selectedRecipe.name }}</h2>
            <p>{{ selectedRecipe.description }}</p>
          </div>
          <small>{{ formatDuration(effectiveDuration(selectedRecipe)) }}</small>
        </header>

        <section class="recipe-result">
          <div class="recipe-section-title"><span>YOU WILL RECEIVE</span><small v-if="!selectedRecipe.outputGear">{{ outputOwned(selectedRecipe).toLocaleString() }} currently owned</small></div>
          <div class="recipe-result-card">
            <b>{{ categoryIcon(selectedRecipe) }}</b>
            <div>
              <strong>{{ outputLabel(selectedRecipe) }}</strong>
              <template v-if="gearFor(selectedRecipe)">
                <small>Tier {{ gearFor(selectedRecipe)?.tier }} · {{ gearFor(selectedRecipe)?.slot }}</small>
                <p>{{ Object.entries(gearFor(selectedRecipe)?.bonuses || {}).map(([stat, value]) => formatBonus(stat, Number(value))).join(' · ') || 'No stat bonuses' }}</p>
                <em>{{ gearComparison(selectedRecipe) }}</em>
              </template>
              <template v-else>
                <small>After crafting: {{ (outputOwned(selectedRecipe) + (selectedRecipe.outputQty || 1)).toLocaleString() }} owned</small>
                <p v-if="stats.bonusOutputChance">{{ stats.bonusOutputChance }}% chance to create a second batch.</p>
              </template>
            </div>
          </div>
        </section>

        <section class="recipe-requirements">
          <div class="recipe-section-title"><span>MATERIALS</span><small>Materials are spent when crafting starts</small></div>
          <div class="material-checklist">
            <article v-for="(needed, item) in selectedRecipe.costs" :key="item" :class="{ missing: recipeState(selectedRecipe) !== 'active' && (inventory[item] || 0) < Number(needed) }">
              <b>{{ recipeState(selectedRecipe) === 'active' || (inventory[item] || 0) >= Number(needed) ? '✓' : '!' }}</b>
              <div>
                <strong>{{ item }}</strong>
                <small v-if="recipeState(selectedRecipe) === 'active'">Handled when this project started</small>
                <small v-else-if="(inventory[item] || 0) >= Number(needed)">{{ ((inventory[item] || 0) - Number(needed)).toLocaleString() }} left after crafting</small>
                <small v-else>{{ missingMaterialHint(String(item), Number(needed)) }}</small>
              </div>
              <p><span>{{ recipeState(selectedRecipe) === 'active' ? 'CURRENT' : 'OWNED' }}</span><strong>{{ (inventory[item] || 0).toLocaleString() }}</strong></p>
              <p><span>{{ recipeState(selectedRecipe) === 'active' ? 'RECIPE' : 'NEEDED' }}</span><strong>{{ Number(needed).toLocaleString() }}</strong></p>
              <span v-if="recipeState(selectedRecipe) === 'active'" class="material-ready">COMMITTED</span>
              <button v-else-if="(inventory[item] || 0) < Number(needed) && ingredientRecipe(String(item))" @click="openIngredient(String(item))">MAKE</button>
              <button v-else-if="(inventory[item] || 0) < Number(needed) && ingredientSource(String(item))" @click="emit('navigate', ingredientSource(String(item))!)">GATHER</button>
              <span v-else-if="(inventory[item] || 0) >= Number(needed)" class="material-ready">READY</span>
              <span v-else class="material-source">RARE DROP</span>
            </article>
          </div>
        </section>

        <footer class="recipe-action-panel" :class="[`is-${recipeState(selectedRecipe)}`, { 'is-busy': craftingId && recipeState(selectedRecipe) !== 'active' }]">
          <div>
            <span>STEP 3</span>
            <strong>{{ statusTitle(selectedRecipe) }}</strong>
            <p>{{ statusMessage(selectedRecipe) }}</p>
          </div>
          <button :disabled="!canCraft(selectedRecipe)" @click="emit('craft', selectedRecipe)">
            <template v-if="recipeState(selectedRecipe) === 'active'">
              <span>CRAFTING · {{ Math.floor(selectedRecipe.progress) }}%</span>
              <span class="recipe-craft-progress" role="progressbar" :aria-label="`${selectedRecipe.name} crafting progress`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(selectedRecipe.progress)">
                <i :style="{ width: `${selectedRecipe.progress}%` }"></i>
              </span>
            </template>
            <template v-else>{{ actionLabel(selectedRecipe) }}</template>
          </button>
        </footer>
      </article>

      <div v-else class="recipe-detail recipe-detail-empty">
        <b>◇</b><strong>Select a recipe to inspect it</strong>
      </div>
    </div>
  </section>
</template>
