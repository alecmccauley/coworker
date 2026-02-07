<script lang="ts">
  import { tick } from 'svelte'
  import MessageBubble from './MessageBubble.svelte'
  import type { Coworker, Message } from '$lib/types'

  interface Props {
    messages: Message[]
    coworkers: Coworker[]
    activityByMessageId?: Record<string, string>
    isLoading?: boolean
    scrollKey?: string | null
  }

  let {
    messages,
    coworkers,
    activityByMessageId = {},
    isLoading = false,
    scrollKey = null
  }: Props = $props()

  const sortedMessages = $derived(
    [...messages].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      return aTime - bTime
    })
  )

  let scrollContainer: HTMLDivElement | null = $state(null)

  const scrollSignature = $derived(() => {
    const lastMessage = sortedMessages[sortedMessages.length - 1]
    const lastContent = lastMessage?.contentShort ?? ''
    const activity = lastMessage ? activityByMessageId[lastMessage.id] ?? '' : ''
    return `${scrollKey ?? 'none'}:${sortedMessages.length}:${lastMessage?.id ?? 'none'}:${lastContent.length}:${activity.length}:${isLoading}`
  })

  async function scrollToBottom(): Promise<void> {
    if (!scrollContainer) return
    await tick()
    requestAnimationFrame(() => {
      if (!scrollContainer) return
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    })
  }

  $effect(() => {
    scrollSignature()
    void scrollToBottom()
  })

  function getAuthorLabel(message: Message): string {
    if (message.authorType === 'coworker' && message.authorId) {
      const coworker = coworkers.find((item) => item.id === message.authorId)
      return coworker?.name ?? 'Co-worker'
    }
    if (message.authorType === 'system') {
      return 'System'
    }
    return 'You'
  }
</script>

<div bind:this={scrollContainer} class="flex-1 overflow-y-auto px-6 py-4">
  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <div class="text-sm text-muted-foreground">Loading conversation...</div>
    </div>
  {:else if sortedMessages.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-lg font-medium text-foreground">No messages yet</p>
      <p class="mt-2 text-sm text-muted-foreground">
        Start the conversation and your co-workers will be ready to help.
      </p>
    </div>
  {:else}
    <div class="flex flex-col gap-5">
      {#each sortedMessages as message (message.id)}
        <MessageBubble
          {message}
          authorLabel={getAuthorLabel(message)}
          isOwn={message.authorType === 'user'}
          highlight={message.authorType === 'coworker'}
          activityLabel={activityByMessageId[message.id]}
        />
      {/each}
    </div>
  {/if}
</div>
