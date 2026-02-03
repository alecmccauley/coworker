<script lang="ts">
  import { cn } from '$lib/utils.js'
  import type { Message } from '$lib/types'

  interface Props {
    message: Message
    authorLabel: string
    isOwn?: boolean
    highlight?: boolean
  }

  let { message, authorLabel, isOwn = false, highlight = false }: Props = $props()

  const content = $derived(
    message.contentShort ??
      (message.contentRef ? 'Content stored in attachments.' : '')
  )
</script>

<div class={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
  <span class="text-xs font-medium text-muted-foreground">{authorLabel}</span>
  <div
    class={cn(
      'max-w-2xl rounded-2xl border px-4 py-3 text-sm leading-relaxed',
      isOwn && 'border-foreground bg-foreground text-background',
      !isOwn && highlight && 'border-accent/40 bg-accent/10 text-foreground',
      !isOwn && !highlight && 'border-border bg-card text-foreground'
    )}
  >
    {content || 'No message content yet.'}
  </div>
</div>
