<script lang="ts">
  import { cn } from '$lib/utils.js'
  import { renderMarkdown } from '$lib/markdown.js'
  import type { Message } from '$lib/types'

  interface Props {
    message: Message
    authorLabel: string
    isOwn?: boolean
    highlight?: boolean
    activityLabel?: string
    isQueued?: boolean
  }

  let {
    message,
    authorLabel,
    isOwn = false,
    highlight = false,
    activityLabel,
    isQueued = false
  }: Props = $props()

  const content = $derived(
    message.contentShort ??
      (message.contentRef ? 'Content stored in attachments.' : '')
  )

  const contentHtml = $derived(renderMarkdown(content))

  const isStreaming = $derived(message.status === 'streaming')
</script>

<div class={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
  <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
    <span>{authorLabel}</span>
    {#if isQueued}
      <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide">
        Queued
      </span>
    {/if}
  </div>
  <div
    class={cn(
      'max-w-2xl rounded-2xl border px-4 py-3 text-sm leading-relaxed',
      isOwn && 'border-foreground bg-foreground text-background',
      !isOwn && highlight && 'border-accent/40 bg-accent/10 text-foreground',
      !isOwn && !highlight && 'border-border bg-card text-foreground'
    )}
  >
    {#if isStreaming && !content}
      <span class="text-xs text-muted-foreground">
        {activityLabel || 'Thinking...'}
      </span>
    {:else}
      {#if content}
        <div
          class={cn(
            'markdown-content prose prose-sm max-w-none',
            isOwn && 'prose-invert'
          )}
        >
          {@html contentHtml}
        </div>
      {:else}
        No message content yet.
      {/if}
    {/if}
  </div>
</div>
