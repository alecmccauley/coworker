<script lang="ts">
  import PanelRightOpenIcon from '@lucide/svelte/icons/panel-right-open'
  import PanelRightCloseIcon from '@lucide/svelte/icons/panel-right-close'
  import { Button } from '$lib/components/ui/button'
  import type { Channel, Coworker, Message, Thread } from '$lib/types'
  import MessageList from '../message/MessageList.svelte'
  import MessageInput from '../message/MessageInput.svelte'
  import ContextPanel from '../knowledge/ContextPanel.svelte'

  interface Props {
    thread: Thread
    channel: Channel
    coworkers: Coworker[]
    onCreateCoworker: () => void
  }

  let { thread, channel, coworkers, onCreateCoworker }: Props = $props()

  let messages = $state<Message[]>([])
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  let isContextOpen = $state(true)

  $effect(() => {
    void loadMessages()
  })

  async function loadMessages(): Promise<void> {
    if (!thread?.id) return
    isLoading = true
    error = null
    messages = []
    try {
      messages = await window.api.message.list(thread.id)
    } catch (err) {
      console.error('Failed to load messages:', err)
      error = 'Unable to load this conversation.'
    } finally {
      isLoading = false
    }
  }

  async function handleSend(input: {
    content: string
    authorType: 'user' | 'coworker' | 'system'
    authorId?: string
  }): Promise<void> {
    try {
      const message = await window.api.message.create({
        threadId: thread.id,
        authorType: input.authorType,
        authorId: input.authorId,
        contentShort: input.content,
        status: 'complete'
      })
      messages = [...messages, message]
    } catch (err) {
      console.error('Failed to send message:', err)
      error = 'Something went wrong while sending. Please try again.'
    }
  }
</script>

<div class="flex min-h-0 flex-1">
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex items-center justify-between border-b border-border px-6 py-4">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Conversation
        </p>
        <h3 class="font-serif text-xl font-medium text-foreground">
          {thread.title || 'Untitled conversation'}
        </h3>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-2"
          onclick={() => (isContextOpen = !isContextOpen)}
        >
          {#if isContextOpen}
            <PanelRightCloseIcon class="h-4 w-4" />
            Hide context
          {:else}
            <PanelRightOpenIcon class="h-4 w-4" />
            Show context
          {/if}
        </Button>
        {#if coworkers.length === 0}
          <Button size="sm" onclick={onCreateCoworker} class="gap-2">
            Add a Co-worker
          </Button>
        {/if}
      </div>
    </div>

    {#if error}
      <div class="border-b border-border bg-muted px-6 py-3 text-sm text-muted-foreground">
        {error}
      </div>
    {/if}

    <MessageList {messages} {coworkers} isLoading={isLoading} />
    <MessageInput {coworkers} onSend={handleSend} disabled={coworkers.length === 0} />
  </div>

  <ContextPanel
    open={isContextOpen}
    onClose={() => (isContextOpen = false)}
    {channel}
    {thread}
  />
</div>
