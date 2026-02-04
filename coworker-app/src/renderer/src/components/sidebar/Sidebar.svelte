<script lang="ts">
  import HashIcon from '@lucide/svelte/icons/hash'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import UserIcon from '@lucide/svelte/icons/user'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import type { Channel, Coworker } from '$lib/types'

  interface Props {
    workspaceName: string
    channels: Channel[]
    coworkers: Coworker[]
    selectedChannelId: string | null
    selectedCoworkerId: string | null
    isWorkspaceSettingsActive?: boolean
    isWorkersSettingsActive?: boolean
    onSelectChannel: (channel: Channel) => void
    onSelectCoworker: (coworker: Coworker) => void
    onCreateChannel: () => void
    onCreateCoworker: () => void
    onOpenSettings: () => void
    onOpenWorkersSettings?: () => void
  }

  let {
    workspaceName,
    channels,
    coworkers,
    selectedChannelId,
    selectedCoworkerId,
    isWorkspaceSettingsActive = false,
    isWorkersSettingsActive = false,
    onSelectChannel,
    onSelectCoworker,
    onCreateChannel,
    onCreateCoworker,
    onOpenSettings,
    onOpenWorkersSettings
  }: Props = $props()

  let channelsExpanded = $state(true)
  let coworkersExpanded = $state(true)
</script>

<aside class="flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-card/50">
  <!-- Workspace Header -->
  <div class="flex h-14 items-center border-b border-border px-4">
    <div class="flex w-full items-center justify-between">
      <button
        class="flex flex-1 items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
      >
        <span class="truncate font-serif text-sm font-medium text-foreground">
          {workspaceName}
        </span>
        <ChevronDownIcon class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>
      <button
        onclick={onOpenSettings}
        class="ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        class:bg-accent={isWorkspaceSettingsActive}
        class:text-accent-foreground={isWorkspaceSettingsActive}
        title="Workspace settings"
      >
        <SettingsIcon class="h-4 w-4" />
      </button>
    </div>
  </div>

  <!-- Scrollable Content -->
  <div class="flex-1 overflow-y-auto py-2">
    <!-- Channels Section -->
    <div class="px-2">
    <button
      onclick={() => (channelsExpanded = !channelsExpanded)}
        class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Channels</span>
        <ChevronDownIcon
          class="h-3.5 w-3.5 transition-transform {!channelsExpanded ? 'rotate-180' : ''}"
        />
      </button>

      {#if channelsExpanded}
        <div class="mt-1 space-y-0.5">
          {#each channels as channel (channel.id)}
            <button
              onclick={() => onSelectChannel(channel)}
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
              class:bg-accent={selectedChannelId === channel.id}
              class:text-accent-foreground={selectedChannelId === channel.id}
              class:text-foreground={selectedChannelId !== channel.id}
              class:hover:bg-muted={selectedChannelId !== channel.id}
            >
              <HashIcon class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span class="truncate">{channel.name}</span>
            </button>
          {:else}
            <p class="px-2 py-2 text-xs text-muted-foreground">No channels yet</p>
          {/each}
          <button
            onclick={onCreateChannel}
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PlusIcon class="h-4 w-4 flex-shrink-0" />
            <span>New Channel</span>
          </button>
        </div>
      {/if}
    </div>

    <!-- Divider -->
    <div class="my-3 mx-4 border-t border-border" />

    <!-- Co-workers Section -->
    <div class="px-2">
      <button
        onclick={() => (coworkersExpanded = !coworkersExpanded)}
        class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Co-workers</span>
        <ChevronDownIcon
          class="h-3.5 w-3.5 transition-transform {!coworkersExpanded ? 'rotate-180' : ''}"
        />
      </button>

      {#if coworkersExpanded}
        <div class="mt-1 space-y-0.5">
          {#each coworkers as coworker (coworker.id)}
            <button
              onclick={() => onSelectCoworker(coworker)}
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
              class:bg-accent={selectedCoworkerId === coworker.id}
              class:text-accent-foreground={selectedCoworkerId === coworker.id}
              class:text-foreground={selectedCoworkerId !== coworker.id}
              class:hover:bg-muted={selectedCoworkerId !== coworker.id}
            >
              <div class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                <UserIcon class="h-3 w-3 text-muted-foreground" />
              </div>
              <span class="truncate">{coworker.name}</span>
            </button>
          {:else}
            <p class="px-2 py-2 text-xs text-muted-foreground">No co-workers yet</p>
          {/each}
          <button
            onclick={onCreateCoworker}
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PlusIcon class="h-4 w-4 flex-shrink-0" />
            <span>Add Co-worker</span>
          </button>
          {#if onOpenWorkersSettings}
            <button
              onclick={onOpenWorkersSettings}
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              class:bg-accent={isWorkersSettingsActive}
              class:text-accent-foreground={isWorkersSettingsActive}
              class:hover:bg-muted={!isWorkersSettingsActive}
              class:hover:text-foreground={!isWorkersSettingsActive}
              title="Co-workers settings"
            >
              <SettingsIcon class="h-4 w-4 flex-shrink-0" />
              <span class="truncate">Co-workers settings</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</aside>
