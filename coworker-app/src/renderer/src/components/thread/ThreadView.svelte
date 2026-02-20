<script lang="ts">
  import PanelRightOpenIcon from '@lucide/svelte/icons/panel-right-open'
  import PanelRightCloseIcon from '@lucide/svelte/icons/panel-right-close'
  import { Button } from '$lib/components/ui/button'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import type {
    ChatChunkPayload,
    ChatCompletePayload,
    ChatErrorPayload,
    ChatMessageCreatedPayload,
    ChatQueuePayload,
    ChatStatusPayload,
    Coworker,
    Message,
    Thread
  } from '$lib/types'
  import { parseInterviewData } from '$lib/types'
  import MessageList from '../message/MessageList.svelte'
  import MessageInput from '../message/MessageInput.svelte'
  import ThreadSourcesPanel from './ThreadSourcesPanel.svelte'
  import ThreadActivityIndicator from './ThreadActivityIndicator.svelte'
  import NotificationPermissionBanner from '../notifications/NotificationPermissionBanner.svelte'

  interface Props {
    thread: Thread
    coworkers: Coworker[]
    channelCoworkers: Coworker[]
    onCreateCoworker: (channelId?: string) => void
    onRenameThread?: (thread: Thread) => void
    notificationSupported?: boolean
    notificationPermission?: NotificationPermission
    onRequestNotificationPermission?: () => void
    onMarkThreadRead?: (threadId: string, readAt?: Date) => void
    isAppFocused?: boolean
  }

  let {
    thread,
    coworkers,
    channelCoworkers,
    onCreateCoworker,
    onRenameThread,
    notificationSupported = false,
    notificationPermission = 'default',
    onRequestNotificationPermission,
    onMarkThreadRead,
    isAppFocused = false
  }: Props = $props()

  let messages = $state<Message[]>([])
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  let isSourcesOpen = $state(false)
  let streamingMessageIds = $state<string[]>([])
  let threadActivityLabel = $state<string | null>(null)
  let activityByMessageId = $state<Record<string, string>>({})
  let lastMarkedAt = $state<number | null>(null)
  let queuedMessageIds = $state<string[]>([])
  let retryingMessageIds = $state<string[]>([])
  let replyTargetMessageId = $state<string | null>(null)

  function addStreamingMessage(id: string): void {
    if (!streamingMessageIds.includes(id)) {
      streamingMessageIds = [...streamingMessageIds, id]
    }
  }

  function removeStreamingMessage(id: string): void {
    streamingMessageIds = streamingMessageIds.filter((item) => item !== id)
  }

  function setActivity(messageId: string, label: string): void {
    activityByMessageId = { ...activityByMessageId, [messageId]: label }
  }

  function clearActivity(messageId: string): void {
    const next = { ...activityByMessageId }
    delete next[messageId]
    activityByMessageId = next
  }

  function addRetryingMessage(id: string): void {
    if (!retryingMessageIds.includes(id)) {
      retryingMessageIds = [...retryingMessageIds, id]
    }
  }

  function removeRetryingMessage(id: string): void {
    retryingMessageIds = retryingMessageIds.filter((item) => item !== id)
  }

  function getChatErrorMessage(payload: ChatErrorPayload): string {
    if (payload.code === 'stream_incomplete') {
      return 'Co-workers stopped before finishing. We saved what we could. Retry to continue.'
    }
    if (payload.code === 'stream_timeout') {
      return 'Co-workers stopped responding. Retry to continue.'
    }
    if (payload.code === 'stream_aborted') {
      return 'Message canceled.'
    }
    return payload.error
  }

  $effect(() => {
    void loadMessages()
  })

  $effect(() => {
    if (thread?.id) {
      lastMarkedAt = null
    }
  })

  $effect(() => {
    const cleanupCreated = window.api.chat.onMessageCreated(
      (payload: ChatMessageCreatedPayload) => {
        if (payload.threadId !== thread?.id) return
        if (!messages.find((message) => message.id === payload.message.id)) {
          messages = [...messages, payload.message]
        }
        if (payload.message.status === 'streaming') {
          addStreamingMessage(payload.message.id)
        }
      }
    )

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
            ? {
                ...message,
                contentShort: payload.content,
                status: payload.status ?? 'complete'
              }
            : message
        )
        removeStreamingMessage(payload.messageId)
        clearActivity(payload.messageId)
      }
    )

    const cleanupError = window.api.chat.onError((payload: ChatErrorPayload) => {
      messages = messages.map((message) =>
        message.id === payload.messageId
          ? { ...message, status: 'error' }
          : message
      )
      removeStreamingMessage(payload.messageId)
      clearActivity(payload.messageId)
      error = getChatErrorMessage(payload)
    })

    const cleanupStatus = window.api.chat.onStatus(
      (payload: ChatStatusPayload) => {
        if (payload.threadId !== thread?.id) return
        if (payload.phase === 'done' || payload.phase === 'error') {
          threadActivityLabel = null
          return
        }
        if (!payload.label) return
        if (payload.messageId) {
          setActivity(payload.messageId, payload.label)
          return
        }
        threadActivityLabel = payload.label
      }
    )

    const cleanupQueue = window.api.chat.onQueueUpdate(
      (payload: ChatQueuePayload) => {
        if (payload.threadId !== thread?.id) return
        if (payload.state === 'queued') {
          if (!queuedMessageIds.includes(payload.messageId)) {
            queuedMessageIds = [...queuedMessageIds, payload.messageId]
          }
          return
        }
        queuedMessageIds = queuedMessageIds.filter((id) => id !== payload.messageId)
      }
    )

    return () => {
      cleanupCreated()
      cleanupChunk()
      cleanupComplete()
      cleanupError()
      cleanupStatus()
      cleanupQueue()
    }
  })

  async function loadMessages(): Promise<void> {
    if (!thread?.id) return
    isLoading = true
    error = null
    messages = []
    streamingMessageIds = []
    threadActivityLabel = null
    activityByMessageId = {}
    queuedMessageIds = []
    replyTargetMessageId = null
    try {
      messages = await window.api.message.list(thread.id)
    } catch (err) {
      console.error('Failed to load messages:', err)
      error = 'Unable to load this conversation.'
    } finally {
      isLoading = false
    }
  }

  $effect(() => {
    if (!thread?.id || !onMarkThreadRead || !isAppFocused) return
    const latestTimestamp =
      messages.length > 0
        ? new Date(messages[messages.length - 1]?.createdAt ?? Date.now()).getTime()
        : Date.now()
    if (lastMarkedAt === null || latestTimestamp > lastMarkedAt) {
      onMarkThreadRead(thread.id, new Date(latestTimestamp))
      lastMarkedAt = latestTimestamp
    }
  })

  const hasUnansweredInterview = $derived(
    messages.some((m) => {
      const data = parseInterviewData(m.contentShort)
      return data !== null && data.answers === null
    })
  )

  const activeCoworkerCount = $derived(
    (() => {
      const coworkerIds = new Set<string>()
      for (const message of messages) {
        if (message.authorType !== 'coworker' || !message.authorId) continue
        if (message.status === 'streaming' || streamingMessageIds.includes(message.id)) {
          coworkerIds.add(message.authorId)
        }
      }
      return coworkerIds.size
    })()
  )

  const isCoworkerWorking = $derived(
    streamingMessageIds.length > 0 || Boolean(threadActivityLabel)
  )

  const activityLabel = $derived(
    (() => {
      if (threadActivityLabel) return threadActivityLabel
      if (activeCoworkerCount === 1) return '1 co-worker at work'
      if (activeCoworkerCount > 1) {
        return `${activeCoworkerCount} co-workers at work`
      }
      return 'Co-workers at work'
    })()
  )

  const latestFailedUserMessageId = $derived(
    (() => {
      const failedUserMessages = messages.filter(
        (message) => message.authorType === 'user' && message.status === 'error'
      )
      if (failedUserMessages.length === 0) return null
      return failedUserMessages
        .sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime()
          const bTime = new Date(b.createdAt).getTime()
          return bTime - aTime
        })[0]
        ?.id ?? null
    })()
  )

  function handleInterviewAnswered(messageId: string, updatedContentShort: string): void {
    messages = messages.map((m) =>
      m.id === messageId ? { ...m, contentShort: updatedContentShort } : m
    )
  }

  function handleDocumentRenamed(messageId: string, updatedContentShort: string): void {
    messages = messages.map((m) =>
      m.id === messageId ? { ...m, contentShort: updatedContentShort } : m
    )
  }

  function handleRequestReply(messageId: string): void {
    const target = messages.find((message) => message.id === messageId)
    if (!target) return
    if (target.authorType !== 'user' && target.authorType !== 'coworker') return
    replyTargetMessageId = messageId
  }

  function handleCancelReply(): void {
    replyTargetMessageId = null
  }

  const replyTarget = $derived(
    replyTargetMessageId
      ? messages.find((message) => message.id === replyTargetMessageId) ?? null
      : null
  )

  const replyTargetAuthorLabel = $derived(
    replyTarget
      ? replyTarget.authorType === 'user'
        ? 'You'
        : replyTarget.authorType === 'coworker'
          ? coworkers.find((item) => item.id === replyTarget.authorId)?.name ?? 'Co-worker'
          : 'System'
      : ''
  )

  const replyTargetPreview = $derived(
    (() => {
      if (!replyTarget?.contentShort) return 'No message content'
      const trimmed = replyTarget.contentShort.trim()
      if (!trimmed) return 'No message content'
      return trimmed.length > 200 ? `${trimmed.slice(0, 200).trim()}…` : trimmed
    })()
  )

  $effect(() => {
    if (!replyTargetMessageId) return
    if (!messages.some((message) => message.id === replyTargetMessageId)) {
      replyTargetMessageId = null
    }
  })

  $effect(() => {
    if (!replyTargetMessageId) return

    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        replyTargetMessageId = null
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  })

  async function handleSend(input: { content: string; replyToMessageId?: string }): Promise<void> {
    try {
      const result = await window.api.chat.sendMessage(thread.id, input.content, {
        replyToMessageId: input.replyToMessageId
      })
      messages = [...messages, result.userMessage]
      replyTargetMessageId = null
    } catch (err) {
      console.error('Failed to send message:', err)
      error = err instanceof Error ? err.message : 'Something went wrong while sending. Please try again.'
    }
  }

  async function handleRetryMessage(messageId: string): Promise<void> {
    if (retryingMessageIds.includes(messageId)) return

    addRetryingMessage(messageId)
    messages = messages.map((message) =>
      message.id === messageId ? { ...message, status: 'complete' } : message
    )

    try {
      await window.api.chat.retryMessage(thread.id, messageId)
      error = null
    } catch (err) {
      messages = messages.map((message) =>
        message.id === messageId ? { ...message, status: 'error' } : message
      )
      error =
        err instanceof Error
          ? err.message
          : 'Something went wrong while retrying. Please try again.'
    } finally {
      removeRetryingMessage(messageId)
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
        {#if isCoworkerWorking}
          <div class="mt-2">
            <ThreadActivityIndicator label={activityLabel} />
          </div>
        {/if}
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
          <Button size="sm" onclick={() => onCreateCoworker(thread.channelId)} class="gap-2">
            Add a Co-worker
          </Button>
        {/if}
      </div>
    </div>

    {#if error}
      <div class="border-b border-border bg-muted px-6 py-3 text-sm text-muted-foreground">
        <div class="flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={
              !latestFailedUserMessageId ||
              retryingMessageIds.includes(latestFailedUserMessageId)
            }
            onclick={() => {
              if (!latestFailedUserMessageId) return
              void handleRetryMessage(latestFailedUserMessageId)
            }}
          >
            {#if latestFailedUserMessageId && retryingMessageIds.includes(latestFailedUserMessageId)}
              Retrying...
            {:else}
              Retry
            {/if}
          </Button>
        </div>
      </div>
    {/if}

    {#if notificationSupported && notificationPermission !== 'granted'}
      <div class="px-6 pt-4">
        <NotificationPermissionBanner
          supported={notificationSupported}
          permission={notificationPermission}
          onRequestPermission={() => onRequestNotificationPermission?.()}
        />
      </div>
    {/if}

    <MessageList
      {messages}
      {coworkers}
      channelCoworkers={channelCoworkers}
      channelId={thread.channelId}
      {replyTargetMessageId}
      {activityByMessageId}
      {queuedMessageIds}
      {retryingMessageIds}
      scrollKey={thread?.id ?? null}
      isLoading={isLoading}
      onRequestReply={handleRequestReply}
      onCancelReply={handleCancelReply}
      onInterviewAnswered={handleInterviewAnswered}
      onDocumentRenamed={handleDocumentRenamed}
      onRetryMessage={handleRetryMessage}
    />
    <MessageInput
      onSend={handleSend}
      coworkers={channelCoworkers}
      channelId={thread.channelId}
      threadId={thread.id}
      replyTarget={replyTarget
        ? {
            messageId: replyTarget.id,
            authorLabel: replyTargetAuthorLabel,
            contentPreview: replyTargetPreview
          }
        : null}
      onClearReply={handleCancelReply}
      disabled={channelCoworkers.length === 0 || hasUnansweredInterview}
      showActivity={isCoworkerWorking}
    />
  </div>

  <ThreadSourcesPanel
    open={isSourcesOpen}
    onClose={() => (isSourcesOpen = false)}
    {thread}
  />
</div>
