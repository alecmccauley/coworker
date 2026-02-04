<script lang="ts">
  import LinkIcon from '@lucide/svelte/icons/link'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import FileStackIcon from '@lucide/svelte/icons/file-stack'
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import Trash2Icon from '@lucide/svelte/icons/trash-2'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'
  import type { KnowledgeSource } from '$lib/types'

  interface Props {
    sources: KnowledgeSource[]
    isLoading?: boolean
    onChanged?: () => Promise<void>
  }

  let { sources, isLoading = false, onChanged }: Props = $props()

  let editingSource = $state<KnowledgeSource | null>(null)
  let editName = $state('')
  let editNotes = $state('')
  let isSaving = $state(false)
  let isEditOpen = $state(false)

  let deletingSource = $state<KnowledgeSource | null>(null)
  let isDeleting = $state(false)
  let isDeleteOpen = $state(false)

  interface SourceMetadata {
    url?: string
    preview?: string
    filename?: string
    size?: number
    mime?: string
  }

  function parseMetadata(source: KnowledgeSource): SourceMetadata {
    if (!source.metadata) return {}
    try {
      return JSON.parse(source.metadata) as SourceMetadata
    } catch {
      return {}
    }
  }

  function getSourceLabel(source: KnowledgeSource): string {
    const metadata = parseMetadata(source)
    if (source.kind === 'url') {
      return source.name ?? metadata.url ?? 'Link'
    }
    if (source.kind === 'file') {
      return source.name ?? metadata.filename ?? 'File'
    }
    if (source.kind === 'text') {
      return source.name ?? 'Text note'
    }
    return source.name ?? 'Source'
  }

  function getSourcePreview(source: KnowledgeSource): string | null {
    if (source.notes && source.notes.trim().length > 0) {
      return source.notes
    }
    const metadata = parseMetadata(source)
    if (typeof metadata.preview === 'string' && metadata.preview.length > 0) {
      return metadata.preview
    }
    if (source.kind === 'url' && typeof metadata.url === 'string') {
      return metadata.url
    }
    return null
  }

  function formatSize(bytes?: number): string | null {
    if (!bytes || bytes <= 0) return null
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  function getFileMetaLine(source: KnowledgeSource): string | null {
    if (source.kind !== 'file') return null
    const metadata = parseMetadata(source)
    const sizeLabel = formatSize(metadata.size)
    const mimeLabel = metadata.mime ?? null
    const parts = [mimeLabel, sizeLabel].filter((value) => value && value.length > 0)
    return parts.length > 0 ? parts.join(' · ') : null
  }

  function openEdit(source: KnowledgeSource): void {
    editingSource = source
    editName = source.name ?? ''
    editNotes = source.notes ?? ''
    isEditOpen = true
  }

  $effect(() => {
    if (!isEditOpen) {
      editingSource = null
    }
  })

  $effect(() => {
    if (!isDeleteOpen) {
      deletingSource = null
    }
  })

  async function handleSaveEdit(): Promise<void> {
    if (!editingSource) return
    isSaving = true
    try {
      const trimmedName = editName.trim()
      const trimmedNotes = editNotes.trim()
      await window.api.knowledge.updateSource(editingSource.id, {
        name: trimmedName.length > 0 ? trimmedName : undefined,
        notes: trimmedNotes.length > 0 ? trimmedNotes : null
      })
      await onChanged?.()
      isEditOpen = false
    } catch (error) {
      console.error('Failed to update source:', error)
    } finally {
      isSaving = false
    }
  }

  async function handleDeleteSource(): Promise<void> {
    if (!deletingSource) return
    isDeleting = true
    try {
      await window.api.knowledge.removeSource(deletingSource.id)
      await onChanged?.()
      isDeleteOpen = false
    } catch (error) {
      console.error('Failed to remove source:', error)
    } finally {
      isDeleting = false
    }
  }
</script>

<div class="space-y-3">
  {#if isLoading}
    <div class="text-sm text-muted-foreground">Loading sources...</div>
  {:else if sources.length === 0}
    <p class="text-sm text-muted-foreground">
      Attach notes, links, or files to keep this work grounded in real context.
    </p>
  {:else}
    {#each sources as source (source.id)}
      <div class="group relative rounded-xl border border-border bg-card p-4 transition-all hover:border-accent/30 hover:shadow-sm">
        <div class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Button variant="ghost" size="icon-sm" {...props}>
                  <MoreHorizontalIcon class="h-4 w-4" />
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onclick={() => openEdit(source)}>
                <PencilIcon class="mr-2 h-4 w-4" />
                Rename & notes
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                class="text-destructive focus:text-destructive"
                onclick={() => {
                  deletingSource = source
                  isDeleteOpen = true
                }}
              >
                <Trash2Icon class="mr-2 h-4 w-4" />
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        <div class="flex items-start gap-3">
          <div class="mt-0.5 text-muted-foreground">
            {#if source.kind === 'url'}
              <LinkIcon class="h-4 w-4" />
            {:else if source.kind === 'file'}
              <FileStackIcon class="h-4 w-4" />
            {:else}
              <FileTextIcon class="h-4 w-4" />
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground">{getSourceLabel(source)}</p>
            {#if getFileMetaLine(source)}
              <p class="mt-1 text-xs text-muted-foreground">{getFileMetaLine(source)}</p>
            {/if}
            {#if getSourcePreview(source)}
              <p class="mt-2 text-xs text-muted-foreground line-clamp-2">
                {getSourcePreview(source)}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  {/if}
</div>

<Dialog.Root bind:open={isEditOpen}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Edit Source</Dialog.Title>
      <Dialog.Description>Rename this source and add helpful notes.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="edit-source-name">Label</Label>
        <Input
          id="edit-source-name"
          bind:value={editName}
          placeholder="Source label"
          disabled={isSaving}
        />
      </div>
      <div class="space-y-2">
        <Label for="edit-source-notes">Notes</Label>
        <Textarea
          id="edit-source-notes"
          bind:value={editNotes}
          placeholder="What should teammates know about this source?"
          rows={4}
          disabled={isSaving}
        />
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (isEditOpen = false)} disabled={isSaving}>
        Cancel
      </Button>
      <Button onclick={handleSaveEdit} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save changes'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={isDeleteOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Source</AlertDialog.Title>
      <AlertDialog.Description>
        This will remove the source from this workspace. You can reattach it later if needed.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel asChild>
        <Button variant="outline" disabled={isDeleting}>Cancel</Button>
      </AlertDialog.Cancel>
      <AlertDialog.Action asChild>
        <Button variant="destructive" onclick={handleDeleteSource} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
