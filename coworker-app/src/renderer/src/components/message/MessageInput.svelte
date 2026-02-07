<script lang="ts">
  import SendIcon from '@lucide/svelte/icons/send'
  import { Button } from '$lib/components/ui/button'
  import TokenizedInput from './TokenizedInput.svelte'
  import type { Coworker } from '$lib/types'

  interface Props {
    onSend: (input: { content: string }) => Promise<void>
    coworkers: Coworker[]
    channelId: string
    disabled?: boolean
  }

  let { onSend, coworkers, channelId, disabled = false }: Props = $props()

  let content = $state('')
  let isSending = $state(false)
  let availableCoworkers = $state<Coworker[]>([])

  const canSend = $derived(content.trim().length > 0 && !disabled && !isSending)

  $effect(() => {
    if (coworkers.length > 0) {
      availableCoworkers = coworkers
      return
    }
    if (!channelId) {
      availableCoworkers = []
      return
    }
    void loadCoworkersFromChannel()
  })

  async function loadCoworkersFromChannel(): Promise<void> {
    try {
      availableCoworkers = await window.api.channel.listCoworkers(channelId)
    } catch (error) {
      console.error('Failed to load channel coworkers:', error)
      availableCoworkers = []
    }
  }

  async function handleSend(): Promise<void> {
    if (!canSend) return

    isSending = true
    try {
      await onSend({ content: content.trim() })
      content = ''
    } finally {
      isSending = false
    }
  }

  function handleSubmit(): void {
    void handleSend()
  }
</script>

<div class="border-t border-border bg-card/70 px-6 py-4">
  <div class="flex items-end gap-3">
    <div class="flex-1">
      <TokenizedInput
        value={content}
        coworkers={availableCoworkers}
        disabled={disabled || isSending}
        placeholder="Write a message for your co-workers..."
        onChange={(next) => (content = next)}
        onSubmit={handleSubmit}
      />
    </div>
    <Button onclick={handleSend} disabled={!canSend} class="gap-2">
      <SendIcon class="h-4 w-4" />
      {isSending ? 'Sending...' : 'Send'}
    </Button>
  </div>
</div>
