<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { cn } from '$lib/utils'
  import type { DocumentVersion } from '$lib/types'

  interface Props {
    versions: DocumentVersion[]
    selectedId: string | null
    onSelect: (versionId: string) => void
    onRevert: (versionId: string) => void
    loading?: boolean
  }

  let {
    versions,
    selectedId,
    onSelect,
    onRevert,
    loading = false
  }: Props = $props()

  const formatTime = (value: Date): string => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date(value))
    } catch {
      return ''
    }
  }
</script>

<div class="flex-1 overflow-hidden flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <h4 class="text-sm font-medium text-foreground">Versions</h4>
  </div>

  {#if loading}
    <div class="text-xs text-muted-foreground">Loading versions...</div>
  {:else if versions.length === 0}
    <div class="text-xs text-muted-foreground">No history yet</div>
  {:else}
    <div class="flex-1 overflow-y-auto flex flex-col gap-2">
      {#each versions as version (version.id)}
        <button
          type="button"
          class={cn(
            'rounded-md border px-3 py-2 text-left text-xs transition-colors',
            version.id === selectedId
              ? 'border-accent bg-accent/10 text-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground'
          )}
          onclick={() => onSelect(version.id)}
        >
          <div class="text-foreground font-medium truncate">{version.commitMessage}</div>
          <div class="mt-1 text-[11px] text-muted-foreground">
            {formatTime(version.createdAt)}
          </div>
        </button>
      {/each}
    </div>

    {#if selectedId}
      <Button size="sm" variant="outline" class="mt-2" onclick={() => onRevert(selectedId)}>
        Revert to this version
      </Button>
    {/if}
  {/if}
</div>
