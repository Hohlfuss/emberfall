<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{ clientId: string; disabled?: boolean }>()
const emit = defineEmits<{ credential: [credential: string]; error: [message: string] }>()
const button = ref<HTMLElement | null>(null)
let initializedClientId = ''

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (result: { credential?: string }) => void }): void
          renderButton(element: HTMLElement, options: Record<string, string | number>): void
        }
      }
    }
  }
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-emberfall-google]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.emberfallGoogle = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Google sign-in.'))
    document.head.appendChild(script)
  })
}

async function renderGoogleButton() {
  if (!props.clientId || !button.value || props.disabled || initializedClientId === props.clientId) return
  try {
    await loadGoogleScript()
    await nextTick()
    if (!window.google || !button.value) throw new Error('Google sign-in is unavailable.')
    button.value.replaceChildren()
    window.google.accounts.id.initialize({
      client_id: props.clientId,
      callback: result => result.credential
        ? emit('credential', result.credential)
        : emit('error', 'Google sign-in was cancelled.'),
    })
    window.google.accounts.id.renderButton(button.value, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 320,
    })
    initializedClientId = props.clientId
  } catch (error) {
    emit('error', error instanceof Error ? error.message : 'Google sign-in is unavailable.')
  }
}

onMounted(renderGoogleButton)
watch(() => [props.clientId, props.disabled], () => {
  initializedClientId = ''
  void renderGoogleButton()
})
</script>

<template>
  <div ref="button" class="google-login-button" :aria-busy="disabled"></div>
</template>
