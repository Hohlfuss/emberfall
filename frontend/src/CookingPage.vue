<script setup lang="ts">
import { GAME_PACE_MULTIPLIER, type CookingRecipe } from './gameData'

type DisplayRecipe = CookingRecipe & { progress: number; remaining?: number }

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

function missingIngredients(recipe: CookingRecipe) {
  return Object.entries(recipe.costs).filter(([item, quantity]) => (props.inventory[item] || 0) < quantity)
}

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

function canCook(recipe: CookingRecipe) {
  return !props.cookingId && props.profession.level >= recipe.tier && !missingIngredients(recipe).length
}

function actionLabel(recipe: DisplayRecipe) {
  if (props.cookingId === recipe.id) return `COOKING · ${Math.floor(recipe.progress)}%`
  if (props.profession.level < recipe.tier) return `LEVEL ${recipe.tier} REQUIRED`
  if (missingIngredients(recipe).length) return 'INGREDIENTS NEEDED'
  if (props.cookingId) return 'KITCHEN BUSY'
  return `COOK · ${formatDuration(effectiveDuration(recipe))}`
}
</script>

<template>
  <section class="page-content cooking-page">
    <header class="cooking-heading">
      <div><p class="eyebrow">THE EMBERFALL KITCHEN</p><h1>Cooking</h1><p>Combine gathered ingredients into healing food.</p></div>
      <div class="cooking-level"><div><strong>LEVEL {{ profession.level }}</strong><span>{{ profession.xp.toLocaleString() }} / {{ profession.xpNeeded.toLocaleString() }} XP</span></div><div class="cooking-level-meter" role="progressbar" aria-label="Cooking level progress" aria-valuemin="0" :aria-valuemax="profession.xpNeeded" :aria-valuenow="profession.xp"><i :style="{ width: `${Math.min(100, profession.xp / profession.xpNeeded * 100)}%` }"></i></div><div class="cooking-level-stats"><span><b>+{{ stats.speed }}%</b> Speed</span><span><b>{{ stats.conservationChance }}%</b> Conservation</span><span><b>{{ stats.bonusDishChance }}%</b> Bonus dish</span></div></div>
    </header>

    <div class="cooking-grid">
      <article v-for="recipe in recipes" :key="recipe.id" class="cooking-card" :class="{ locked: profession.level < recipe.tier, active: cookingId === recipe.id }">
        <header><b>{{ recipe.icon }}</b><div><span>TIER {{ recipe.tier }}</span><h2>{{ recipe.name }}</h2></div><strong>+{{ effectiveHealing(recipe) }} HP</strong></header>
        <p v-if="recipe.hot" class="hot-value">HOT · +{{ effectiveHotHealing(recipe) }} HP over {{ recipe.hot.duration }}s · duration stacks</p>
        <div class="ingredients">
          <span v-for="(needed, item) in recipe.costs" :key="item" :class="{ missing: (inventory[item] || 0) < Number(needed) }">{{ item }} <b>{{ inventory[item] || 0 }}/{{ needed }}</b></span>
        </div>
        <footer><small>{{ inventory[recipe.outputItem] || 0 }} owned</small><button type="button" :disabled="!canCook(recipe)" @click="emit('cook', recipe)">{{ actionLabel(recipe) }}</button></footer>
      </article>
    </div>
  </section>
</template>

<style scoped>
.cooking-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:18px}.cooking-heading h1{margin:5px 0;text-transform:capitalize}.cooking-heading>div>p:last-child{margin:0;color:#808288;font-size:11px}.cooking-level{min-width:340px;margin:0;padding:12px 14px;border:1px solid #d8844544;background:#d8844509;text-align:right}.cooking-level>div:first-child{display:flex;align-items:end;justify-content:space-between}.cooking-level strong{color:#e4a36f;font:800 15px Cinzel}.cooking-level>div:first-child span{color:#777a80;font-size:8px}.cooking-level-meter{height:7px;margin-top:8px;padding:1px;border:1px solid #ffffff18;background:#050608;overflow:hidden}.cooking-level-meter i{display:block;height:100%;background:linear-gradient(90deg,#9d5831,#e4a36f)}.cooking-level-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:8px}.cooking-level-stats span{padding:5px;color:#736b66;background:#09070588;font-size:7px;text-align:center;text-transform:uppercase}.cooking-level-stats b{display:block;color:#d99162;font-size:9px}.cooking-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cooking-card{padding:14px;border:1px solid #4b4038;background:linear-gradient(150deg,#201b18,#171512)}.cooking-card.active{border-color:#d88445}.cooking-card.locked{opacity:.55}.cooking-card>header{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:10px}.cooking-card>header>b{font-size:27px;text-align:center}.cooking-card>header span{color:#b47b52;font-size:7px;font-weight:800;letter-spacing:.12em}.cooking-card h2{margin:3px 0;color:#e8ddcf;font-size:14px;text-transform:none}.cooking-card>header>strong{color:#82bf79;font:800 12px Cinzel;white-space:nowrap}.hot-value{margin:10px 0 0;padding:7px 9px;border:1px solid #69a17033;color:#8fc796;background:#69a17009;font-size:8px}.ingredients{display:flex;flex-wrap:wrap;gap:5px;margin:11px 0}.ingredients span{padding:5px 7px;border:1px solid #ffffff0d;color:#999;background:#ffffff03;font-size:8px}.ingredients span b{margin-left:3px;color:#8cba85}.ingredients span.missing b{color:#d06d61}.cooking-card footer{display:flex;align-items:center;justify-content:space-between;gap:10px}.cooking-card footer small{color:#777;font-size:8px}.cooking-card button{min-width:145px;padding:9px 11px;border:1px solid #b9683a;color:#fff0df;background:#9d5831;font:800 8px Cinzel;cursor:pointer}.cooking-card button:disabled{border-color:#443a32;color:#756b62;background:#292521;cursor:default}
@media(max-width:720px){.cooking-heading{align-items:stretch;flex-direction:column}.cooking-level{width:100%;min-width:0;text-align:left}.cooking-grid{grid-template-columns:1fr}.cooking-card{padding:12px}.cooking-card footer{align-items:stretch;flex-direction:column}.cooking-card button{width:100%}}
</style>
