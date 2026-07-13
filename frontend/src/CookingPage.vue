<script setup lang="ts">
import { computed } from 'vue'
import { GAME_PACE_MULTIPLIER, type CookingRecipe } from './gameData'

type DisplayRecipe = CookingRecipe & { progress: number; remaining?: number }

const props = defineProps<{
  recipes: DisplayRecipe[]
  inventory: Record<string, number>
  cookingId: string
  profession: { level: number; xp: number; xpNeeded: number }
  stats: { speed: number; conservationChance: number; bonusDishChance: number; totalCooked: number; ingredientsSaved: number; bonusDishes: number }
  healingValues: Record<string, number>
  health: number
  maxHealth: number
  recovering: boolean
}>()

const emit = defineEmits<{
  cook: [recipe: CookingRecipe]
  eat: [item: string]
}>()

const xpPercent = computed(() => Math.min(100, props.profession.xp / Math.max(1, props.profession.xpNeeded) * 100))
const activeRecipe = computed(() => props.recipes.find(recipe => recipe.id === props.cookingId))

function missingIngredients(recipe: CookingRecipe) {
  return Object.entries(recipe.costs).filter(([item, quantity]) => (props.inventory[item] || 0) < quantity)
}

function effectiveDuration(recipe: CookingRecipe) {
  return Math.max(.1, recipe.duration * GAME_PACE_MULTIPLIER * (1 - props.stats.speed / 100))
}

function formatDuration(seconds: number) {
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.ceil(seconds)}s`
}

function canCook(recipe: CookingRecipe) {
  return !props.cookingId && props.profession.level >= recipe.tier && !missingIngredients(recipe).length
}

function effectiveHealing(recipe: CookingRecipe) {
  return props.healingValues[recipe.outputItem] || recipe.healing
}

function cookingLabel(recipe: DisplayRecipe) {
  if (props.cookingId === recipe.id) return `COOKING · ${Math.floor(recipe.progress)}%`
  if (props.profession.level < recipe.tier) return `COOKING LEVEL ${recipe.tier}`
  if (missingIngredients(recipe).length) return 'INGREDIENTS NEEDED'
  if (props.cookingId) return 'KITCHEN IS BUSY'
  return `COOK · ${formatDuration(effectiveDuration(recipe))}`
}
</script>

<template>
  <section class="page-content cooking-page">
    <div class="page-heading cooking-heading">
      <div>
        <p class="eyebrow">HEALING PROFESSION</p>
        <h1>Cooking</h1>
        <p>Pair fish with farm crops to prepare food. Higher tiers restore more health, while cooking levels improve kitchen speed and efficiency.</p>
      </div>
      <div class="cooking-level-card">
        <span>COOKING LEVEL</span>
        <strong>{{ profession.level }}</strong>
        <small>{{ profession.xp.toLocaleString() }} / {{ profession.xpNeeded.toLocaleString() }} XP</small>
        <div class="meter"><i :style="{ width: `${xpPercent}%` }"></i></div>
        <p>{{ Math.max(0, profession.xpNeeded - profession.xp).toLocaleString() }} XP to level {{ profession.level + 1 }}</p>
      </div>
    </div>

    <div class="cooking-stats">
      <article><span>Kitchen speed</span><strong>+{{ stats.speed.toFixed(1) }}%</strong><small>Shortens every recipe</small></article>
      <article><span>Conservation</span><strong>{{ stats.conservationChance.toFixed(1) }}%</strong><small>Chance to save one of each ingredient</small></article>
      <article><span>Bonus dish</span><strong>{{ stats.bonusDishChance.toFixed(1) }}%</strong><small>Chance to make a second food</small></article>
      <article><span>Meals cooked</span><strong>{{ stats.totalCooked.toLocaleString() }}</strong><small>{{ stats.ingredientsSaved }} ingredients saved · {{ stats.bonusDishes }} bonus dishes</small></article>
    </div>

    <article v-if="activeRecipe" class="active-kitchen">
      <b>{{ activeRecipe.icon }}</b>
      <div>
        <span>ON THE STOVE</span>
        <h2>{{ activeRecipe.name }}</h2>
        <div class="meter"><i :style="{ width: `${activeRecipe.progress}%` }"></i></div>
        <small>{{ Math.floor(activeRecipe.progress) }}% complete · {{ formatDuration(activeRecipe.remaining || 0) }} remaining</small>
      </div>
    </article>

    <div class="recipe-heading">
      <div><p class="eyebrow">THE EMBERFALL COOKBOOK</p><h2>Fish & harvest recipes</h2></div>
      <p>One cooking job can run alongside gathering, crafting, and battle.</p>
    </div>

    <div class="cooking-grid">
      <article
        v-for="recipe in recipes"
        :key="recipe.id"
        class="cooking-card"
        :class="{ locked: profession.level < recipe.tier, active: cookingId === recipe.id }"
      >
        <header>
          <div class="dish-icon">{{ recipe.icon }}</div>
          <div><span>TIER {{ recipe.tier }} · LEVEL {{ recipe.tier }}</span><h3>{{ recipe.name }}</h3></div>
          <strong class="healing">+{{ effectiveHealing(recipe) }} HP</strong>
        </header>
        <p>{{ recipe.description }}</p>

        <div class="ingredients">
          <span>INGREDIENTS</span>
          <div v-for="(needed, item) in recipe.costs" :key="item" :class="{ missing: (inventory[item] || 0) < needed }">
            <b>{{ item }}</b><strong>{{ inventory[item] || 0 }} / {{ needed }}</strong>
          </div>
        </div>

        <div v-if="cookingId === recipe.id" class="recipe-progress meter"><i :style="{ width: `${recipe.progress}%` }"></i></div>
        <button class="cook-button" type="button" :disabled="!canCook(recipe)" @click="emit('cook', recipe)">{{ cookingLabel(recipe) }}</button>

        <footer>
          <span><b>{{ inventory[recipe.outputItem] || 0 }}</b> owned</span>
          <button
            type="button"
            :disabled="!(inventory[recipe.outputItem] || 0) || health >= maxHealth || recovering"
            :title="recovering ? 'Finish recovering first' : health >= maxHealth ? 'Health is already full' : `Restore up to ${effectiveHealing(recipe)} health`"
            @click="emit('eat', recipe.outputItem)"
          >
            {{ health >= maxHealth ? 'FULL HEALTH' : recovering ? 'RECOVERING' : `EAT · +${effectiveHealing(recipe)} HP` }}
          </button>
        </footer>
      </article>
    </div>
  </section>
</template>

<style scoped>
.cooking-page { --kitchen: #d88445; --herb: #78a66a; }
.cooking-heading { align-items: stretch; }
.cooking-heading > div:first-child { max-width: 680px; }
.cooking-heading h1 { text-transform: capitalize; }
.cooking-level-card { min-width: 260px; padding: 18px 20px; border: 1px solid #5f4736; background: linear-gradient(145deg, #241b17, #191613); box-shadow: inset 3px 0 var(--kitchen); }
.cooking-level-card > span, .active-kitchen span, .ingredients > span, .cooking-card header span { color: #b99e89; font-size: 10px; font-weight: 900; letter-spacing: .12em; }
.cooking-level-card > strong { display: block; color: #f2c28d; font-family: Georgia, serif; font-size: 42px; line-height: 1; margin: 7px 0; }
.cooking-level-card small, .cooking-level-card p { color: #9f9389; font-size: 11px; }
.cooking-level-card p { margin: 7px 0 0; }
.cooking-level-card .meter { margin-top: 9px; }
.cooking-level-card .meter i, .active-kitchen .meter i, .recipe-progress i { background: linear-gradient(90deg, #bd6638, #edaf64); }
.cooking-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
.cooking-stats article { padding: 15px; border: 1px solid #493d34; background: #191714; }
.cooking-stats span, .cooking-stats small { display: block; color: #94877c; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
.cooking-stats strong { display: block; color: #e8c08d; font-size: 20px; margin: 5px 0; }
.active-kitchen { display: flex; align-items: center; gap: 18px; margin: 18px 0 24px; padding: 17px 20px; border: 1px solid #7e5638; background: linear-gradient(90deg, rgba(216,132,69,.17), #1b1714); }
.active-kitchen > b { font-size: 38px; }
.active-kitchen > div { flex: 1; }
.active-kitchen h2 { margin: 2px 0 9px; color: #f3d0a7; }
.active-kitchen small { color: #b6a393; }
.recipe-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin: 26px 0 12px; }
.recipe-heading h2, .recipe-heading p { margin: 0; }
.recipe-heading > p { color: #958a81; font-size: 12px; }
.cooking-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.cooking-card { padding: 17px; border: 1px solid #4b4038; background: linear-gradient(150deg, #201b18, #171512); transition: border-color .2s, opacity .2s; }
.cooking-card.active { border-color: var(--kitchen); box-shadow: inset 0 0 0 1px rgba(216,132,69,.25); }
.cooking-card.locked { opacity: .58; }
.cooking-card header { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; }
.dish-icon { display: grid; place-items: center; width: 49px; height: 49px; border: 1px solid #674c39; background: #2b211a; font-size: 27px; }
.cooking-card h3 { margin: 3px 0 0; color: #e8ddcf; font-size: 17px; }
.cooking-card > p { min-height: 34px; color: #9e9288; font-size: 12px; line-height: 1.45; }
.healing { color: #82bf79; white-space: nowrap; }
.ingredients { margin: 14px 0; padding: 11px 12px; background: #12110f; border: 1px solid #39322c; }
.ingredients > div { display: flex; justify-content: space-between; margin-top: 7px; color: #c7b9ab; font-size: 12px; }
.ingredients > div strong { color: #75a66b; }
.ingredients > div.missing strong { color: #c9655c; }
.recipe-progress { margin: 0 0 8px; }
.cook-button { width: 100%; min-height: 38px; border: 1px solid #9c6337; background: #9d5831; color: #fff0de; font-weight: 900; font-size: 11px; letter-spacing: .06em; }
.cook-button:disabled { border-color: #443a32; background: #292521; color: #756b62; }
.cooking-card footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #39322c; color: #94877b; font-size: 11px; }
.cooking-card footer span b { color: #e5c699; }
.cooking-card footer button { min-width: 126px; padding: 8px 10px; border: 1px solid #557a50; background: #263b25; color: #b8ddb0; font-size: 10px; font-weight: 900; }
.cooking-card footer button:disabled { border-color: #403b36; background: #24211e; color: #6e6862; }
@media (max-width: 900px) {
  .cooking-stats, .cooking-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 620px) {
  .cooking-heading, .recipe-heading { display: block; }
  .cooking-level-card { min-width: 0; margin-top: 15px; }
  .cooking-stats, .cooking-grid { grid-template-columns: 1fr; }
  .recipe-heading > p { margin-top: 8px; }
  .cooking-card header { grid-template-columns: auto 1fr; }
  .healing { grid-column: 2; }
}
</style>
