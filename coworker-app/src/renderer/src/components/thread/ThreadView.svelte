<script lang="ts">
  import PanelRightOpenIcon from '@lucide/svelte/icons/panel-right-open'
  import PanelRightCloseIcon from '@lucide/svelte/icons/panel-right-close'
  import { Button } from '$lib/components/ui/button'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import type {
    ChatChunkPayload,
    ChatCompletePayload,
    ChatErrorPayload,
    ChatStatusPayload,
    Coworker,
    Message,
    Thread
  } from '$lib/types'
  import MessageList from '../message/MessageList.svelte'
  import MessageInput from '../message/MessageInput.svelte'
  import ThreadSourcesPanel from './ThreadSourcesPanel.svelte'

  interface Props {
    thread: Thread
    coworkers: Coworker[]
    onCreateCoworker: () => void
    onRenameThread?: (thread: Thread) => void
  }

  let { thread, coworkers, onCreateCoworker, onRenameThread }: Props = $props()

  let messages = $state<Message[]>([])
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  let isSourcesOpen = $state(false)
  let streamingMessageId = $state<string | null>(null)
  let activityByMessageId = $state<Record<string, string>>({})

  function setActivity(messageId: string, label: string): void {
    activityByMessageId = { ...activityByMessageId, [messageId]: label }
  }

  function clearActivity(messageId: string): void {
    const next = { ...activityByMessageId }
    delete next[messageId]
    activityByMessageId = next
  }

  $effect(() => {
    void loadMessages()
  })

  $effect(() => {
    const cleanupChunk = window.api.chat.onChunk((payload: ChatChunkPayload) => {
      messages = messages.map((message) =>
        message.id === payload.messageId
          ? { ...message, contentShort: payload.fullContent, status: 'streaming' }
          : message
      )
    })

    const cleanupComplete = window.api.chat.onComplete(
      (payload: ChatCompletePayload) => {
        messages = messages.map((message) =>
          message.id === payload.messageId
            ? { ...message, contentShort: payload.content, status: 'complete' }
            : message
        )
        clearActivity(payload.messageId)
        if (streamingMessageId === payload.messageId) {
          streamingMessageId = null
        }
      }
    )

    const cleanupError = window.api.chat.onError((payload: ChatErrorPayload) => {
      messages = messages.map((message) =>
        message.id === payload.messageId
          ? { ...message, status: 'error' }
          : message
      )
      clearActivity(payload.messageId)
      if (streamingMessageId === payload.messageId) {
        streamingMessageId = null
      }
      error = payload.error
    })

    const cleanupStatus = window.api.chat.onStatus(
      (payload: ChatStatusPayload) => {
        if (payload.phase === 'done' || payload.phase === 'error') {
          clearActivity(payload.messageId)
          return
        }
        if (payload.label) {
          setActivity(payload.messageId, payload.label)
        }
      }
    )

    return () => {
      cleanupChunk()
      cleanupComplete()
      cleanupError()
      cleanupStatus()
    }
  })

  async function loadMessages(): Promise<void> {
    if (!thread?.id) return
    isLoading = true
    error = null
    messages = []
    activityByMessageId = {}
    try {
      messages = await window.api.message.list(thread.id)
    } catch (err) {
      console.error('Failed to load messages:', err)
      error = 'Unable to load this conversation.'
    } finally {
      isLoading = false
    }
  }

  async function handleSend(input: { content: string }): Promise<void> {
    try {
      const result = await window.api.chat.sendMessage(thread.id, input.content)
      messages = [...messages, result.userMessage, result.assistantMessage]
      streamingMessageId = result.assistantMessage.id
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
          onclick={() => onRenameThread?.(thread)}
        >
          <PencilIcon class="h-4 w-4" />
          Rename
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-2"
          onclick={() => (isSourcesOpen = !isSourcesOpen)}
        >
          {#if isSourcesOpen}
            <PanelRightCloseIcon class="h-4 w-4" />
            Hide sources
          {:else}
            <PanelRightOpenIcon class="h-4 w-4" />
            Show sources
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

    <MessageList
      {messages}
      {coworkers}
      {activityByMessageId}
      scrollKey={thread?.id ?? null}
      isLoading={isLoading}
    />
    <MessageInput onSend={handleSend} disabled={streamingMessageId !== null} />
  </div>

  <ThreadSourcesPanel
    open={isSourcesOpen}
    onClose={() => (isSourcesOpen = false)}
    {thread}
  />
</div>
