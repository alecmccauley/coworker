<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x'
  import HashIcon from '@lucide/svelte/icons/hash'
  import ScopedNotes from '../knowledge/ScopedNotes.svelte'
  import ScopedSources from '../knowledge/ScopedSources.svelte'
  import ChannelCoworkers from './ChannelCoworkers.svelte'
  import type { Channel } from '$lib/types'

  interface Props {
    open: boolean
    onClose: () => void
    channel: Channel
    onCoworkersUpdated?: () => void
  }

  let { open = $bindable(), onClose, channel, onCoworkersUpdated }: Props = $props()
</script>

{#if open}
  <aside class="flex h-full w-80 flex-shrink-0 flex-col border-l border-border bg-card/50">
    <!-- Header -->
    <div class="flex h-14 items-center justify-between border-b border-border px-4">
      <h2 class="font-medium text-foreground">Channel Settings</h2>
      <button
        onclick={onClose}
        class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <XIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 space-y-6 overflow-y-auto p-4">
      <!-- Channel Info -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <HashIcon class="h-4 w-4 text-muted-foreground" />
          <h3 class="font-medium text-foreground">{channel.name}</h3>
        </div>
        {#if channel.purpose}
          <p class="text-sm text-muted-foreground">{channel.purpose}</p>
        {:else}
          <p class="text-sm text-muted-foreground/50">No purpose set</p>
        {/if}
      </div>

      <!-- Channel Co-workers -->
      <ChannelCoworkers
        channelId={channel.id}
        onAssignmentsUpdated={onCoworkersUpdated}
      />

      <!-- Channel Knowledge -->
      <ScopedNotes
        scopeType="channel"
        scopeId={channel.id}
        title="Project Knowledge"
        description="Context specific to this channel"
      />

      <!-- Channel Sources -->
      <ScopedSources
        scopeType="channel"
        scopeId={channel.id}
        title="Project Sources"
        description="Docs and references for this project"
      />
    </div>
  </aside>
{/if}
