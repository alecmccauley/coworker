<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2'
  import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import { Button } from '$lib/components/ui/button'
  import type { KnowledgeSource, IndexingProgressPayload } from '$lib/types'

  let sources = $state<KnowledgeSource[]>([])
  let isLoading = $state(true)
  let removeListener: (() => void) | null = null
  let isIndexingAll = $state(false)

  onMount(async () => {
    await loadSources()
    removeListener = window.api.knowledge.onIndexingProgress(handleIndexingProgress)
  })

  onDestroy(() => {
    removeListener?.()
  })

  async function loadSources(): Promise<void> {
    isLoading = true
    try {
      sources = await window.api.knowledge.listSources()
    } catch (error) {
      console.error('Failed to load sources:', error)
    } finally {
      isLoading = false
    }
  }

  async function handleIndexAll(): Promise<void> {
    if (isIndexingAll) return
    isIndexingAll = true
    try {
      await window.api.knowledge.indexAllSources()
      await loadSources()
    } catch (error) {
      console.error('Failed to index all sources:', error)
    } finally {
      isIndexingAll = false
    }
  }

  function handleIndexingProgress(payload: IndexingProgressPayload): void {
    const index = sources.findIndex((source) => source.id === payload.sourceId)
    if (index < 0) {
      void loadSources()
      return
    }

    sources = sources.map((source) => {
      if (source.id !== payload.sourceId) {
        return source
      }

      return {
        ...source,
        indexStatus: payload.status,
        indexError: payload.message ?? source.indexError,
        updatedAt: new Date(payload.updatedAt)
      }
    })
  }

  function statusLabel(source: KnowledgeSource): string {
    if (!source.indexStatus) return 'Pending'
    if (source.indexStatus === 'processing') return 'Indexing'
    if (source.indexStatus === 'ready') return 'Ready'
    if (source.indexStatus === 'error') return 'Error'
    return 'Pending'
  }

  function statusIcon(source: KnowledgeSource) {
    if (source.indexStatus === 'processing') return Loader2Icon
    if (source.indexStatus === 'ready') return CheckCircleIcon
    if (source.indexStatus === 'error') return AlertTriangleIcon
    return ClockIcon
  }

  function statusClass(source: KnowledgeSource): string {
    if (source.indexStatus === 'processing') return 'text-accent'
    if (source.indexStatus === 'ready') return 'text-foreground'
    if (source.indexStatus === 'error') return 'text-destructive'
    return 'text-muted-foreground'
  }

  function formatTimestamp(date: Date | null | undefined): string {
    if (!date) return '—'
    return new Date(date).toLocaleString()
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-semibold text-foreground">Indexing Status</h3>
      <p class="text-sm text-muted-foreground">
        Live status of every knowledge source in this workspace.
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onclick={handleIndexAll}
        class="gap-2"
        disabled={isIndexingAll}
      >
        {#if isIndexingAll}
          <Loader2Icon class="h-4 w-4 animate-spin" />
        {:else}
          <RefreshCwIcon class="h-4 w-4" />
        {/if}
        Index all sources
      </Button>
      <Button variant="ghost" size="sm" onclick={loadSources} class="gap-2">
        <RefreshCwIcon class="h-4 w-4" />
        Refresh
      </Button>
    </div>
  </div>

  <div class="rounded-xl border border-border bg-card">
    <div class="border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Sources
    </div>

    {#if isLoading}
      <div class="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2Icon class="h-4 w-4 animate-spin" />
        Loading sources...
      </div>
    {:else if sources.length === 0}
      <div class="px-4 py-6 text-sm text-muted-foreground">No sources yet.</div>
    {:else}
      <div class="divide-y divide-border">
        {#each sources as source}
          <div class="px-4 py-4">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <p class="text-sm font-medium text-foreground">{source.name ?? 'Untitled source'}</p>
                <p class="text-xs text-muted-foreground">
                  {source.kind.toUpperCase()} · {source.scopeType ?? 'workspace'}
                </p>
                {#if source.indexStatus === 'error' && source.indexError}
                  <p class="text-xs text-destructive">{source.indexError}</p>
                {/if}
              </div>
              <div class="flex flex-col items-end gap-1">
                <div class={`flex items-center gap-1 text-xs font-medium ${statusClass(source)}`}>
                  {#if statusIcon(source)}
                    <svelte:component
                      this={statusIcon(source)}
                      class={`h-3.5 w-3.5 ${
                        source.indexStatus === 'processing' ? 'animate-spin' : ''
                      }`}
                    />
                  {/if}
                  {statusLabel(source)}
                </div>
                <p class="text-xs text-muted-foreground">
                  {formatTimestamp(source.indexedAt ?? source.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
