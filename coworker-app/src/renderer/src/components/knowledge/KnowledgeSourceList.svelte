<script lang="ts">
  import LinkIcon from '@lucide/svelte/icons/link'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import type { KnowledgeSource } from '$lib/types'

  interface Props {
    sources: KnowledgeSource[]
    isLoading?: boolean
  }

  let { sources, isLoading = false }: Props = $props()

  function parseMetadata(source: KnowledgeSource): Record<string, unknown> {
    if (!source.metadata) return {}
    try {
      return JSON.parse(source.metadata) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  function getSourceLabel(source: KnowledgeSource): string {
    if (source.kind === 'url') {
      const metadata = parseMetadata(source)
      const url = typeof metadata.url === 'string' ? metadata.url : null
      return url ?? source.name ?? 'Link'
    }
    if (source.kind === 'text') {
      return source.name ?? 'Text note'
    }
    return source.name ?? 'Source'
  }

  function getSourcePreview(source: KnowledgeSource): string | null {
    const metadata = parseMetadata(source)
    const preview = metadata.preview
    if (typeof preview === 'string' && preview.length > 0) {
      return preview
    }
    return null
  }
</script>

<div class="space-y-3">
  {#if isLoading}
    <div class="text-sm text-muted-foreground">Loading sources...</div>
  {:else if sources.length === 0}
    <p class="text-sm text-muted-foreground">
      Attach notes or links to keep this work grounded in real context.
    </p>
  {:else}
    {#each sources as source (source.id)}
      <div class="rounded-lg border border-border bg-card p-3">
        <div class="flex items-start gap-2">
          <div class="mt-0.5 text-muted-foreground">
            {#if source.kind === 'url'}
              <LinkIcon class="h-4 w-4" />
            {:else}
              <FileTextIcon class="h-4 w-4" />
            {/if}
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-foreground">{getSourceLabel(source)}</p>
            {#if getSourcePreview(source)}
              <p class="mt-1 text-xs text-muted-foreground line-clamp-2">
                {getSourcePreview(source)}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  {/if}
</div>
