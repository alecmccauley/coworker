<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import XIcon from '@lucide/svelte/icons/x'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import { Button } from '$lib/components/ui/button'
  import WorkspaceNotes from './WorkspaceNotes.svelte'
  import KnowledgeSourceList from './KnowledgeSourceList.svelte'
  import AddKnowledgeDialog from './AddKnowledgeDialog.svelte'
  import type { Channel, Thread, KnowledgeSource } from '$lib/types'

  interface Props {
    open: boolean
    onClose: () => void
    channel?: Channel | null
    thread?: Thread | null
  }

  let { open = $bindable(), onClose, channel, thread }: Props = $props()

  let sources = $state<KnowledgeSource[]>([])
  let isLoadingSources = $state(false)
  let showAddDialog = $state(false)

  $effect(() => {
    if (open) {
      void loadSources()
    }
  })

  async function loadSources(): Promise<void> {
    isLoadingSources = true
    try {
      sources = await window.api.knowledge.listSources('workspace')
    } catch (error) {
      console.error('Failed to load knowledge sources:', error)
    } finally {
      isLoadingSources = false
    }
  }

  async function handleSourceAdded(): Promise<void> {
    await loadSources()
  }
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

      <!-- Attached Sources -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
            <h3 class="font-medium text-foreground">Attached Sources</h3>
          </div>
          <Button size="sm" variant="outline" class="gap-2" onclick={() => (showAddDialog = true)}>
            <PlusIcon class="h-4 w-4" />
            Add
          </Button>
        </div>
        <KnowledgeSourceList sources={sources} isLoading={isLoadingSources} />
      </div>
    </div>
  </aside>
{/if}

<AddKnowledgeDialog
  bind:open={showAddDialog}
  onClose={() => (showAddDialog = false)}
  onAdded={handleSourceAdded}
/>
