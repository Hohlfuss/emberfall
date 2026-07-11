<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Gear, Recipe } from './gameData'

type DisplayRecipe = Recipe & { progress: number }
type RecipeState = 'active' | 'ready' | 'missing' | 'locked'
type RecipeCategory = 'all' | Recipe['category']
type Availability = 'ready' | 'all' | 'missing' | 'locked'

const props = defineProps<{
  recipes: DisplayRecipe[]
  inventory: Record<string, number>
  gearCatalog: Record<string, Gear>
  recipeLevels: Record<string, number>
  craftingId: string
  profession: { level: number; xp: number; xpNeeded: number }
  stats: { speed: number; conservationChance: number; bonusOutputChance: number }
}>()

const emit = defineEmits<{ craft: [recipe: Recipe] }>()

const category = ref<RecipeCategory>('all')
const availability = ref<Availability>('ready')
const search = ref('')

const categories: Array<{ id: RecipeCategory; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: '✦' },
  { id: 'components', label: 'Components', icon: '◆' },
  { id: 'tools', label: 'Tools', icon: '⚒' },
  { id: 'combat', label: 'Combat', icon: '⚔' },
  { id: 'accessories', label: 'Accessories', icon: '◈' },
]

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

const activeRecipe = computed(() => props.recipes.find(recipe => recipe.id === props.craftingId))
const readyCount = computed(() => props.recipes.filter(recipe => recipeState(recipe) === 'ready').length)

function categoryCount(id: RecipeCategory) {
  return props.recipes.filter(recipe => id === 'all' || recipe.category === id).length
}

function availabilityCount(id: Availability) {
  if (id === 'all') return props.recipes.length
  return props.recipes.filter(recipe => recipeState(recipe) === id || (id === 'ready' && recipeState(recipe) === 'active')).length
}

const filteredRecipes = computed(() => {
  const query = search.value.trim().toLowerCase()
  const rank: Record<RecipeState, number> = { active: 0, ready: 1, missing: 2, locked: 3 }

  return props.recipes
    .filter(recipe => category.value === 'all' || recipe.category === category.value)
    .filter(recipe => availability.value === 'all' || recipeState(recipe) === availability.value || (availability.value === 'ready' && recipeState(recipe) === 'active'))
    .filter(recipe => !query || `${recipe.name} ${recipe.description} ${recipe.outputItem || ''}`.toLowerCase().includes(query))
    .slice()
    .sort((a, b) => rank[recipeState(a)] - rank[recipeState(b)] || requiredLevel(a) - requiredLevel(b) || a.name.localeCompare(b.name))
})

function categoryIcon(recipe: Recipe) {
  if (recipe.outputGear) return props.gearCatalog[recipe.outputGear]?.icon || '⚒'
  return recipe.category === 'components' ? '◆' : recipe.category === 'tools' ? '⚒' : recipe.category === 'combat' ? '⚔' : '◈'
}

function outputLabel(recipe: Recipe) {
  if (recipe.outputGear) return props.gearCatalog[recipe.outputGear]?.name || recipe.name
  return `${recipe.outputQty || 1} × ${recipe.outputItem}`
}

function effectiveDuration(recipe: Recipe) {
  return Math.max(.1, recipe.duration * (1 - props.stats.speed / 100))
}

function formatDuration(seconds: number) {
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`
}

function actionLabel(recipe: DisplayRecipe) {
  const state = recipeState(recipe)
  if (state === 'active') return `CRAFTING · ${Math.floor(recipe.progress)}%`
  if (props.craftingId) return 'FORGE BUSY'
  if (state === 'locked') return `UNLOCKS AT LEVEL ${requiredLevel(recipe)}`
  if (state === 'missing') {
    const count = missingMaterials(recipe).length
    return `MISSING ${count} MATERIAL${count === 1 ? '' : 'S'}`
  }
  return `CRAFT · ${formatDuration(effectiveDuration(recipe))}`
}

function emptyMessage() {
  if (search.value.trim()) return 'No recipes match that search.'
  if (availability.value === 'ready') return 'Nothing is ready yet. Open All recipes to see what materials you need.'
  if (availability.value === 'missing') return 'Every visible recipe has the required materials.'
  if (availability.value === 'locked') return 'No visible recipes are locked by crafting level.'
  return 'No recipes are available in this category.'
}
</script>

<template>
  <section class="page-content crafting-page">
    <header class="crafting-heading">
      <div>
        <p class="eyebrow">THE EMBER FORGE</p>
        <h1>Crafting</h1>
        <p>Choose a recipe, check its materials, and keep one project in the forge at a time.</p>
      </div>
      <div class="crafting-level">
        <div><span>CRAFTING LEVEL</span><strong>{{ profession.level }}</strong></div>
        <small>{{ profession.xp.toLocaleString() }} / {{ profession.xpNeeded.toLocaleString() }} XP</small>
        <div class="meter"><i :style="{ width: `${Math.min(100, profession.xp / profession.xpNeeded * 100)}%` }"></i></div>
      </div>
    </header>

    <div class="crafting-summary">
      <div><span>Ready now</span><strong>{{ readyCount }}</strong><small>Recipes you can start</small></div>
      <div><span>Crafting speed</span><strong>+{{ stats.speed }}%</strong><small>Shorter completion time</small></div>
      <div><span>Material save</span><strong>{{ stats.conservationChance }}%</strong><small>Component crafts may save one of each material</small></div>
      <div><span>Bonus output</span><strong>{{ stats.bonusOutputChance }}%</strong><small>Component crafts may produce double</small></div>
    </div>

    <article v-if="activeRecipe" class="active-craft">
      <b>{{ categoryIcon(activeRecipe) }}</b>
      <div>
        <span>NOW CRAFTING</span>
        <strong>{{ activeRecipe.name }}</strong>
        <small>{{ outputLabel(activeRecipe) }}</small>
      </div>
      <div class="active-craft-progress">
        <strong>{{ Math.floor(activeRecipe.progress) }}%</strong>
        <div class="meter"><i :style="{ width: `${activeRecipe.progress}%` }"></i></div>
      </div>
    </article>

    <div class="crafting-toolbar">
      <div class="craft-category-tabs" aria-label="Recipe category">
        <button v-for="item in categories" :key="item.id" :class="{ selected: category === item.id }" @click="category = item.id">
          <b>{{ item.icon }}</b><span>{{ item.label }}</span><small>{{ categoryCount(item.id) }}</small>
        </button>
      </div>
      <label class="craft-search">
        <span>SEARCH RECIPES</span>
        <input v-model="search" type="search" placeholder="Name or output…">
      </label>
    </div>

    <div class="craft-status-tabs" aria-label="Recipe availability">
      <button v-for="item in ([{ id: 'ready', label: 'Ready now' }, { id: 'all', label: 'All recipes' }, { id: 'missing', label: 'Need materials' }, { id: 'locked', label: 'Level locked' }] as const)" :key="item.id" :class="{ selected: availability === item.id }" @click="availability = item.id">
        {{ item.label }} <span>{{ availabilityCount(item.id) }}</span>
      </button>
    </div>

    <div v-if="filteredRecipes.length" class="forge-grid">
      <article v-for="recipe in filteredRecipes" :key="recipe.id" class="forge-card" :class="`is-${recipeState(recipe)}`">
        <header>
          <b class="forge-icon">{{ categoryIcon(recipe) }}</b>
          <div>
            <span>{{ recipe.category }} · LEVEL {{ requiredLevel(recipe) }}</span>
            <h2>{{ recipe.name }}</h2>
          </div>
          <small>{{ formatDuration(effectiveDuration(recipe)) }}</small>
        </header>

        <p>{{ recipe.description }}</p>

        <div class="forge-output">
          <span>CREATES</span>
          <strong>{{ outputLabel(recipe) }}</strong>
        </div>

        <div class="forge-materials">
          <span>REQUIRED MATERIALS</span>
          <ul>
            <li v-for="(needed, item) in recipe.costs" :key="item" :class="{ missing: (inventory[item] || 0) < Number(needed) }">
              <span><i>{{ (inventory[item] || 0) >= Number(needed) ? '✓' : '×' }}</i>{{ item }}</span>
              <strong>{{ (inventory[item] || 0).toLocaleString() }} / {{ Number(needed).toLocaleString() }}</strong>
            </li>
          </ul>
        </div>

        <div v-if="recipeState(recipe) === 'active'" class="forge-card-progress">
          <div class="meter"><i :style="{ width: `${recipe.progress}%` }"></i></div>
        </div>

        <button class="forge-action" :disabled="recipeState(recipe) !== 'ready' || !!craftingId" @click="emit('craft', recipe)">
          {{ actionLabel(recipe) }}
        </button>
      </article>
    </div>

    <div v-else class="craft-empty">
      <b>◇</b>
      <strong>No recipes here</strong>
      <p>{{ emptyMessage() }}</p>
      <button v-if="availability !== 'all'" @click="availability = 'all'">SHOW ALL RECIPES</button>
    </div>
  </section>
</template>
