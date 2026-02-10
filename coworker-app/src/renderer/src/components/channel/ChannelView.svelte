<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import MessageSquareIcon from '@lucide/svelte/icons/message-square'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Button } from '$lib/components/ui/button'
  import type { Channel, Thread, Coworker } from '$lib/types'
  import ThreadView from '../thread/ThreadView.svelte'
  import ChannelSettingsPanel from './ChannelSettingsPanel.svelte'
  import ThreadRenameDialog from '../thread/ThreadRenameDialog.svelte'
  import ChannelNoCoworkersState from './ChannelNoCoworkersState.svelte'

  interface Props {
    channel: Channel
    coworkers: Coworker[]
    onCreateCoworker: (channelId?: string) => void
    openSettingsPanel?: boolean
    selectedThreadId?: string | null
    onSelectThread?: (thread: Thread | null) => void
    notificationSupported?: boolean
    notificationPermission?: NotificationPermission
    onRequestNotificationPermission?: () => void
    onMarkThreadRead?: (threadId: string, readAt?: Date) => void
    isAppFocused?: boolean
    unreadByThread?: Record<string, number>
  }

  let {
    channel,
    coworkers,
    onCreateCoworker,
    openSettingsPanel = false,
    selectedThreadId = null,
    onSelectThread,
    notificationSupported = false,
    notificationPermission = 'default',
    onRequestNotificationPermission,
    onMarkThreadRead,
    isAppFocused = false,
    unreadByThread = {}
  }: Props = $props()

  let threads = $state<Thread[]>([])
  let isLoading = $state(false)
  let selectedThread = $state<Thread | null>(null)
  let isSettingsPanelOpen = $state(false)
  let channelCoworkers = $state<Coworker[]>([])
  let isLoadingCoworkers = $state(false)
  let isRenameOpen = $state(false)
  let renameTarget = $state<Thread | null>(null)
  let renameError = $state<string | null>(null)
  let isRenaming = $state(false)

  $effect(() => {
    // Reload threads when channel changes
    if (channel) {
      selectedThread = null
      loadThreads()
      loadChannelCoworkers()
    }
  })

  $effect(() => {
    if (channel && coworkers.length >= 0) {
      loadChannelCoworkers()
    }
  })

  $effect(() => {
    if (openSettingsPanel) {
      isSettingsPanelOpen = true
    }
  })

  $effect(() => {
    if (!selectedThreadId) {
      selectedThread = null
      return
    }
    const match = threads.find((thread) => thread.id === selectedThreadId) ?? null
    if (match) {
      selectedThread = match
    }
  })

  $effect(() => {
    const cleanup = window.api.thread.onUpdated((updated) => {
      threads = threads.map((thread) =>
        thread.id === updated.id ? updated : thread
      )
      if (selectedThread?.id === updated.id) {
        selectedThread = updated
      }
    })

    return () => {
      cleanup()
    }
  })

  async function loadThreads(): Promise<void> {
    isLoading = true
    try {
      threads = await window.api.thread.list(channel.id)
      if (selectedThreadId) {
        selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null
      }
    } catch (error) {
      console.error('Failed to load threads:', error)
    } finally {
      isLoading = false
    }
  }

  async function loadChannelCoworkers(): Promise<void> {
    isLoadingCoworkers = true
    try {
      channelCoworkers = await window.api.channel.listCoworkers(channel.id)
    } catch (error) {
      console.error('Failed to load channel coworkers:', error)
      channelCoworkers = []
    } finally {
      isLoadingCoworkers = false
    }
  }

  async function handleCreateThread(): Promise<void> {
    try {
      const thread = await window.api.thread.create({
        channelId: channel.id,
        title: 'New conversation'
      })
      await loadThreads()
      selectedThread = thread
      onSelectThread?.(thread)
    } catch (error) {
      console.error('Failed to create thread:', error)
    }
  }

  function openRename(thread: Thread): void {
    renameTarget = thread
    renameError = null
    isRenameOpen = true
  }

  function closeRename(): void {
    isRenameOpen = false
    renameTarget = null
    renameError = null
    isRenaming = false
  }

  async function handleRenameSave(title: string): Promise<void> {
    if (!renameTarget) return
    isRenaming = true
    renameError = null
    try {
      const updated = await window.api.thread.update(renameTarget.id, { title })
      threads = threads.map((thread) => (thread.id === updated.id ? updated : thread))
      if (selectedThread?.id === updated.id) {
        selectedThread = updated
      }
      closeRename()
    } catch (error) {
      console.error('Failed to rename thread:', error)
      renameError = 'Unable to rename this conversation.'
      isRenaming = false
    }
  }

  function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }
</script>

<div class="flex h-full flex-1 flex-col">
  <!-- Channel Header -->
  <div class="flex items-center justify-between border-b border-border px-6 py-4">
    <div>
      <h2 class="font-serif text-xl font-medium text-foreground"># {channel.name}</h2>
      {#if channel.purpose}
        <p class="text-sm text-muted-foreground">{channel.purpose}</p>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        class="gap-2"
        onclick={() => (isSettingsPanelOpen = !isSettingsPanelOpen)}
      >
        <SettingsIcon class="h-4 w-4" />
        {isSettingsPanelOpen ? 'Hide settings' : 'Settings'}
      </Button>
      <Button
        onclick={handleCreateThread}
        class="gap-2"
        disabled={!isLoadingCoworkers && channelCoworkers.length === 0}
      >
        <PlusIcon class="h-4 w-4" />
        New Thread
      </Button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex flex-1 overflow-hidden">
    {#if !isLoadingCoworkers && channelCoworkers.length === 0 && threads.length === 0}
      <div class="flex flex-1 items-center justify-center p-8">
        <ChannelNoCoworkersState
          {channel}
          {coworkers}
          onCreateCoworker={onCreateCoworker}
          onAssignmentsUpdated={loadChannelCoworkers}
          variant="full"
        />
      </div>
    {:else}
    <!-- Thread List -->
    <div class="w-80 flex-shrink-0 overflow-y-auto border-r border-border">
      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <Loader2Icon class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      {:else if threads.length === 0}
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MessageSquareIcon class="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 class="font-medium text-foreground">No conversations yet</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            Start a new thread to begin collaborating
          </p>
          <Button
            onclick={handleCreateThread}
            class="mt-4 gap-2"
            size="sm"
            disabled={!isLoadingCoworkers && channelCoworkers.length === 0}
          >
            <PlusIcon class="h-4 w-4" />
            Start Conversation
          </Button>
        </div>
      {:else}
        <div class="p-2">
          {#each threads as thread (thread.id)}
            <div
              class="group flex items-start justify-between gap-2 rounded-lg p-3 transition-colors"
              class:bg-accent={selectedThread?.id === thread.id}
              class:hover:bg-muted={selectedThread?.id !== thread.id}
            >
              <button
                onclick={() => {
                  selectedThread = thread
                  onSelectThread?.(thread)
                }}
                class="flex min-w-0 flex-1 flex-col gap-1 text-left"
              >
                <div class="flex min-w-0 items-center justify-between gap-2">
                  <span class="min-w-0 truncate font-medium text-foreground">
                    {thread.title || 'Untitled conversation'}
                  </span>
                  {#if unreadByThread[thread.id] && unreadByThread[thread.id] > 0}
                    <span class="shrink-0 inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {unreadByThread[thread.id] > 99 ? '99+' : unreadByThread[thread.id]}
                    </span>
                  {/if}
                </div>
                <span class="text-xs text-muted-foreground">
                  {formatRelativeTime(thread.updatedAt)}
                </span>
              </button>
              <div
                class="opacity-0 transition-opacity group-hover:opacity-100"
                onclick={(event) => event.stopPropagation()}
              >
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        {...props}
                      >
                        <MoreHorizontalIcon class="h-4 w-4" />
                      </Button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item onclick={() => openRename(thread)}>
                      <PencilIcon class="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Conversation View -->
    <div class="flex flex-1 flex-col">
      {#if !isLoadingCoworkers && channelCoworkers.length === 0 && threads.length > 0}
        <ChannelNoCoworkersState
          {channel}
          {coworkers}
          onCreateCoworker={onCreateCoworker}
          onAssignmentsUpdated={loadChannelCoworkers}
          variant="banner"
        />
      {/if}
      {#if selectedThread}
        <ThreadView
          thread={selectedThread}
          {coworkers}
          channelCoworkers={channelCoworkers}
          onCreateCoworker={() => onCreateCoworker(channel.id)}
          onRenameThread={openRename}
          {notificationSupported}
          {notificationPermission}
          onRequestNotificationPermission={onRequestNotificationPermission}
          onMarkThreadRead={onMarkThreadRead}
          {isAppFocused}
        />
      {:else}
        <div class="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div class="max-w-md">
            <MessageSquareIcon class="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 class="mt-4 font-medium text-foreground">Select a conversation</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Choose an existing thread or start a new one
            </p>
          </div>
        </div>
      {/if}
    </div>
    {/if}

    <!-- Channel Settings Panel -->
  <ChannelSettingsPanel
    open={isSettingsPanelOpen}
    onClose={() => (isSettingsPanelOpen = false)}
    {channel}
    onCoworkersUpdated={loadChannelCoworkers}
  />

  <ThreadRenameDialog
    bind:open={isRenameOpen}
    thread={renameTarget}
    onClose={closeRename}
    onSave={handleRenameSave}
    isSaving={isRenaming}
    error={renameError}
  />
</div>
</div>
