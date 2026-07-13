<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { GAME_PACE_MULTIPLIER, type CookingRecipe } from './gameData'

type DisplayRecipe = CookingRecipe & { progress: number; remaining?: number }
type RecipeState = 'active' | 'ready' | 'missing' | 'locked'

const props = defineProps<{
  recipes: DisplayRecipe[]
  inventory: Record<string, number>
  cookingId: string
  profession: { level: number; xp: number; xpNeeded: number }
  stats: { speed: number; conservationChance: number; bonusDishChance: number; totalCooked: number; ingredientsSaved: number; bonusDishes: number }
  healingValues: Record<string, number>
  hotValues: Record<string, { healing: number; duration: number }>
}>()

const emit = defineEmits<{ cook: [recipe: CookingRecipe] }>()
const search = ref('')
const selectedId = ref('')
const detailPanel = ref<HTMLElement>()

function missingIngredients(recipe: CookingRecipe) {
  return Object.entries(recipe.costs).filter(([item, quantity]) => (props.inventory[item] || 0) < quantity)
}

function recipeState(recipe: DisplayRecipe): RecipeState {
  if (props.cookingId === recipe.id) return 'active'
  if (props.profession.level < recipe.tier) return 'locked'
  if (missingIngredients(recipe).length) return 'missing'
  return 'ready'
}

function stateRank(recipe: DisplayRecipe) {
  return ({ active: 0, ready: 1, missing: 2, locked: 3 })[recipeState(recipe)]
}

const visibleRecipes = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.recipes
    .filter(recipe => !query || [recipe.name, recipe.description, recipe.outputItem, ...Object.keys(recipe.costs)].join(' ').toLowerCase().includes(query))
    .slice()
    .sort((a, b) => stateRank(a) - stateRank(b) || a.tier - b.tier)
})

watch([visibleRecipes, () => props.cookingId], ([recipes, activeId]) => {
  if (activeId && !selectedId.value) selectedId.value = activeId
  if (!recipes.some(recipe => recipe.id === selectedId.value)) selectedId.value = recipes[0]?.id || ''
}, { immediate: true })

const selectedRecipe = computed(() => props.recipes.find(recipe => recipe.id === selectedId.value))

function effectiveDuration(recipe: CookingRecipe) {
  return Math.max(.1, recipe.duration * GAME_PACE_MULTIPLIER * (1 - props.stats.speed / 100))
}

function formatDuration(seconds: number) {
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.ceil(seconds)}s`
}

function effectiveHealing(recipe: CookingRecipe) {
  return props.healingValues[recipe.outputItem] || recipe.healing
}

function effectiveHotHealing(recipe: CookingRecipe) {
  return props.hotValues[recipe.outputItem]?.healing || recipe.hot?.healing || 0
}

function canCook(recipe: DisplayRecipe) {
  return recipeState(recipe) === 'ready' && !props.cookingId
}

function stateLabel(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'active') return 'Cooking'
  if (state === 'ready') return props.cookingId ? 'Ready next' : 'Ready'
  if (state === 'locked') return `Level ${recipe.tier}`
  return `Need ${missingIngredients(recipe).length}`
}

function statusTitle(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'active') return 'Cooking now'
  if (state === 'locked') return `Requires cooking level ${recipe.tier}`
  if (state === 'missing') return 'Ingredients still needed'
  if (props.cookingId) return 'The kitchen is busy'
  return 'Ready to cook'
}

function statusMessage(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'active') return `${Math.floor(recipe.progress)}% complete.`
  if (state === 'locked') return `Raise Cooking by ${recipe.tier - props.profession.level} more ${recipe.tier - props.profession.level === 1 ? 'level' : 'levels'}.`
  if (state === 'missing') return `Find ${missingIngredients(recipe).map(([item, needed]) => `${Number(needed) - (props.inventory[item] || 0)} ${item}`).join(', ')}.`
  if (props.cookingId) return 'Finish the current dish before starting another.'
  return `Takes ${formatDuration(effectiveDuration(recipe))}.`
}

function actionLabel(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'locked') return `COOK · LEVEL ${recipe.tier} REQUIRED`
  if (state === 'missing') return 'COOK · INGREDIENTS NEEDED'
  if (props.cookingId) return 'COOK · KITCHEN BUSY'
  return `COOK · ${formatDuration(effectiveDuration(recipe))}`
}

function selectRecipe(recipe: DisplayRecipe) {
  selectedId.value = recipe.id
  if (window.matchMedia('(max-width: 900px)').matches) {
    nextTick(() => detailPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
}
</script>

<template>
  <section class="page-content crafting-page cooking-page">
    <header class="crafting-heading cooking-heading">
      <div>
        <p class="eyebrow">THE EMBERFALL KITCHEN</p>
        <h1>Cooking</h1>
        <p>Choose a recipe, check its ingredients, and prepare food for battle.</p>
      </div>
      <div class="crafting-level cooking-level" aria-label="Cooking level">
        <div><span>COOKING LEVEL</span><strong>{{ profession.level }}</strong></div>
        <small>{{ profession.xp.toLocaleString() }} / {{ profession.xpNeeded.toLocaleString() }} XP</small>
      </div>
    </header>

    <div class="crafting-workbench cooking-workbench">
      <aside class="recipe-browser">
        <div class="recipe-browser-heading">
          <div><span>STEP 1</span><h2>Choose a recipe</h2></div>
          <small>{{ visibleRecipes.length }} shown</small>
        </div>

        <div class="recipe-search">
          <span class="sr-only">Search cooking recipes or ingredients</span>
          <b aria-hidden="true">⌕</b>
          <input v-model="search" type="search" aria-label="Search cooking recipes or ingredients" placeholder="Search recipes or ingredients…">
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
            <b class="recipe-row-icon">{{ recipe.icon }}</b>
            <span class="recipe-row-copy"><strong>{{ recipe.name }}</strong><small>Tier {{ recipe.tier }} · +{{ effectiveHealing(recipe) }} HP</small></span>
            <em>{{ stateLabel(recipe) }}</em>
          </button>
        </div>
        <div v-else class="recipe-list-empty"><b>◇</b><strong>No matching recipes</strong><button @click="search = ''">CLEAR SEARCH</button></div>
      </aside>

      <article v-if="selectedRecipe" ref="detailPanel" class="recipe-detail cooking-detail" tabindex="-1">
        <header class="recipe-detail-heading">
          <div class="recipe-detail-icon" :class="`is-${recipeState(selectedRecipe)}`">{{ selectedRecipe.icon }}</div>
          <div><span>STEP 2 · FOOD · TIER {{ selectedRecipe.tier }}</span><h2>{{ selectedRecipe.name }}</h2><p>{{ selectedRecipe.description }}</p></div>
          <small>{{ formatDuration(effectiveDuration(selectedRecipe)) }}</small>
        </header>

        <section class="recipe-result">
          <div class="recipe-section-title"><span>YOU WILL RECEIVE</span><small>{{ (inventory[selectedRecipe.outputItem] || 0).toLocaleString() }} currently owned</small></div>
          <div class="recipe-result-card cooking-result"><b>{{ selectedRecipe.icon }}</b><div><strong>1 × {{ selectedRecipe.outputItem }}</strong><small>Restores {{ effectiveHealing(selectedRecipe) }} health instantly<template v-if="selectedRecipe.hot"> · plus {{ effectiveHotHealing(selectedRecipe) }} over {{ selectedRecipe.hot.duration }}s</template></small><p v-if="selectedRecipe.hot">Heal-over-time duration stacks when multiple meals are eaten.</p><p v-else-if="stats.bonusDishChance">{{ stats.bonusDishChance }}% chance to prepare a second dish.</p></div></div>
        </section>

        <section class="recipe-requirements">
          <div class="recipe-section-title"><span>INGREDIENTS</span><small>Spent when cooking starts</small></div>
          <div class="material-checklist">
            <article v-for="(needed, item) in selectedRecipe.costs" :key="item" :class="{ missing: recipeState(selectedRecipe) !== 'active' && (inventory[item] || 0) < Number(needed) }">
              <b>{{ recipeState(selectedRecipe) === 'active' || (inventory[item] || 0) >= Number(needed) ? '✓' : '!' }}</b>
              <div><strong>{{ item }}</strong><small v-if="recipeState(selectedRecipe) === 'active'">Committed to this dish</small><small v-else-if="(inventory[item] || 0) >= Number(needed)">Ready</small><small v-else>Find {{ Number(needed) - (inventory[item] || 0) }} more</small></div>
              <p><span>OWNED</span><strong>{{ (inventory[item] || 0).toLocaleString() }}</strong></p>
              <p><span>NEEDED</span><strong>{{ Number(needed).toLocaleString() }}</strong></p>
              <span v-if="recipeState(selectedRecipe) === 'active' || (inventory[item] || 0) >= Number(needed)" class="material-ready">{{ recipeState(selectedRecipe) === 'active' ? 'COMMITTED' : 'READY' }}</span>
              <span v-else class="material-source">GATHER</span>
            </article>
          </div>
        </section>

        <footer class="recipe-action-panel" :class="[`is-${recipeState(selectedRecipe)}`, { 'is-busy': cookingId && recipeState(selectedRecipe) !== 'active' }]">
          <div><span>STEP 3</span><strong>{{ statusTitle(selectedRecipe) }}</strong><p>{{ statusMessage(selectedRecipe) }}</p></div>
          <button :disabled="!canCook(selectedRecipe)" @click="emit('cook', selectedRecipe)">
            <template v-if="recipeState(selectedRecipe) === 'active'"><span>COOKING · {{ Math.floor(selectedRecipe.progress) }}%</span><span class="recipe-craft-progress" role="progressbar" :aria-label="`${selectedRecipe.name} cooking progress`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(selectedRecipe.progress)"><i :style="{ width: `${selectedRecipe.progress}%` }"></i></span></template>
            <template v-else>{{ actionLabel(selectedRecipe) }}</template>
          </button>
        </footer>
      </article>
      <div v-else class="recipe-detail recipe-detail-empty"><b>◇</b><strong>Select a recipe to inspect it</strong></div>
    </div>
  </section>
</template>

<style scoped>
.cooking-page { --kitchen: #d88445; }
.cooking-heading { margin-bottom: 18px; }
.cooking-heading h1 { text-transform: capitalize; }
.cooking-level { border-color: #d8844545; background: #d884450a; }
.cooking-level > div:first-child span { color: #b47b52; }
.cooking-level > div:first-child strong { color: #efb475; }
.cooking-workbench { border-color: #d8844526; }
.cooking-detail .recipe-detail-icon { border-color: #8b5b3a; background: #d8844510; }
.cooking-result { border-color: #d8844533; background: linear-gradient(100deg, #d884450d, transparent); }
.cooking-result p { color: #82a878; }
.cooking-page .recipe-action-panel.is-ready { border-color: #d8844555; background: #d8844509; }
.cooking-page .recipe-action-panel.is-ready > div > strong { color: #e5ad75; }
.cooking-page .recipe-action-panel.is-ready > button { border-color: #d88445; background: linear-gradient(#e69a5d, #a9552d); color: #fff4e9; }
.cooking-page .recipe-craft-progress i { background: linear-gradient(90deg, #9c4f2c, #e49a60); }
@media(max-width:900px){.cooking-heading{margin-bottom:0}}
</style>
