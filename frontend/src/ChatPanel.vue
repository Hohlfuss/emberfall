<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { ChatMessage } from './useGame'

const props = defineProps<{ messages: ChatMessage[]; online: number; error: string }>()
const emit = defineEmits<{ send: [message: string] }>()
const draft = ref('')
const list = ref<HTMLElement>()
const minimized = ref(localStorage.getItem('emberfall-chat-minimized') === 'true')

function toggleMinimized() {
  minimized.value = !minimized.value
  localStorage.setItem('emberfall-chat-minimized', String(minimized.value))
}

function submit() {
  const message = draft.value.trim()
  if (!message) return
  emit('send', message)
  draft.value = ''
}

watch(() => props.messages.length, async () => {
  await nextTick()
  list.value?.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' })
})

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
      :title="minimized ? 'Open Realm Chat' : 'Minimize Realm Chat'"
      @click="toggleMinimized"
    >
      <strong>Realm Chat</strong>
      <span><i></i>{{ online }} online <b>{{ minimized ? '▲' : '▼' }}</b></span>
    </button>
    <div v-show="!minimized" ref="list" class="chat-messages">
      <p v-if="!messages.length" class="chat-empty">No messages yet. Say hello!</p>
      <article v-for="entry in messages" :key="entry.id">
        <div><strong>{{ entry.name }}</strong><time :datetime="entry.createdAt">{{ time(entry.createdAt) }}</time></div>
        <p>{{ entry.message }}</p>
      </article>
    </div>
    <p v-show="!minimized" v-if="error" class="chat-error">{{ error }}</p>
    <form v-show="!minimized" @submit.prevent="submit">
      <input v-model="draft" maxlength="240" placeholder="Message the realm…" aria-label="Chat message">
      <button :disabled="!draft.trim()" title="Send message">➤</button>
    </form>
  </aside>
</template>
