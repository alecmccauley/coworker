<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import MessageSquareIcon from '@lucide/svelte/icons/message-square'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import { Button } from '$lib/components/ui/button'
  import type { Channel, Thread, Coworker } from '$lib/types'
  import ThreadView from '../thread/ThreadView.svelte'
  import ChannelSettingsPanel from './ChannelSettingsPanel.svelte'

  interface Props {
    channel: Channel
    coworkers: Coworker[]
    onCreateCoworker: () => void
  }

  let { channel, coworkers, onCreateCoworker }: Props = $props()

  let threads = $state<Thread[]>([])
  let isLoading = $state(false)
  let selectedThread = $state<Thread | null>(null)
  let isSettingsPanelOpen = $state(false)

  $effect(() => {
    // Reload threads when channel changes
    if (channel) {
      selectedThread = null
      loadThreads()
    }
  })

  async function loadThreads(): Promise<void> {
    isLoading = true
    try {
      threads = await window.api.thread.list(channel.id)
    } catch (error) {
      console.error('Failed to load threads:', error)
    } finally {
      isLoading = false
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
    } catch (error) {
      console.error('Failed to create thread:', error)
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
      <Button onclick={handleCreateThread} class="gap-2">
        <PlusIcon class="h-4 w-4" />
        New Thread
      </Button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex flex-1 overflow-hidden">
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
          <Button onclick={handleCreateThread} class="mt-4 gap-2" size="sm">
            <PlusIcon class="h-4 w-4" />
            Start Conversation
          </Button>
        </div>
      {:else}
        <div class="p-2">
          {#each threads as thread (thread.id)}
            <button
              onclick={() => (selectedThread = thread)}
              class="flex w-full flex-col gap-1 rounded-lg p-3 text-left transition-colors"
              class:bg-accent={selectedThread?.id === thread.id}
              class:hover:bg-muted={selectedThread?.id !== thread.id}
            >
              <span class="font-medium text-foreground">
                {thread.title || 'Untitled conversation'}
              </span>
              <span class="text-xs text-muted-foreground">
                {formatRelativeTime(thread.updatedAt)}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Conversation View -->
    <div class="flex flex-1 flex-col">
      {#if selectedThread}
        <ThreadView
          thread={selectedThread}
          {coworkers}
          {onCreateCoworker}
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

    <!-- Channel Settings Panel -->
    <ChannelSettingsPanel
      open={isSettingsPanelOpen}
      onClose={() => (isSettingsPanelOpen = false)}
      {channel}
    />
  </div>
</div>
