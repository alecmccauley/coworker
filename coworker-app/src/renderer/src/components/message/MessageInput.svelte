<script lang="ts">
  import SendIcon from '@lucide/svelte/icons/send'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'

  interface Props {
    onSend: (input: { content: string }) => Promise<void>
    disabled?: boolean
  }

  let { onSend, disabled = false }: Props = $props()

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

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }
</script>

<div class="border-t border-border bg-card/70 px-6 py-4">
  <div class="flex items-end gap-3">
    <Textarea
      bind:value={content}
      rows={2}
      placeholder="Write a message for your co-workers..."
      disabled={disabled || isSending}
      onkeydown={handleKeydown}
      class="flex-1"
    />
    <Button onclick={handleSend} disabled={!canSend} class="gap-2">
      <SendIcon class="h-4 w-4" />
      {isSending ? 'Sending...' : 'Send'}
    </Button>
  </div>
</div>
