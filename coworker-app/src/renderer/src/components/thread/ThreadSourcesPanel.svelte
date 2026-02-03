<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x'
  import ScopedSources from '../knowledge/ScopedSources.svelte'
  import type { Thread } from '$lib/types'

  interface Props {
    open: boolean
    onClose: () => void
    thread: Thread
  }

  let { open = $bindable(), onClose, thread }: Props = $props()
</script>

{#if open}
  <aside class="flex h-full w-80 flex-shrink-0 flex-col border-l border-border bg-card/50">
    <!-- Header -->
    <div class="flex h-14 items-center justify-between border-b border-border px-4">
      <h2 class="font-medium text-foreground">Sources</h2>
      <button
        onclick={onClose}
        class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <XIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <ScopedSources
        scopeType="thread"
        scopeId={thread.id}
        title="Attached Sources"
        description="Docs and references for this conversation"
      />
    </div>
  </aside>
{/if}
