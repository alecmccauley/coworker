<script lang="ts">
  import SendIcon from '@lucide/svelte/icons/send'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'
  import type { AuthorType, Coworker } from '$lib/types'

  interface Props {
    coworkers: Coworker[]
    onSend: (input: { content: string; authorType: AuthorType; authorId?: string }) => Promise<void>
    disabled?: boolean
  }

  let { coworkers, onSend, disabled = false }: Props = $props()

  let content = $state('')
  let selectedCoworkerId = $state<string>('me')
  let isSending = $state(false)

  const canSend = $derived(content.trim().length > 0 && !disabled && !isSending)

  async function handleSend(): Promise<void> {
    if (!canSend) return

    isSending = true
    try {
      const authorType: AuthorType = selectedCoworkerId === 'me' ? 'user' : 'coworker'
      const authorId = selectedCoworkerId === 'me' ? undefined : selectedCoworkerId
      await onSend({ content: content.trim(), authorType, authorId })
      content = ''
    } finally {
      isSending = false
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }
</script>

<div class="border-t border-border bg-card/70 px-6 py-4">
  <div class="flex items-end gap-3">
    <div class="flex flex-1 flex-col gap-2">
      <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Send as
      </label>
      <div class="flex items-center gap-3">
        <select
          bind:value={selectedCoworkerId}
          class="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          disabled={disabled || isSending}
        >
          <option value="me">You</option>
          {#each coworkers as coworker (coworker.id)}
            <option value={coworker.id}>{coworker.name}</option>
          {/each}
        </select>
        <Textarea
          bind:value={content}
          rows={2}
          placeholder="Write a message for your co-workers..."
          disabled={disabled || isSending}
          onkeydown={handleKeydown}
          class="flex-1"
        />
      </div>
    </div>
    <Button onclick={handleSend} disabled={!canSend} class="gap-2">
      <SendIcon class="h-4 w-4" />
      {isSending ? 'Sending...' : 'Send'}
    </Button>
  </div>
</div>
