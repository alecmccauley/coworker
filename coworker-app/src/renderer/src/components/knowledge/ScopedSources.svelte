<script lang="ts">
  import { onMount } from 'svelte'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import FileStackIcon from '@lucide/svelte/icons/file-stack'
  import { Button } from '$lib/components/ui/button'
  import KnowledgeSourceList from './KnowledgeSourceList.svelte'
  import AddKnowledgeDialog from './AddKnowledgeDialog.svelte'
  import type { KnowledgeSource, ScopeType } from '$lib/types'

  interface Props {
    scopeType: ScopeType | 'thread'
    scopeId?: string
    title: string
    description?: string
    readonly?: boolean
  }

  let { scopeType, scopeId, title, description, readonly = false }: Props = $props()

  let sources = $state<KnowledgeSource[]>([])
  let isLoading = $state(true)
  let showAddDialog = $state(false)

  onMount(async () => {
    await loadSources()
  })

  $effect(() => {
    // Reload sources when scope changes
    void loadSources()
  })

  async function loadSources(): Promise<void> {
    isLoading = true
    try {
      // TODO: Once API supports scoped source listing, filter by scope
      // For now, list all sources (workspace-wide)
      sources = await window.api.knowledge.listSources()
    } catch (error) {
      console.error('Failed to load sources:', error)
    } finally {
      isLoading = false
    }
  }

  async function handleSourceAdded(): Promise<void> {
    await loadSources()
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <div class="flex items-center gap-2">
        <FileStackIcon class="h-4 w-4 text-muted-foreground" />
        <h3 class="font-medium text-foreground">{title}</h3>
      </div>
      {#if description}
        <p class="mt-1 text-sm text-muted-foreground">{description}</p>
      {/if}
    </div>
    {#if !readonly}
      <Button size="sm" variant="outline" class="gap-2" onclick={() => (showAddDialog = true)}>
        <PlusIcon class="h-4 w-4" />
        Add
      </Button>
    {/if}
  </div>

  <KnowledgeSourceList {sources} {isLoading} />
</div>

<AddKnowledgeDialog
  bind:open={showAddDialog}
  onClose={() => (showAddDialog = false)}
  onAdded={handleSourceAdded}
  {scopeType}
  {scopeId}
/>
