<script lang="ts">
  import SendIcon from '@lucide/svelte/icons/send'
  import { Button } from '$lib/components/ui/button'
  import MentionComposerInput from './MentionComposerInput.svelte'
  import type { Coworker } from '$lib/types'
  import TypingIndicator from '../thread/TypingIndicator.svelte'

  interface Props {
    onSend: (input: { content: string }) => Promise<void>
    coworkers: Coworker[]
    channelId: string
    threadId: string
    disabled?: boolean
    showActivity?: boolean
  }

  let {
    onSend,
    coworkers,
    channelId,
    threadId,
    disabled = false,
    showActivity = false
  }: Props = $props()

  let content = $state('')
  let isSending = $state(false)

  const canSend = $derived(content.trim().length > 0 && !disabled && !isSending)

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
  {#if showActivity}
    <div class="mb-2">
      <TypingIndicator />
    </div>
  {/if}
  <div class="flex items-end gap-3">
    <div class="flex-1">
      <MentionComposerInput
        value={content}
        {coworkers}
        {channelId}
        {threadId}
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
