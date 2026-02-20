<script lang="ts">
  import SendIcon from '@lucide/svelte/icons/send'
  import ReplyIcon from '@lucide/svelte/icons/reply'
  import XIcon from '@lucide/svelte/icons/x'
  import { Button } from '$lib/components/ui/button'
  import MentionComposerInput from './MentionComposerInput.svelte'
  import type { Coworker } from '$lib/types'
  import TypingIndicator from '../thread/TypingIndicator.svelte'

  interface Props {
    onSend: (input: { content: string; replyToMessageId?: string }) => Promise<void>
    coworkers: Coworker[]
    channelId: string
    threadId: string
    replyTarget?: {
      messageId: string
      authorLabel: string
      contentPreview: string
    } | null
    onClearReply?: () => void
    disabled?: boolean
    showActivity?: boolean
  }

  let {
    onSend,
    coworkers,
    channelId,
    threadId,
    replyTarget = null,
    onClearReply,
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
      await onSend({
        content: content.trim(),
        replyToMessageId: replyTarget?.messageId
      })
      content = ''
      onClearReply?.()
    } finally {
      isSending = false
    }
  }

  function handleSubmit(): void {
    void handleSend()
  }
</script>

<div class="border-t border-border bg-card/70 px-6 py-4">
  {#if replyTarget}
    <div class="mb-3 flex items-start justify-between rounded-lg border border-accent/40 bg-accent/10 px-3 py-2">
      <div class="min-w-0">
        <p class="flex items-center gap-1 text-xs font-medium text-accent">
          <ReplyIcon class="h-3.5 w-3.5" />
          Replying to {replyTarget.authorLabel}
        </p>
        <p class="mt-1 line-clamp-2 text-xs text-foreground/85">
          {replyTarget.contentPreview}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="h-7 px-2"
        onclick={() => onClearReply?.()}
      >
        <XIcon class="h-4 w-4" />
      </Button>
    </div>
  {/if}
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
