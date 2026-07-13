<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ClanDetails, ClanInvitation, ClanSummary, ClanVisibility } from './useGame'
import GiftItems from './GiftItems.vue'

const props = defineProps<{
  clan: ClanDetails | null
  invitations: ClanInvitation[]
  publicClans: ClanSummary[]
  error: string
  notice: string
  busy: boolean
  inventory: Record<string, number>
  giftError: string
  giftNotice: string
  giftBusy: boolean
}>()

const emit = defineEmits<{
  refresh: []
  create: [name: string, description: string, visibility: ClanVisibility]
  join: [id: string]
  invite: [username: string]
  accept: [id: string]
  decline: [id: string]
  leave: []
  disband: []
  contribute: [item: string, quantity: number]
  fightRaid: []
  gift: [recipient: string, item: string, quantity: number]
}>()

const clanName = ref('')
const description = ref('')
const visibility = ref<ClanVisibility>('public')
const inviteUsername = ref('')
const search = ref('')
const contributionQuantity = ref(1)
const ownedDailyMaterial = computed(() => props.clan ? props.inventory[props.clan.dailyRequest.item] || 0 : 0)
const contributionPreview = computed(() => props.clan ? Math.max(0, contributionQuantity.value || 0) * props.clan.dailyRequest.valueEach : 0)
const raidHealthPercent = computed(() => props.clan ? Math.max(0, Math.min(100, props.clan.raid.currentHealth / props.clan.raid.maxHealth * 100)) : 0)
const highestRaidDamage = computed(() => props.clan ? Math.max(1, ...props.clan.raid.contributors.map(contributor => contributor.totalDamage)) : 1)

const filteredClans = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return props.publicClans
  return props.publicClans.filter(clan => `${clan.name} ${clan.description} ${clan.ownerName}`.toLowerCase().includes(query))
})

watch(() => props.notice, notice => {
  if (notice.startsWith('Invitation sent')) inviteUsername.value = ''
  if (notice.startsWith('Contributed')) contributionQuantity.value = 1
})

function createClan() {
  if (clanName.value.trim().length < 3) return
  emit('create', clanName.value, description.value, visibility.value)
}

function invite() {
  if (!inviteUsername.value.trim()) return
  emit('invite', inviteUsername.value)
}

function sendGift(recipient: string, item: string, quantity: number) {
  emit('gift', recipient, item, quantity)
}

function disband() {
  if (window.confirm(`Disband ${props.clan?.name}? All memberships, invitations, and clan messages will be permanently removed.`)) emit('disband')
}

function date(value: string) {
  return new Intl.DateTimeFormat([], { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

function dateTime(value: string | number) {
  return new Intl.DateTimeFormat([], { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value))
}
</script>

<template>
  <section class="clan-page page-content">
    <div class="page-heading clan-heading">
      <div><p class="eyebrow">PLAYER COMMUNITIES</p><h1>Clans</h1><p>Create a banner, invite players, or find a public clan. Clan chat is private to current members.</p></div>
      <button class="clan-refresh" type="button" :disabled="busy" @click="emit('refresh')">REFRESH</button>
    </div>

    <p v-if="error" class="clan-feedback error" role="alert">{{ error }}</p>
    <p v-else-if="notice" class="clan-feedback success" role="status">{{ notice }}</p>
    <GiftItems :inventory="inventory" :error="giftError" :notice="giftNotice" :busy="giftBusy" @send="sendGift" />

    <section v-if="!clan && invitations.length" class="clan-invitations">
      <header><div><span>PENDING</span><h2>Clan Invitations</h2></div><strong>{{ invitations.length }}</strong></header>
      <article v-for="invitation in invitations" :key="invitation.id">
        <b>🛡</b>
        <div><strong>{{ invitation.clanName }}</strong><small>Invited by {{ invitation.invitedByName }} · {{ invitation.clanVisibility === 'public' ? 'Public clan' : 'Invite only' }}</small></div>
        <div class="invitation-actions"><button type="button" :disabled="busy" @click="emit('decline', invitation.id)">DECLINE</button><button class="accent" type="button" :disabled="busy" @click="emit('accept', invitation.id)">ACCEPT</button></div>
      </article>
    </section>

    <template v-if="clan">
      <section class="clan-banner">
        <b>🛡</b>
        <div><span>{{ clan.visibility === 'public' ? 'PUBLIC CLAN' : 'INVITE ONLY' }}</span><h2>{{ clan.name }}</h2><p>{{ clan.description || 'No clan description has been written yet.' }}</p><small>Created by {{ clan.ownerName }} · {{ date(clan.createdAt) }}</small></div>
        <aside><strong>{{ clan.level }}</strong><span>CLAN LEVEL</span><small><i></i>{{ clan.memberCount }} members · {{ clan.online }} online</small></aside>
      </section>

      <div class="clan-dashboard">
        <main class="clan-main">
          <section class="clan-card raid-card" :class="{ defeated: clan.raid.defeated }">
            <header class="raid-heading">
              <div><span>WEEKLY CLAN RAID · DIFFICULTY {{ clan.raid.difficulty }}</span><h2>{{ clan.raid.name }}</h2><p>{{ clan.raid.title }}</p></div>
              <b>{{ clan.raid.icon }}</b>
            </header>

            <p class="raid-description">{{ clan.raid.description }}</p>
            <div class="raid-health">
              <div><span>{{ clan.raid.defeated ? 'BOSS DEFEATED' : 'SHARED BOSS HEALTH' }}</span><strong>{{ clan.raid.currentHealth.toLocaleString() }} / {{ clan.raid.maxHealth.toLocaleString() }}</strong></div>
              <div class="meter"><i :style="{ width: `${raidHealthPercent}%` }"></i></div>
            </div>

            <div class="raid-facts">
              <div><span>WEEK ENDS</span><strong>{{ dateTime(clan.raid.endsAt) }}</strong></div>
              <div><span>YOUR ATTEMPT</span><strong>{{ clan.raid.defeated ? 'Raid complete' : clan.raid.attemptAvailable ? 'Ready today' : `Used · resets ${dateTime(clan.raid.nextAttemptAt || clan.raid.endsAt)}` }}</strong></div>
              <div><span>MEMBER REWARD</span><strong>{{ clan.raid.rewards.gold.toLocaleString() }} gold · {{ clan.raid.rewards.xp.toLocaleString() }} XP</strong></div>
              <div><span>CLAN REWARD</span><strong>{{ clan.raid.rewards.clanXp.toLocaleString() }} clan XP</strong></div>
            </div>

            <button class="raid-fight" type="button" :disabled="busy || !clan.raid.attemptAvailable" @click="emit('fightRaid')">{{ clan.raid.defeated ? 'RAID BOSS DEFEATED' : clan.raid.attemptedToday ? 'TODAY’S ATTEMPT USED' : busy ? 'FIGHTING…' : 'USE DAILY RAID ATTEMPT' }}</button>
            <small class="raid-safety">One attempt per member each UTC day. Raid defeat does not reduce your normal health or gold. A victory rewards every clan member and makes the next weekly raid stronger.</small>

            <section class="raid-chart">
              <header><div><span>THIS WEEK</span><h3>Damage by Member</h3></div><strong>{{ clan.raid.contributors.reduce((total, contributor) => total + contributor.totalDamage, 0).toLocaleString() }} TOTAL</strong></header>
              <ol>
                <li v-for="(contributor,index) in clan.raid.contributors" :key="contributor.username">
                  <b>#{{ index + 1 }}</b>
                  <div><div><strong>{{ contributor.name }}</strong><small>{{ contributor.attempts }} attempt{{ contributor.attempts === 1 ? '' : 's' }}<template v-if="contributor.lastDamage"> · last {{ contributor.lastDamage.toLocaleString() }}</template></small></div><span :style="{ width: `${contributor.totalDamage / highestRaidDamage * 100}%` }"></span></div>
                  <strong>{{ contributor.totalDamage.toLocaleString() }}</strong>
                </li>
              </ol>
            </section>
          </section>

          <section class="clan-card contribution-card">
            <header><div><span>DAILY REQUEST · {{ clan.dailyRequest.date }}</span><h2>Contribute {{ clan.dailyRequest.item }}</h2></div><b>{{ clan.dailyRequest.icon }}</b></header>
            <div class="clan-level-progress"><div><span>CLAN LEVEL {{ clan.level }}</span><strong>{{ clan.xp.toLocaleString() }} / {{ clan.xpNeeded ? clan.xpNeeded.toLocaleString() : 'MAX' }} XP</strong></div><div class="meter"><i :style="{ width: clan.xpNeeded ? `${Math.min(100, clan.xp / clan.xpNeeded * 100)}%` : '100%' }"></i></div><small>{{ clan.totalXp.toLocaleString() }} total contribution XP</small></div>
            <div class="daily-material"><b>{{ clan.dailyRequest.icon }}</b><div><span>TIER {{ clan.dailyRequest.tier }} MATERIAL</span><strong>{{ clan.dailyRequest.item }}</strong><small>You own {{ ownedDailyMaterial.toLocaleString() }} · {{ clan.dailyRequest.valueEach }} XP each · changes daily at 00:00 UTC</small></div><aside><strong>{{ clan.dailyContributionValue.toLocaleString() }}</strong><span>XP TODAY</span></aside></div>
            <form class="contribution-form" @submit.prevent="emit('contribute', clan.dailyRequest.item, contributionQuantity)"><label><span>QUANTITY</span><input v-model.number="contributionQuantity" type="number" min="1" :max="ownedDailyMaterial || 1"></label><div><span>CONTRIBUTION VALUE</span><strong>{{ contributionPreview.toLocaleString() }} XP</strong></div><button class="accent" :disabled="busy || contributionQuantity < 1 || contributionQuantity > ownedDailyMaterial">CONTRIBUTE</button></form>
          </section>

          <section class="clan-card members-card">
            <header><div><span>ROSTER</span><h2>Members</h2></div><strong>{{ clan.memberCount }}</strong></header>
            <div class="clan-members">
              <article v-for="member in clan.members" :key="member.username">
                <i :class="{ online: member.online }"></i>
                <div><strong>{{ member.name }}</strong><small>Joined {{ date(member.joinedAt) }}</small></div>
                <span>{{ member.role === 'owner' ? 'CREATOR' : 'MEMBER' }}</span>
              </article>
            </div>
          </section>
        </main>

        <aside class="clan-side">
          <section class="clan-card contributor-card">
            <header><div><span>ALL-TIME RANKING</span><h2>Top Contributors</h2></div></header>
            <ol><li v-for="(contributor,index) in clan.topContributors" :key="contributor.username"><b>#{{ index + 1 }}</b><div><strong>{{ contributor.name }}</strong><small>{{ contributor.totalItems.toLocaleString() }} materials</small></div><span>{{ contributor.totalValue.toLocaleString() }} XP</span></li></ol>
            <p v-if="!clan.topContributors.length" class="clan-empty compact">No contributions yet.</p>
          </section>
          <section v-if="clan.role === 'owner'" class="clan-card">
            <header><div><span>RECRUITMENT</span><h2>Invite a Player</h2></div></header>
            <p>Enter the player’s username or unique display name. They can accept or decline from this page.</p>
            <form class="clan-form compact" @submit.prevent="invite">
              <label><span>PLAYER NAME</span><input v-model="inviteUsername" maxlength="30" placeholder="Unique display name or username" required></label>
              <button class="accent" :disabled="busy || inviteUsername.trim().length < 3">SEND INVITATION</button>
            </form>
          </section>

          <section class="clan-card clan-danger">
            <header><div><span>{{ clan.role === 'owner' ? 'CLAN CONTROL' : 'MEMBERSHIP' }}</span><h2>{{ clan.role === 'owner' ? 'Disband Clan' : 'Leave Clan' }}</h2></div></header>
            <p>{{ clan.role === 'owner' ? 'Permanently removes the clan, its invitations, and clan-chat history.' : 'Your clan-chat access ends immediately. You can join another clan afterward.' }}</p>
            <button v-if="clan.role === 'owner'" type="button" :disabled="busy" @click="disband">DISBAND CLAN</button>
            <button v-else type="button" :disabled="busy" @click="emit('leave')">LEAVE CLAN</button>
          </section>
        </aside>
      </div>
    </template>

    <div v-else class="clan-discovery">
      <section class="clan-card create-clan">
        <header><div><span>NEW BANNER</span><h2>Create a Clan</h2></div></header>
        <form class="clan-form" @submit.prevent="createClan">
          <label><span>CLAN NAME</span><input v-model="clanName" minlength="3" maxlength="30" placeholder="3–30 characters" required></label>
          <label><span>DESCRIPTION</span><textarea v-model="description" maxlength="160" rows="3" placeholder="What kind of players are you looking for?"></textarea><small>{{ description.length }} / 160</small></label>
          <fieldset><legend>WHO CAN JOIN?</legend><button type="button" :class="{ selected: visibility === 'public' }" @click="visibility = 'public'"><b>🌍</b><span><strong>Public</strong><small>Listed in Clan Finder. Any player can join.</small></span></button><button type="button" :class="{ selected: visibility === 'invite_only' }" @click="visibility = 'invite_only'"><b>🔒</b><span><strong>Invite only</strong><small>Players must accept an invitation from you.</small></span></button></fieldset>
          <button class="accent" :disabled="busy || clanName.trim().length < 3">CREATE CLAN</button>
        </form>
      </section>

      <section class="clan-card finder-card">
        <header><div><span>OPEN RECRUITMENT</span><h2>Clan Finder</h2></div><strong>{{ filteredClans.length }}</strong></header>
        <label class="clan-search"><span aria-hidden="true">⌕</span><input v-model="search" placeholder="Search by clan, description, or creator" aria-label="Search public clans"></label>
        <div class="public-clans">
          <article v-for="entry in filteredClans" :key="entry.id">
            <b>🛡</b><div><strong>{{ entry.name }}</strong><p>{{ entry.description || 'Open to new adventurers.' }}</p><small>Level {{ entry.level }} · {{ entry.memberCount }} member{{ entry.memberCount === 1 ? '' : 's' }} · Creator {{ entry.ownerName }}</small></div><button class="accent" type="button" :disabled="busy" @click="emit('join', entry.id)">JOIN</button>
          </article>
          <p v-if="!filteredClans.length" class="clan-empty">{{ search ? 'No public clans match your search.' : 'No public clans yet. Create the first one.' }}</p>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.clan-page{width:min(100%,1280px);padding-bottom:110px}.clan-heading>div>p:last-child{max-width:680px}.clan-refresh,.clan-card button,.clan-invitations button{padding:10px 13px;border:1px solid #ffffff1a;color:#92949a;background:#ffffff06;font:700 8px Cinzel;letter-spacing:.06em;cursor:pointer}.clan-refresh{margin-bottom:23px;border-color:#a47a3c;color:#d4a553;background:#a47a3c12}.clan-feedback{padding:12px 14px;border:1px solid;font-size:10px}.clan-feedback.error{border-color:#a9564c66;color:#d77b70;background:#a9564c12}.clan-feedback.success{border-color:#60a86c66;color:#82c98d;background:#60a86c12}.clan-invitations{margin-bottom:18px;padding:18px;border:1px solid #d5a54e4f;background:#d5a54e0a}.clan-invitations>header,.clan-card>header{display:flex;align-items:end;justify-content:space-between;margin-bottom:13px}.clan-invitations header span,.clan-card header span{color:#98753f;font-size:7px;font-weight:800;letter-spacing:.15em}.clan-invitations h2,.clan-card h2{margin:4px 0 0;font-size:21px;text-transform:none}.clan-invitations>header>strong,.clan-card>header>strong{color:#d8a94f;font:800 19px Cinzel}.clan-invitations article{padding:12px;display:grid;grid-template-columns:35px 1fr auto;align-items:center;gap:11px;border:1px solid #ffffff10;background:#090a0e}.clan-invitations article>b{font-size:24px}.clan-invitations article strong,.clan-invitations article small{display:block}.clan-invitations article strong{font:700 13px Cinzel}.clan-invitations article small{margin-top:4px;color:#74767b;font-size:9px}.invitation-actions{display:flex;gap:5px}.accent{border-color:#bd8b3e!important;color:#171008!important;background:linear-gradient(#e1b45b,#ad7328)!important}.clan-banner{padding:24px;display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center;gap:20px;border:1px solid #d5a54e55;background:radial-gradient(circle at 80% 0,#d5a54e18,transparent 42%),#0b0d11}.clan-banner>b{display:grid;place-items:center;width:68px;height:68px;border:1px solid #d5a54e55;background:#d5a54e0b;font-size:37px}.clan-banner>div>span{color:#c3954b;font-size:8px;font-weight:800;letter-spacing:.15em}.clan-banner h2{margin:5px 0;font-size:34px;text-transform:none}.clan-banner p{margin:0 0 7px;color:#8a8c91;font-size:10px}.clan-banner small{color:#62646a;font-size:8px}.clan-banner aside{min-width:100px;text-align:center}.clan-banner aside>strong,.clan-banner aside>span,.clan-banner aside>small{display:block}.clan-banner aside>strong{color:#e2b45b;font:800 31px Cinzel}.clan-banner aside>span{color:#777a80;font-size:7px;letter-spacing:.13em}.clan-banner aside>small{margin-top:8px;color:#78b783}.clan-banner aside i{display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:#63c478;box-shadow:0 0 7px #63c478}.clan-dashboard,.clan-discovery{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);align-items:start;gap:14px;margin-top:14px}.clan-discovery{grid-template-columns:minmax(300px,.75fr) minmax(0,1.25fr)}.clan-card{padding:20px;border:1px solid #ffffff12;background:linear-gradient(145deg,#ffffff06,transparent)}.clan-card>p{color:#777a80;font-size:9px;line-height:1.5}.clan-side{display:grid;gap:14px}.clan-members{display:grid;gap:5px}.clan-members article{padding:11px;display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid #ffffff0d;background:#07080b}.clan-members article>i{width:6px;height:6px;border-radius:50%;background:#4b4e54}.clan-members article>i.online{background:#63c478;box-shadow:0 0 7px #63c478}.clan-members article strong,.clan-members article small{display:block}.clan-members article strong{font:600 11px Cinzel}.clan-members article small{margin-top:3px;color:#5f6268;font-size:8px}.clan-members article>span{color:#98783f;font-size:7px;font-weight:800}.clan-form{display:grid;gap:13px}.clan-form label{display:grid;gap:6px}.clan-form label>span,.clan-form legend{color:#777a80;font-size:7px;font-weight:800;letter-spacing:.12em}.clan-form input,.clan-form textarea,.clan-search input{width:100%;min-width:0;padding:11px;border:1px solid #ffffff17;outline:0;color:#ddd;background:#06070a;resize:vertical}.clan-form input:focus,.clan-form textarea:focus,.clan-search:focus-within{border-color:#aa7e3e}.clan-form label>small{justify-self:end;margin-top:-3px;color:#55585e;font-size:7px}.clan-form fieldset{padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px;border:0}.clan-form legend{margin-bottom:6px}.clan-form fieldset button{min-height:75px;padding:10px;display:grid;grid-template-columns:25px 1fr;align-items:start;gap:7px;text-align:left}.clan-form fieldset button>b{font-size:19px}.clan-form fieldset button span>*{display:block}.clan-form fieldset button strong{color:#b6b7b8;font-size:9px}.clan-form fieldset button small{margin-top:4px;color:#64666b;font:400 8px/1.4 Inter}.clan-form fieldset button.selected{border-color:#d5a54e77;background:#d5a54e0d}.clan-form fieldset button.selected strong{color:#e4b65f}.clan-form.compact{grid-template-columns:1fr auto;align-items:end}.clan-danger{border-color:#8e494244}.clan-danger button{width:100%;border-color:#9e5148;color:#d27b70;background:#9e514812}.clan-search{display:grid;grid-template-columns:32px 1fr;align-items:center;margin-bottom:10px;border:1px solid #ffffff15;background:#06070a}.clan-search>span{color:#73767b;text-align:center}.clan-search input{border:0}.public-clans{max-height:560px;display:grid;gap:6px;overflow-y:auto}.public-clans article{padding:13px;display:grid;grid-template-columns:35px minmax(0,1fr) auto;align-items:center;gap:11px;border:1px solid #ffffff0e;background:#07080b}.public-clans article>b{font-size:24px}.public-clans article strong{font:700 12px Cinzel}.public-clans article p{margin:4px 0;color:#777a80;font-size:9px}.public-clans article small{color:#5e6167;font-size:8px}.clan-empty{padding:35px;text-align:center;color:#65686e;font-size:10px}
.clan-main{display:grid;gap:14px}.contribution-card{border-color:#6f9a7047;background:linear-gradient(135deg,#62966c10,transparent)}.contribution-card>header>b{font-size:31px}.clan-level-progress{padding:12px;border:1px solid #ffffff0e;background:#06070a}.clan-level-progress>div:first-child{display:flex;justify-content:space-between;gap:10px}.clan-level-progress span,.contribution-form span,.daily-material aside span{color:#74777d;font-size:7px;font-weight:800;letter-spacing:.1em}.clan-level-progress strong{color:#e1b35a;font-size:9px}.clan-level-progress .meter{margin:8px 0 6px}.clan-level-progress>small{color:#585b61;font-size:7px}.daily-material{margin-top:8px;padding:13px;display:grid;grid-template-columns:45px minmax(0,1fr) auto;align-items:center;gap:12px;border:1px solid #6f9a7040;background:#5f96680a}.daily-material>b{font-size:32px;text-align:center}.daily-material>div span,.daily-material>div strong,.daily-material>div small{display:block}.daily-material>div span{color:#76a37d;font-size:7px;font-weight:800;letter-spacing:.12em}.daily-material>div strong{margin-top:3px;font:700 13px Cinzel}.daily-material>div small{margin-top:4px;color:#666970;font-size:8px}.daily-material>aside{text-align:right}.daily-material>aside strong{display:block;color:#86bd8c;font:800 20px Cinzel}.contribution-form{margin-top:8px;display:grid;grid-template-columns:100px 1fr auto;align-items:end;gap:8px}.contribution-form label{display:grid;gap:5px}.contribution-form input{width:100%;padding:10px;border:1px solid #ffffff17;outline:0;color:#ddd;background:#06070a}.contribution-form>div{padding:7px 3px}.contribution-form>div span,.contribution-form>div strong{display:block}.contribution-form>div strong{margin-top:3px;color:#86bd8c;font:700 13px Cinzel}.contributor-card ol{margin:0;padding:0;display:grid;gap:5px;list-style:none}.contributor-card li{padding:9px;display:grid;grid-template-columns:25px minmax(0,1fr) auto;align-items:center;gap:8px;border:1px solid #ffffff0d;background:#07080b}.contributor-card li>b{color:#9a7941;font-size:8px}.contributor-card li strong,.contributor-card li small{display:block}.contributor-card li strong{font:600 10px Cinzel}.contributor-card li small{margin-top:2px;color:#5e6167;font-size:7px}.contributor-card li>span{color:#83b889;font-size:8px;font-weight:800}.clan-empty.compact{padding:15px;margin:0}
.raid-card{border-color:#9f504d66;background:radial-gradient(circle at 100% 0,#a84f451f,transparent 40%),linear-gradient(145deg,#191112,#0b0c10)}.raid-card.defeated{border-color:#66966c66;background:radial-gradient(circle at 100% 0,#5995651c,transparent 40%),linear-gradient(145deg,#111713,#0b0c10)}.raid-heading{align-items:center!important}.raid-heading>div>p{margin:3px 0 0;color:#9e5e58;font:700 9px Cinzel}.raid-heading>b{font-size:47px;filter:drop-shadow(0 0 15px #b85c4d77)}.raid-description{margin:0 0 13px!important;color:#8d8585!important;font-size:10px!important}.raid-health{padding:13px;border:1px solid #a9564c40;background:#07080b}.raid-health>div:first-child{display:flex;justify-content:space-between;gap:10px}.raid-health span,.raid-facts span{color:#a9655d;font-size:7px;font-weight:800;letter-spacing:.12em}.raid-health strong{color:#e0aaa3;font-size:10px}.raid-health .meter{height:11px;margin-top:8px}.raid-health .meter i{background:linear-gradient(90deg,#8d2924,#db695c);box-shadow:0 0 11px #b74439}.raid-card.defeated .raid-health .meter i{background:linear-gradient(90deg,#3f754b,#7dba86);box-shadow:0 0 11px #5f9969}.raid-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0}.raid-facts>div{padding:10px;border:1px solid #ffffff0e;background:#07080b}.raid-facts span,.raid-facts strong{display:block}.raid-facts strong{margin-top:4px;color:#b9b2ad;font-size:9px}.raid-fight{width:100%;min-height:44px;border-color:#b95b4f!important;color:#f4d1ca!important;background:linear-gradient(#ad594e,#71322e)!important}.raid-card.defeated .raid-fight{border-color:#578363!important;color:#91c79a!important;background:#4d79561c!important}.raid-safety{display:block;margin:8px 0 15px;color:#67696e;font-size:8px;line-height:1.5}.raid-chart{border-top:1px solid #ffffff10;padding-top:13px}.raid-chart>header{display:flex;justify-content:space-between;align-items:end}.raid-chart h3{margin:3px 0 0;font:700 15px Cinzel}.raid-chart>header>strong{color:#ca7770;font-size:9px}.raid-chart ol{margin:9px 0 0;padding:0;display:grid;gap:5px;list-style:none}.raid-chart li{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:8px}.raid-chart li>b{color:#87645f;font-size:7px}.raid-chart li>div{position:relative;min-width:0;padding:7px 8px;overflow:hidden;background:#07080b}.raid-chart li>div>span{position:absolute;inset:0 auto 0 0;max-width:100%;background:#a54f4615}.raid-chart li>div>div{position:relative;z-index:1}.raid-chart li>div strong,.raid-chart li>div small{display:block}.raid-chart li>div strong{font:600 9px Cinzel}.raid-chart li>div small{margin-top:2px;color:#5f6166;font-size:7px}.raid-chart li>strong{color:#d08a80;font-size:9px}
@media(max-width:850px){.clan-dashboard,.clan-discovery{grid-template-columns:1fr}.clan-side{grid-template-columns:1fr 1fr}}
@media(max-width:620px){.clan-page{padding:20px 10px 100px}.clan-heading{align-items:start;flex-direction:column}.clan-refresh{width:100%;margin-bottom:14px}.clan-invitations{padding:10px}.clan-invitations article{grid-template-columns:30px 1fr}.invitation-actions{grid-column:2;width:100%}.invitation-actions button{flex:1}.clan-banner{grid-template-columns:50px 1fr;padding:15px;gap:12px}.clan-banner>b{width:48px;height:48px;font-size:27px}.clan-banner h2{font-size:25px}.clan-banner aside{grid-column:1/-1;display:flex;align-items:center;gap:7px;text-align:left}.clan-banner aside>strong{font-size:21px}.clan-banner aside>small{margin:0 0 0 auto}.clan-side{grid-template-columns:1fr}.clan-card{padding:15px}.clan-form fieldset{grid-template-columns:1fr}.clan-form.compact{grid-template-columns:1fr}.public-clans article{grid-template-columns:30px 1fr}.public-clans article>button{grid-column:2;width:100%}.clan-members article{grid-template-columns:7px 1fr}.clan-members article>span{grid-column:2}}
@media(max-width:620px){.daily-material{grid-template-columns:38px 1fr}.daily-material>aside{grid-column:2;text-align:left}.contribution-form{grid-template-columns:90px 1fr}.contribution-form>button{grid-column:1/-1}.clan-level-progress>div:first-child{align-items:start;flex-direction:column}}
@media(max-width:620px){.raid-heading>b{font-size:38px}.raid-facts{grid-template-columns:1fr}.raid-health>div:first-child{align-items:start;flex-direction:column}.raid-chart>header{align-items:start;flex-direction:column;gap:5px}}
</style>
