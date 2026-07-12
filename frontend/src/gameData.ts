export type Page = 'battle' | 'woodcutting' | 'mining' | 'crafting' | 'metal detector' | 'workers' | 'inventory' | 'achievements' | 'factions' | 'auction' | 'high scores' | 'shop'
export type Skill = 'woodcutting' | 'mining'
export type GearSlot = 'weapon' | 'helmet' | 'chest' | 'legs' | 'boots' | 'gloves' | 'ring' | 'amulet' | 'pickaxe' | 'hatchet'
export type ProfessionStats = { speed: number; bonusYieldPercent: number; critChance: number; critPower: number }

// Keep every timed activity moving at the same slightly brisker pace.
export const GAME_PACE_MULTIPLIER = .9

export type Resource = {
  id: string
  name: string
  item: string
  tier: number
  duration: number
  icon: string
  color: string
  skill: Skill
  family: string
}

export type Bonuses = Partial<{
  attack: number
  defense: number
  maxHealth: number
  attackSpeed: number
  woodSpeed: number
  miningSpeed: number
  woodBonusYieldPercent: number
  miningBonusYieldPercent: number
  woodCrit: number
  miningCrit: number
  critPower: number
  recoverySpeed: number
  encounterSpeed: number
}>

export type Gear = {
  id: string
  name: string
  slot: GearSlot
  tier: number
  icon: string
  description: string
  bonuses: Bonuses
}

export type Recipe = {
  id: string
  name: string
  category: 'components' | 'tools' | 'combat' | 'accessories'
  description: string
  duration: number
  costs: Record<string, number>
  outputItem?: string
  outputQty?: number
  outputGear?: string
  progress: number
}

const treeData = [
  ['pine', 'Pine Tree', 'Pine Log', 1, 10, '🌲', '#58956a'],
  ['birch', 'Silver Birch', 'Birch Log', 2, 16, '🌳', '#9aaa87'],
  ['oak', 'Ancient Oak', 'Oak Log', 3, 24, '🌳', '#7da05a'],
  ['maple', 'Red Maple', 'Maple Log', 4, 34, '🍁', '#ad6a43'],
  ['willow', 'Weeping Willow', 'Willow Log', 5, 46, '🌿', '#5f9676'],
  ['yew', 'Twisted Yew', 'Yew Log', 6, 60, '🌲', '#8461a5'],
  ['ironwood', 'Ironwood Tree', 'Ironwood Log', 7, 78, '🌴', '#8c7158'],
  ['elder', 'Elderwood', 'Elder Log', 8, 98, '🌴', '#d3a84f'],
  ['spirit', 'Spirit Cedar', 'Spirit Log', 9, 122, '🎋', '#55b6a8'],
  ['worldroot', 'Worldroot', 'Worldroot Log', 10, 150, '🌲', '#e2c46c'],
] as const

const miningData = [
  ['stone', 'Stone Outcrop', 'Stone', 1, 10, '🪨', '#7f8b94', 'rock'],
  ['copper', 'Copper Vein', 'Copper Ore', 2, 16, '⛏️', '#b8734f', 'ore'],
  ['limestone', 'Limestone Shelf', 'Limestone', 3, 24, '🪨', '#b9b39e', 'rock'],
  ['iron', 'Iron Deposit', 'Iron Ore', 4, 34, '⛏️', '#8fa1aa', 'ore'],
  ['granite', 'Granite Face', 'Granite', 5, 46, '🪨', '#887d83', 'rock'],
  ['silver', 'Silver Seam', 'Silver Ore', 6, 60, '💎', '#b9c9d6', 'ore'],
  ['obsidian', 'Obsidian Cluster', 'Obsidian', 7, 78, '🪨', '#66557d', 'rock'],
  ['gold', 'Gold Vein', 'Gold Ore', 8, 98, '✨', '#d5ad43', 'ore'],
  ['moonstone', 'Moonstone Geode', 'Moonstone', 9, 122, '🔮', '#719fc5', 'rock'],
  ['mythril', 'Mythril Core', 'Mythril Ore', 10, 150, '💠', '#55b8d0', 'ore'],
] as const

export const woods: Resource[] = treeData.map(([id, name, item, tier, duration, icon, color]) => ({ id, name, item, tier, duration, icon, color, skill: 'woodcutting', family: 'wood' }))
export const rocks: Resource[] = miningData.map(([id, name, item, tier, duration, icon, color, family]) => ({ id, name, item, tier, duration, icon, color, skill: 'mining', family }))
export const allResources = [...woods, ...rocks]

export const gearCatalog: Record<string, Gear> = {
  rustySword: { id: 'rustySword', name: 'Rusty Sword', slot: 'weapon', tier: 0, icon: '🗡️', description: 'Still sharper than your fists.', bonuses: { attack: 2 } },
  wornHatchet: { id: 'wornHatchet', name: 'Worn Hatchet', slot: 'hatchet', tier: 0, icon: '🪓', description: 'A battered starter hatchet.', bonuses: {} },
  crackedPickaxe: { id: 'crackedPickaxe', name: 'Cracked Pickaxe', slot: 'pickaxe', tier: 0, icon: '⛏️', description: 'A battered starter pickaxe.', bonuses: {} },
  pineHatchet: { id: 'pineHatchet', name: 'Pinebound Hatchet', slot: 'hatchet', tier: 1, icon: '🪓', description: 'A balanced early logging tool.', bonuses: { woodSpeed: 12, woodCrit: 3 } },
  copperPickaxe: { id: 'copperPickaxe', name: 'Copper Pickaxe', slot: 'pickaxe', tier: 1, icon: '⛏️', description: 'Reliable on shallow deposits.', bonuses: { miningSpeed: 12, miningCrit: 3 } },
  oakHatchet: { id: 'oakHatchet', name: 'Oaksteel Hatchet', slot: 'hatchet', tier: 3, icon: '🪓', description: 'Bites deep into dense timber.', bonuses: { woodSpeed: 25, woodCrit: 7, critPower: .25 } },
  mapleHatchet: { id: 'mapleHatchet', name: 'Ember Maple Hatchet', slot: 'hatchet', tier: 4, icon: '🪓', description: 'A resin-treated blade made for rapid expeditions.', bonuses: { woodSpeed: 38, woodCrit: 10, critPower: .4 } },
  ironPickaxe: { id: 'ironPickaxe', name: 'Iron Pickaxe', slot: 'pickaxe', tier: 3, icon: '⛏️', description: 'Breaks stubborn rock with ease.', bonuses: { miningSpeed: 25, miningCrit: 7, critPower: .25 } },
  silverPickaxe: { id: 'silverPickaxe', name: 'Silvervein Pickaxe', slot: 'pickaxe', tier: 6, icon: '⛏️', description: 'A rare tool with a growing chance to extract an extra ore.', bonuses: { miningSpeed: 40, miningBonusYieldPercent: 15, miningCrit: 12, critPower: .5 } },
  yewHatchet: { id: 'yewHatchet', name: 'Yew Moon Hatchet', slot: 'hatchet', tier: 6, icon: '🪓', description: 'A master logger’s blade with exceptional bonus yield.', bonuses: { woodSpeed: 42, woodBonusYieldPercent: 25, woodCrit: 12, critPower: .5 } },
  mythrilPickaxe: { id: 'mythrilPickaxe', name: 'Mythril Pickaxe', slot: 'pickaxe', tier: 10, icon: '⛏️', description: 'Makes the mountain feel hollow.', bonuses: { miningSpeed: 60, miningBonusYieldPercent: 25, miningCrit: 18, critPower: .75 } },
  ironSword: { id: 'ironSword', name: 'Iron Longsword', slot: 'weapon', tier: 3, icon: '⚔️', description: 'A proper adventurer’s weapon.', bonuses: { attack: 10, attackSpeed: 100 } },
  ironHelm: { id: 'ironHelm', name: 'Iron Helm', slot: 'helmet', tier: 3, icon: '🪖', description: 'Keeps claws away from your face.', bonuses: { defense: 4, maxHealth: 10 } },
  ironChest: { id: 'ironChest', name: 'Ironbark Cuirass', slot: 'chest', tier: 4, icon: '🥋', description: 'Layered wood and iron plate.', bonuses: { defense: 7, maxHealth: 25 } },
  ironLegs: { id: 'ironLegs', name: 'Iron Greaves', slot: 'legs', tier: 4, icon: '🦿', description: 'Heavy, but reassuring.', bonuses: { defense: 5, maxHealth: 15 } },
  trailBoots: { id: 'trailBoots', name: 'Trailrunner Boots', slot: 'boots', tier: 2, icon: '🥾', description: 'Quicker feet in work and war.', bonuses: { attackSpeed: 120, woodSpeed: 5, miningSpeed: 5 } },
  loggerGloves: { id: 'loggerGloves', name: 'Artisan Gloves', slot: 'gloves', tier: 3, icon: '🧤', description: 'A surer grip keeps both gathering skills moving.', bonuses: { woodSpeed: 6, miningSpeed: 6, woodCrit: 2, miningCrit: 2 } },
  silverRing: { id: 'silverRing', name: 'Ring of Momentum', slot: 'ring', tier: 6, icon: '💍', description: 'Keeps every gathering motion fluid.', bonuses: { woodSpeed: 8, miningSpeed: 8 } },
  moonAmulet: { id: 'moonAmulet', name: 'Moonstone Amulet', slot: 'amulet', tier: 9, icon: '📿', description: 'Turns critical harvests into flashes of motion.', bonuses: { critPower: 1, woodCrit: 5, miningCrit: 5, maxHealth: 30 } },
  bronzeSword: { id: 'bronzeSword', name: 'Bronze Shortsword', slot: 'weapon', tier: 1, icon: '🗡️', description: 'The first meaningful combat upgrade.', bonuses: { attack: 5 } },
  copperHelm: { id: 'copperHelm', name: 'Copper Cap', slot: 'helmet', tier: 1, icon: '🪖', description: 'Light protection for early tiers.', bonuses: { defense: 2, maxHealth: 8 } },
  copperChest: { id: 'copperChest', name: 'Copper Scale Vest', slot: 'chest', tier: 1, icon: '🥋', description: 'Overlapping scales soften monster claws.', bonuses: { defense: 3, maxHealth: 14 } },
  campCharm: { id: 'campCharm', name: 'Hearthstone Charm', slot: 'amulet', tier: 2, icon: '🧿', description: 'Improves health recovery after defeat.', bonuses: { recoverySpeed: 1500, maxHealth: 5 } },
  scoutToken: { id: 'scoutToken', name: 'Scout’s Token', slot: 'ring', tier: 2, icon: '💍', description: 'Finds the next enemy more quickly.', bonuses: { encounterSpeed: 400, attackSpeed: 50 } },
  silverSaber: { id: 'silverSaber', name: 'Silver Saber', slot: 'weapon', tier: 6, icon: '⚔️', description: 'Fast, precise, and deadly.', bonuses: { attack: 18, attackSpeed: 180 } },
  obsidianHelm: { id: 'obsidianHelm', name: 'Obsidian War Helm', slot: 'helmet', tier: 7, icon: '🪖', description: 'Dark glass reinforced with iron bands.', bonuses: { defense: 10, maxHealth: 25 } },
  obsidianChest: { id: 'obsidianChest', name: 'Obsidian Bulwark', slot: 'chest', tier: 7, icon: '🥋', description: 'Armor built for the upper monster tiers.', bonuses: { defense: 16, maxHealth: 50, recoverySpeed: 500 } },
  goldGreaves: { id: 'goldGreaves', name: 'Sunforged Greaves', slot: 'legs', tier: 8, icon: '🦿', description: 'Enchanted gold moves without weight.', bonuses: { defense: 9, maxHealth: 30, encounterSpeed: 250 } },
  forgeGloves: { id: 'forgeGloves', name: 'Runebound Forge Gloves', slot: 'gloves', tier: 5, icon: '🧤', description: 'Layered bindings make practiced strikes quicker.', bonuses: { woodSpeed: 10, miningSpeed: 10, woodCrit: 5, miningCrit: 5, critPower: .25 } },
  masterBoots: { id: 'masterBoots', name: 'Obsidian Pathfinder Boots', slot: 'boots', tier: 7, icon: '🥾', description: 'Masterwork boots built for dangerous ground.', bonuses: { attackSpeed: 180, woodSpeed: 10, miningSpeed: 10, defense: 4 } },
  voidfang: { id: 'voidfang', name: 'Voidfang', slot: 'weapon', tier: 12, icon: '🗡️', description: 'A nearly impossible trophy torn from the void.', bonuses: { attack: 35, attackSpeed: 260, critPower: .5 } },
  heartOfTheGrove: { id: 'heartOfTheGrove', name: 'Heart of the Grove', slot: 'amulet', tier: 12, icon: '💚', description: 'A living relic that greatly improves woodcutting bonus yield.', bonuses: { maxHealth: 75, woodBonusYieldPercent: 30, woodSpeed: 20, woodCrit: 8 } },
  starforgedSignet: { id: 'starforgedSignet', name: 'Starforged Signet', slot: 'ring', tier: 12, icon: '🌠', description: 'A fallen star that greatly improves mining bonus yield.', bonuses: { miningBonusYieldPercent: 30, miningSpeed: 20, miningCrit: 18 } },
}

export const recipes: Recipe[] = [
  { id: 'plank', name: 'Pine Plank', category: 'components', description: 'Prepare one sturdy plank for advanced recipes.', duration: 12, costs: { 'Pine Log': 3 }, outputItem: 'Pine Plank', outputQty: 1, progress: 0 },
  { id: 'copperIngot', name: 'Copper Ingot', category: 'components', description: 'Smelt raw copper into a workable bar.', duration: 18, costs: { 'Copper Ore': 3, Stone: 1 }, outputItem: 'Copper Ingot', outputQty: 1, progress: 0 },
  { id: 'ironIngot', name: 'Iron Ingot', category: 'components', description: 'Strong metal used throughout the forge.', duration: 28, costs: { 'Iron Ore': 3, Limestone: 1 }, outputItem: 'Iron Ingot', outputQty: 1, progress: 0 },
  { id: 'silverIngot', name: 'Silver Ingot', category: 'components', description: 'Refined metal for enchanted accessories.', duration: 45, costs: { 'Silver Ore': 4, Granite: 1 }, outputItem: 'Silver Ingot', outputQty: 1, progress: 0 },
  { id: 'mythrilIngot', name: 'Mythril Ingot', category: 'components', description: 'An impossibly light masterwork material.', duration: 90, costs: { 'Mythril Ore': 5, Obsidian: 2 }, outputItem: 'Mythril Ingot', outputQty: 1, progress: 0 },
  { id: 'pineHatchetRecipe', name: 'Pinebound Hatchet', category: 'tools', description: 'Craft an equippable tier I hatchet.', duration: 25, costs: { 'Pine Plank': 3, Stone: 4 }, outputGear: 'pineHatchet', progress: 0 },
  { id: 'copperPickaxeRecipe', name: 'Copper Pickaxe', category: 'tools', description: 'Craft an equippable tier I pickaxe.', duration: 28, costs: { 'Pine Plank': 2, 'Copper Ingot': 2 }, outputGear: 'copperPickaxe', progress: 0 },
  { id: 'oakHatchetRecipe', name: 'Oaksteel Hatchet', category: 'tools', description: 'A fast logging tool with stronger critical harvests.', duration: 55, costs: { 'Pinebound Frame': 2, 'Oak Plank': 5, 'Iron Fittings': 3 }, outputGear: 'oakHatchet', progress: 0 },
  { id: 'mapleHatchetRecipe', name: 'Ember Maple Hatchet', category: 'tools', description: 'A rapid mid-tier hatchet with excellent crit chance.', duration: 78, costs: { 'Pinebound Frame': 2, 'Iron Fittings': 4, 'Tempered Tool Head': 2, 'Ancient Resin': 3 }, outputGear: 'mapleHatchet', progress: 0 },
  { id: 'ironPickaxeRecipe', name: 'Iron Pickaxe', category: 'tools', description: 'A fast mining tool with stronger critical harvests.', duration: 55, costs: { 'Pinebound Frame': 2, 'Iron Fittings': 3, 'Tempered Tool Head': 2 }, outputGear: 'ironPickaxe', progress: 0 },
  { id: 'silverPickaxeRecipe', name: 'Silvervein Pickaxe', category: 'tools', description: 'An advanced tool with speed, crit, and bonus yield.', duration: 105, costs: { 'Iron Fittings': 4, 'Tempered Tool Head': 3, 'Silver Mechanism': 3, 'Ore Crystal': 3 }, outputGear: 'silverPickaxe', progress: 0 },
  { id: 'yewHatchetRecipe', name: 'Yew Moon Hatchet', category: 'tools', description: 'A rare bonus-yield upgrade with exceptional speed and crit power.', duration: 110, costs: { 'Pinebound Frame': 3, 'Tempered Tool Head': 3, 'Silver Mechanism': 4, 'Resin Binding': 3 }, outputGear: 'yewHatchet', progress: 0 },
  { id: 'mythrilPickaxeRecipe', name: 'Mythril Pickaxe', category: 'tools', description: 'The ultimate tool for deep mining.', duration: 180, costs: { 'Pinebound Frame': 4, 'Iron Fittings': 5, 'Silver Mechanism': 5, 'Obsidian Core': 3, 'Mythril Assembly': 2 }, outputGear: 'mythrilPickaxe', progress: 0 },
  { id: 'ironSwordRecipe', name: 'Iron Longsword', category: 'combat', description: 'A large improvement to attack damage.', duration: 45, costs: { 'Iron Ingot': 4, 'Oak Log': 4 }, outputGear: 'ironSword', progress: 0 },
  { id: 'ironHelmRecipe', name: 'Iron Helm', category: 'combat', description: 'Increases defense and maximum health.', duration: 40, costs: { 'Iron Ingot': 3, 'Oak Log': 2 }, outputGear: 'ironHelm', progress: 0 },
  { id: 'ironChestRecipe', name: 'Ironbark Cuirass', category: 'combat', description: 'Heavy protection for dangerous enemy tiers.', duration: 75, costs: { 'Iron Ingot': 6, 'Oak Log': 8 }, outputGear: 'ironChest', progress: 0 },
  { id: 'ironLegsRecipe', name: 'Iron Greaves', category: 'combat', description: 'Durable protection for your legs.', duration: 65, costs: { 'Iron Ingot': 5, 'Oak Log': 4 }, outputGear: 'ironLegs', progress: 0 },
  { id: 'trailBootsRecipe', name: 'Trailrunner Boots', category: 'combat', description: 'Improves combat and gathering speed.', duration: 32, costs: { 'Birch Log': 8, 'Copper Ingot': 2 }, outputGear: 'trailBoots', progress: 0 },
  { id: 'loggerGlovesRecipe', name: 'Artisan Gloves', category: 'accessories', description: 'Improves gathering speed and crit chance for both skills.', duration: 48, costs: { 'Maple Log': 8, 'Iron Ingot': 2 }, outputGear: 'loggerGloves', progress: 0 },
  { id: 'silverRingRecipe', name: 'Ring of Momentum', category: 'accessories', description: 'Improves woodcutting and mining speed.', duration: 85, costs: { 'Silver Ingot': 5, 'Gold Ore': 2 }, outputGear: 'silverRing', progress: 0 },
  { id: 'moonAmuletRecipe', name: 'Moonstone Amulet', category: 'accessories', description: 'Greatly improves gathering crit power.', duration: 150, costs: { Moonstone: 6, 'Spirit Log': 5, 'Gold Ore': 5 }, outputGear: 'moonAmulet', progress: 0 },
  { id: 'birchPlank', name: 'Birch Plank', category: 'components', description: 'Prepare one flexible board for light equipment.', duration: 16, costs: { 'Birch Log': 3 }, outputItem: 'Birch Plank', outputQty: 1, progress: 0 },
  { id: 'oakPlank', name: 'Oak Plank', category: 'components', description: 'Prepare one dense board for armor and tool hafts.', duration: 25, costs: { 'Oak Log': 3 }, outputItem: 'Oak Plank', outputQty: 1, progress: 0 },
  { id: 'stoneBlock', name: 'Cut Stone Block', category: 'components', description: 'A precisely shaped building component.', duration: 16, costs: { Stone: 4 }, outputItem: 'Stone Block', outputQty: 1, progress: 0 },
  { id: 'graniteBlock', name: 'Polished Granite', category: 'components', description: 'A durable component for advanced gear.', duration: 48, costs: { Granite: 4 }, outputItem: 'Granite Block', outputQty: 1, progress: 0 },
  { id: 'goldIngot', name: 'Gold Ingot', category: 'components', description: 'Refined gold that holds enchantments well.', duration: 65, costs: { 'Gold Ore': 4, Obsidian: 1 }, outputItem: 'Gold Ingot', outputQty: 1, progress: 0 },
  { id: 'obsidianPlate', name: 'Obsidian Plate', category: 'components', description: 'Fused volcanic glass and iron.', duration: 72, costs: { Obsidian: 4, 'Iron Ingot': 2 }, outputItem: 'Obsidian Plate', outputQty: 1, progress: 0 },
  { id: 'resinBinding', name: 'Resin Binding', category: 'components', description: 'Flexible reinforcement made from rare tree resin.', duration: 30, costs: { 'Ancient Resin': 2, 'Birch Plank': 1 }, outputItem: 'Resin Binding', outputQty: 2, progress: 0 },
  { id: 'cutGem', name: 'Cut Gem', category: 'components', description: 'A rough gem shaped for accessories and enchantments.', duration: 42, costs: { 'Rough Gem': 3, 'Silver Ingot': 1 }, outputItem: 'Cut Gem', outputQty: 1, progress: 0 },
  { id: 'crystalLens', name: 'Crystal Lens', category: 'components', description: 'A focused ore crystal for precision equipment.', duration: 55, costs: { 'Ore Crystal': 3, 'Gold Ingot': 1 }, outputItem: 'Crystal Lens', outputQty: 1, progress: 0 },
  { id: 'bronzeSwordRecipe', name: 'Bronze Shortsword', category: 'combat', description: 'An accessible weapon needed for tier III.', duration: 32, costs: { 'Copper Ingot': 2, 'Pine Plank': 1 }, outputGear: 'bronzeSword', progress: 0 },
  { id: 'copperHelmRecipe', name: 'Copper Cap', category: 'combat', description: 'Early health and defense.', duration: 30, costs: { 'Copper Ingot': 2, 'Pine Plank': 1 }, outputGear: 'copperHelm', progress: 0 },
  { id: 'copperChestRecipe', name: 'Copper Scale Vest', category: 'combat', description: 'Early armor for surviving tier II and III.', duration: 45, costs: { 'Copper Ingot': 4, 'Birch Plank': 2 }, outputGear: 'copperChest', progress: 0 },
  { id: 'campCharmRecipe', name: 'Hearthstone Charm', category: 'accessories', description: 'Reduces death recovery by 1.5 seconds.', duration: 50, costs: { 'Birch Plank': 3, 'Stone Block': 2, 'Ancient Resin': 1 }, outputGear: 'campCharm', progress: 0 },
  { id: 'scoutTokenRecipe', name: 'Scout’s Token', category: 'accessories', description: 'Reduces the delay before combat by 0.4 seconds.', duration: 55, costs: { 'Copper Ingot': 3, 'Birch Plank': 2, 'Rough Gem': 1 }, outputGear: 'scoutToken', progress: 0 },
  { id: 'silverSaberRecipe', name: 'Silver Saber', category: 'combat', description: 'An advanced fast weapon.', duration: 95, costs: { 'Silver Ingot': 7, 'Yew Log': 5 }, outputGear: 'silverSaber', progress: 0 },
  { id: 'obsidianHelmRecipe', name: 'Obsidian War Helm', category: 'combat', description: 'Upper-tier defensive equipment.', duration: 120, costs: { 'Obsidian Plate': 4, 'Silver Ingot': 2 }, outputGear: 'obsidianHelm', progress: 0 },
  { id: 'obsidianChestRecipe', name: 'Obsidian Bulwark', category: 'combat', description: 'Massive health and defense with recovery speed.', duration: 165, costs: { 'Obsidian Plate': 7, 'Ironwood Log': 8 }, outputGear: 'obsidianChest', progress: 0 },
  { id: 'goldGreavesRecipe', name: 'Sunforged Greaves', category: 'combat', description: 'Defense that also shortens encounter preparation.', duration: 145, costs: { 'Gold Ingot': 6, 'Elder Log': 5 }, outputGear: 'goldGreaves', progress: 0 },
  { id: 'reinforcedBeam', name: 'Reinforced Oak Beam', category: 'components', description: 'A layered structural component for masterwork equipment.', duration: 52, costs: { 'Oak Plank': 3, 'Iron Ingot': 2, 'Resin Binding': 1 }, outputItem: 'Reinforced Beam', outputQty: 1, progress: 0 },
  { id: 'runedPlate', name: 'Runed Obsidian Plate', category: 'components', description: 'An obsidian plate engraved around a focused crystal.', duration: 95, costs: { 'Obsidian Plate': 2, 'Crystal Lens': 1, 'Gold Ingot': 1 }, outputItem: 'Runed Plate', outputQty: 1, progress: 0 },
  { id: 'forgeGlovesRecipe', name: 'Runebound Forge Gloves', category: 'accessories', description: 'A multi-stage masterwork that improves both gathering skills.', duration: 115, costs: { 'Resin Binding': 4, 'Reinforced Beam': 2, 'Silver Ingot': 3 }, outputGear: 'forgeGloves', progress: 0 },
  { id: 'masterBootsRecipe', name: 'Obsidian Pathfinder Boots', category: 'combat', description: 'Advanced boots combining runed plate and flexible bindings.', duration: 155, costs: { 'Runed Plate': 3, 'Resin Binding': 4, 'Yew Log': 5 }, outputGear: 'masterBoots', progress: 0 },
  { id: 'pineboundFrame', name: 'Pinebound Frame', category: 'components', description: 'The reusable foundation of tool and weapon construction.', duration: 22, costs: { 'Pine Plank': 3, 'Copper Ingot': 1 }, outputItem: 'Pinebound Frame', outputQty: 1, progress: 0 },
  { id: 'ironFittings', name: 'Iron Fittings', category: 'components', description: 'Iron hardware fitted around an earlier pinebound frame.', duration: 38, costs: { 'Pinebound Frame': 1, 'Iron Ingot': 3, 'Oak Plank': 2 }, outputItem: 'Iron Fittings', outputQty: 2, progress: 0 },
  { id: 'temperedToolHead', name: 'Tempered Tool Head', category: 'components', description: 'A reinforced working edge built from fittings and refined iron.', duration: 52, costs: { 'Iron Fittings': 2, 'Iron Ingot': 3, 'Granite Block': 1 }, outputItem: 'Tempered Tool Head', outputQty: 1, progress: 0 },
  { id: 'silverMechanism', name: 'Silver Mechanism', category: 'components', description: 'A precision assembly consuming both early fittings and tempered parts.', duration: 78, costs: { 'Iron Fittings': 2, 'Tempered Tool Head': 1, 'Silver Ingot': 3, 'Cut Gem': 1 }, outputItem: 'Silver Mechanism', outputQty: 1, progress: 0 },
  { id: 'obsidianCore', name: 'Obsidian Core', category: 'components', description: 'A dense advanced core formed around a silver mechanism.', duration: 115, costs: { 'Silver Mechanism': 2, 'Obsidian Plate': 3, 'Runed Plate': 1 }, outputItem: 'Obsidian Core', outputQty: 1, progress: 0 },
  { id: 'mythrilAssembly', name: 'Mythril Assembly', category: 'components', description: 'The final assembly consumes components from every earlier era.', duration: 165, costs: { 'Pinebound Frame': 2, 'Iron Fittings': 2, 'Silver Mechanism': 2, 'Obsidian Core': 1, 'Mythril Ingot': 4 }, outputItem: 'Mythril Assembly', outputQty: 1, progress: 0 },
]

export const slotLabels: Record<GearSlot, string> = {
  weapon: 'Weapon', helmet: 'Helmet', chest: 'Chest', legs: 'Legs', boots: 'Boots',
  gloves: 'Gloves', ring: 'Ring', amulet: 'Amulet', pickaxe: 'Pickaxe', hatchet: 'Hatchet',
}
