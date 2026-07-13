<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ChatMessage } from './useGame'

const props = defineProps<{
  messages: ChatMessage[]
  online: number
  error: string
  clanMessages: ChatMessage[]
  clanOnline: number
  clanName: string | null
  clanError: string
}>()
const emit = defineEmits<{ send: [channel: 'realm' | 'clan', message: string] }>()
const draft = ref('')
const list = ref<HTMLElement>()
const savedMinimized = localStorage.getItem('emberfall-chat-minimized')
const minimized = ref(savedMinimized === null ? window.matchMedia('(max-width: 720px)').matches : savedMinimized === 'true')
const savedChannel = localStorage.getItem('emberfall-chat-channel')
const channel = ref<'realm' | 'clan'>(savedChannel === 'clan' ? 'clan' : 'realm')
const activeMessages = computed(() => channel.value === 'clan' ? props.clanMessages : props.messages)
const activeOnline = computed(() => channel.value === 'clan' ? props.clanOnline : props.online)
const activeError = computed(() => channel.value === 'clan' ? props.clanError : props.error)
const channelLabel = computed(() => channel.value === 'clan' ? props.clanName || 'Clan Chat' : 'Realm Chat')

function toggleMinimized() {
  minimized.value = !minimized.value
  localStorage.setItem('emberfall-chat-minimized', String(minimized.value))
}

function submit() {
  const message = draft.value.trim()
  if (!message) return
  emit('send', channel.value, message)
  draft.value = ''
}

function selectChannel(next: 'realm' | 'clan') {
  if (next === 'clan' && !props.clanName) return
  channel.value = next
  localStorage.setItem('emberfall-chat-channel', next)
  draft.value = ''
}

watch(() => [channel.value, activeMessages.value.length], async () => {
  await nextTick()
  list.value?.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' })
})

watch(() => props.clanName, name => {
  if (!name && channel.value === 'clan') selectChannel('realm')
}, { immediate: true })

function time(value: string) {
  return new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
</script>

<template>
  <aside class="chat-panel" :class="{ minimized }">
    <button
      class="chat-header"
      type="button"
      :aria-expanded="!minimized"
      :title="minimized ? `Open ${channelLabel}` : `Minimize ${channelLabel}`"
      @click="toggleMinimized"
    >
      <strong>{{ channelLabel }}</strong>
      <span><i></i>{{ activeOnline }} online <b>{{ minimized ? '▲' : '▼' }}</b></span>
    </button>
    <nav v-show="!minimized" class="chat-channels" aria-label="Chat channels">
      <button type="button" :class="{ selected: channel === 'realm' }" @click="selectChannel('realm')">REALM</button>
      <button type="button" :class="{ selected: channel === 'clan' }" :disabled="!clanName" :title="clanName ? `Chat with ${clanName}` : 'Join a clan to unlock clan chat'" @click="selectChannel('clan')">CLAN</button>
    </nav>
    <div v-show="!minimized" ref="list" class="chat-messages">
      <p v-if="!activeMessages.length" class="chat-empty">No messages yet. Say hello!</p>
      <article v-for="entry in activeMessages" :key="entry.id">
        <div><strong>{{ entry.name }}</strong><time :datetime="entry.createdAt">{{ time(entry.createdAt) }}</time></div>
        <p>{{ entry.message }}</p>
      </article>
    </div>
    <p v-show="!minimized" v-if="activeError" class="chat-error">{{ activeError }}</p>
    <form v-show="!minimized" @submit.prevent="submit">
      <input v-model="draft" maxlength="240" :placeholder="channel === 'clan' ? 'Message your clan…' : 'Message the realm…'" :aria-label="`${channelLabel} message`">
      <button :disabled="!draft.trim()" title="Send message">➤</button>
    </form>
  </aside>
</template>

<style scoped>
.chat-channels{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #ffffff12;background:#07080b}.chat-channels button{padding:8px;border:0;border-bottom:2px solid transparent;color:#686b71;background:transparent;font-size:8px;font-weight:800;letter-spacing:.12em;cursor:pointer}.chat-channels button.selected{border-bottom-color:#d5a54e;color:#e1b159;background:#d5a54e0b}.chat-channels button:disabled{color:#3f4146;cursor:not-allowed}
</style>
