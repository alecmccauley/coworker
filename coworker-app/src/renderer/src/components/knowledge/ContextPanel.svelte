<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import XIcon from '@lucide/svelte/icons/x'
  import WorkspaceNotes from './WorkspaceNotes.svelte'
  import type { Channel, Thread } from '$lib/types'

  interface Props {
    open: boolean
    onClose: () => void
    channel?: Channel | null
    thread?: Thread | null
  }

  let { open = $bindable(), onClose, channel, thread }: Props = $props()
</script>

{#if open}
  <aside class="flex h-full w-80 flex-shrink-0 flex-col border-l border-border bg-card/50">
    <!-- Header -->
    <div class="flex h-14 items-center justify-between border-b border-border px-4">
      <h2 class="font-medium text-foreground">Context</h2>
      <button
        onclick={onClose}
        class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <XIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- Workspace Notes -->
      <WorkspaceNotes />

      <!-- Channel Context (if selected) -->
      {#if channel}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
            <h3 class="font-medium text-foreground">Channel: {channel.name}</h3>
          </div>
          {#if channel.purpose}
            <p class="text-sm text-muted-foreground">{channel.purpose}</p>
          {:else}
            <p class="text-sm text-muted-foreground/50">No channel purpose set</p>
          {/if}
        </div>
      {/if}

      <!-- Thread Context (if selected) -->
      {#if thread}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
            <h3 class="font-medium text-foreground">Thread</h3>
          </div>
          <p class="text-sm text-muted-foreground">
            {thread.title || 'Untitled conversation'}
          </p>
        </div>
      {/if}

      <!-- Attached Sources (placeholder) -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
          <h3 class="font-medium text-foreground">Attached Sources</h3>
        </div>
        <p class="text-sm text-muted-foreground">
          Sources attached to this context will appear here.
        </p>
      </div>
    </div>
  </aside>
{/if}
