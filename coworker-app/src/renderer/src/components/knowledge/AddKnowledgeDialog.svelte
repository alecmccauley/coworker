<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'
  import FileUpIcon from '@lucide/svelte/icons/file-up'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import LinkIcon from '@lucide/svelte/icons/link'
  import CloudIcon from '@lucide/svelte/icons/cloud'
  import CheckIcon from '@lucide/svelte/icons/check'
  import InfoIcon from '@lucide/svelte/icons/info'
  import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2'
  import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import type { Component } from 'svelte'
  import type {
    KnowledgeSourceKind,
    SourceScopeType,
    ImportProgressPayload,
    ImportSourcesResult
  } from '$lib/types'

  interface Props {
    open: boolean
    onClose: () => void
    onAdded: () => Promise<void>
    scopeType?: SourceScopeType
    scopeId?: string
  }

  let { open = $bindable(), onClose, onAdded, scopeType, scopeId }: Props = $props()

  interface SourceTypeOption {
    id: string
    label: string
    description: string
    icon: Component
    comingSoon: boolean
    disabled: boolean
  }

  const primarySourceTypes: SourceTypeOption[] = [
    {
      id: 'file',
      label: 'File',
      description: 'Import PDF, DOCX, or Markdown',
      icon: FileUpIcon,
      comingSoon: false,
      disabled: false
    },
    {
      id: 'text',
      label: 'Text',
      description: 'Paste notes or key context',
      icon: FileTextIcon,
      comingSoon: false,
      disabled: false
    }
  ]

  const secondarySourceTypes: SourceTypeOption[] = [
    {
      id: 'url',
      label: 'Link',
      description: 'Save a web link',
      icon: LinkIcon,
      comingSoon: true,
      disabled: false
    },
    {
      id: 'google-drive',
      label: 'Google Drive',
      description: 'Connect your Drive',
      icon: CloudIcon,
      comingSoon: true,
      disabled: true
    },
    {
      id: 'onedrive',
      label: 'OneDrive',
      description: 'Connect OneDrive',
      icon: CloudIcon,
      comingSoon: true,
      disabled: true
    }
  ]

  let kind = $state<KnowledgeSourceKind>('file')
  let name = $state('')
  let content = $state('')
  let url = $state('')
  let notes = $state('')
  let isSubmitting = $state(false)
  let error = $state<string | null>(null)
  let isImporting = $state(false)
  let importItems = $state<ImportProgressPayload[]>([])
  let importBatchId = $state<string | null>(null)
  let importResult = $state<ImportSourcesResult | null>(null)
  let removeImportListener: (() => void) | null = null

  const resolvedScopeType = $derived<SourceScopeType>(scopeType ?? 'workspace')

  $effect(() => {
    if (open) {
      kind = 'file'
      name = ''
      content = ''
      url = ''
      notes = ''
      error = null
      isImporting = false
      importItems = []
      importBatchId = null
      importResult = null
      removeImportListener?.()
      removeImportListener = null
    }
  })

  $effect(() => {
    if (!open) {
      removeImportListener?.()
      removeImportListener = null
    }
  })

  function selectKind(option: SourceTypeOption): void {
    if (option.disabled || isSubmitting || isImporting) return
    kind = option.id as KnowledgeSourceKind
  }

  function registerImportListener(): void {
    removeImportListener?.()
    removeImportListener = window.api.knowledge.onImportProgress((payload) => {
      if (!importBatchId) {
        importBatchId = payload.batchId
      }
      if (importBatchId !== payload.batchId) {
        return
      }

      const index = importItems.findIndex((item) => item.filePath === payload.filePath)
      if (index >= 0) {
        importItems = importItems.map((item, idx) =>
          idx === index ? { ...item, ...payload } : item
        )
      } else {
        importItems = [...importItems, payload]
      }
    })
  }

  async function handleFileImport(): Promise<void> {
    if (isImporting) return
    isImporting = true
    error = null
    importItems = []
    importBatchId = null
    importResult = null

    registerImportListener()

    try {
      const result = await window.api.knowledge.importFiles(resolvedScopeType, scopeId)
      importResult = result
      if (!result.canceled) {
        await onAdded()
      }
      if (result.canceled) {
        isImporting = false
        return
      }
      if (result.failures.length === 0) {
        onClose()
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to import files.'
    } finally {
      isImporting = false
    }
  }

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault()

    if (kind === 'file') {
      return
    }

    if (kind === 'text' && !content.trim()) {
      error = 'Please add some notes before saving.'
      return
    }

    if (kind === 'url' && !url.trim()) {
      error = 'Please add a link to save.'
      return
    }

    isSubmitting = true
    error = null

    try {
      if (kind === 'text') {
        const blobResult = await window.api.blob.add({
          data: content.trim(),
          mime: 'text/plain'
        })

        await window.api.knowledge.addSource({
          scopeType: resolvedScopeType,
          scopeId,
          kind: 'text',
          name: name.trim() || 'Text note',
          blobId: blobResult.blob.id,
          metadata: JSON.stringify({
            preview: content.trim().slice(0, 160)
          })
        })
      } else if (kind === 'url') {
        let label = name.trim()
        try {
          if (!label) {
            const parsed = new URL(url.trim())
            label = parsed.hostname
          }
        } catch {
          label = label || 'Link'
        }

        await window.api.knowledge.addSource({
          scopeType: resolvedScopeType,
          scopeId,
          kind: 'url',
          name: label || 'Link',
          metadata: JSON.stringify({ url: url.trim() }),
          notes: notes.trim() || undefined
        })
      }

      await onAdded()
      onClose()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to save this source.'
    } finally {
      isSubmitting = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-xl">
    <Dialog.Header>
      <Dialog.Title>Add Knowledge Source</Dialog.Title>
      <Dialog.Description>
        Save notes, links, or files so your co-workers can keep context close.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Primary source types -->
      <div class="space-y-3">
        <Label>Source type</Label>
        <div class="grid grid-cols-2 gap-3">
          {#each primarySourceTypes as option (option.id)}
            <button
              type="button"
              onclick={() => selectKind(option)}
              disabled={isSubmitting || isImporting}
              class="relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all {kind === option.id ? 'border-accent bg-accent/5 shadow-sm' : 'border-border hover:border-accent/50 hover:bg-card'}"
            >
              {#if kind === option.id}
                <div class="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <CheckIcon class="h-3 w-3" />
                </div>
              {/if}
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <option.icon class="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p class="text-sm font-medium text-foreground">{option.label}</p>
                <p class="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
              </div>
            </button>
          {/each}
        </div>

        <!-- Secondary source types -->
        <div class="grid grid-cols-3 gap-2">
          {#each secondarySourceTypes as option (option.id)}
            <button
              type="button"
              onclick={() => selectKind(option)}
              disabled={option.disabled || isSubmitting || isImporting}
              class="relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all {option.disabled
                ? 'cursor-not-allowed border-border opacity-60'
                : kind === option.id
                  ? 'border-accent bg-accent/5 shadow-sm'
                  : 'border-border hover:border-accent/50 hover:bg-card'}"
            >
              {#if option.comingSoon}
                <span class="absolute -top-2 right-2 rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Coming soon
                </span>
              {/if}
              {#if kind === option.id && !option.disabled}
                <div class="absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <CheckIcon class="h-2.5 w-2.5" />
                </div>
              {/if}
              <div class="flex h-8 w-8 items-center justify-center rounded-lg {option.disabled ? 'bg-muted/50' : 'bg-muted'}">
                <option.icon class="h-4 w-4 {option.disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}" />
              </div>
              <p class="text-xs font-medium {option.disabled ? 'text-muted-foreground/50' : 'text-foreground'}">{option.label}</p>
            </button>
          {/each}
        </div>
      </div>

      <!-- Link info banner -->
      {#if kind === 'url'}
        <div class="flex items-start gap-2.5 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
          <InfoIcon class="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p class="text-xs leading-relaxed text-foreground/80">
            Links are saved for reference but won't be indexed yet. Full link indexing is coming soon.
          </p>
        </div>
      {/if}

      {#if kind !== 'file'}
        <div class="space-y-2">
          <Label for="source-name">Label (optional)</Label>
          <Input
            id="source-name"
            bind:value={name}
            placeholder="e.g., Brand voice notes"
            disabled={isSubmitting || isImporting}
          />
        </div>
      {/if}

      {#if kind === 'text'}
        <div class="space-y-2">
          <Label for="source-content">Notes</Label>
          <Textarea
            id="source-content"
            bind:value={content}
            placeholder="Paste the key context you want to remember..."
            rows={4}
            disabled={isSubmitting || isImporting}
          />
        </div>
      {:else if kind === 'url'}
        <div class="space-y-2">
          <Label for="source-url">Link</Label>
          <Input
            id="source-url"
            bind:value={url}
            placeholder="https://example.com"
            disabled={isSubmitting || isImporting}
          />
        </div>
        <div class="space-y-2">
          <Label for="source-notes">Notes (optional)</Label>
          <Textarea
            id="source-notes"
            bind:value={notes}
            placeholder="Why this link matters..."
            rows={3}
            disabled={isSubmitting || isImporting}
          />
        </div>
      {:else if kind === 'file'}
        <div class="rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <div class="flex items-start gap-3">
            <div class="rounded-full bg-background p-2 text-muted-foreground">
              <FileUpIcon class="h-4 w-4" />
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-foreground">Attach documents</p>
              <p class="mt-1 text-xs text-muted-foreground">
                Import PDF, DOCX, or Markdown files into this workspace.
              </p>
            </div>
          </div>
          <div class="mt-4">
            <Button
              type="button"
              variant="outline"
              class="gap-2"
              onclick={handleFileImport}
              disabled={isImporting}
            >
              {#if isImporting}
                <Loader2Icon class="h-4 w-4 animate-spin" />
                Importing...
              {:else}
                Choose files
              {/if}
            </Button>
          </div>
        </div>

        {#if importItems.length > 0}
          <div class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Import progress
            </p>
            <div class="space-y-2">
              {#each importItems as item (item.filePath)}
                <div class="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-foreground">{item.filename}</p>
                    {#if item.status === 'error'}
                      <p class="mt-1 text-xs text-destructive">{item.error}</p>
                    {:else if item.status === 'processing'}
                      <p class="mt-1 text-xs text-muted-foreground">Importing...</p>
                    {:else if item.status === 'queued'}
                      <p class="mt-1 text-xs text-muted-foreground">Queued</p>
                    {:else if item.status === 'success'}
                      <p class="mt-1 text-xs text-muted-foreground">Imported</p>
                    {/if}
                  </div>
                  <div>
                    {#if item.status === 'processing'}
                      <Loader2Icon class="h-4 w-4 animate-spin text-muted-foreground" />
                    {:else if item.status === 'queued'}
                      <Loader2Icon class="h-4 w-4 text-muted-foreground" />
                    {:else if item.status === 'success'}
                      <CheckCircleIcon class="h-4 w-4 text-emerald-500" />
                    {:else if item.status === 'error'}
                      <AlertTriangleIcon class="h-4 w-4 text-destructive" />
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if importResult && importResult.failures.length > 0}
          <p class="text-sm text-destructive">
            Some files could not be imported. You can retry by choosing files again.
          </p>
        {/if}
      {/if}

      {#if error}
        <p class="text-sm text-destructive">{error}</p>
      {/if}

      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={onClose}
          disabled={isSubmitting || isImporting}
        >
          {importResult && importResult.failures.length > 0 ? 'Close' : 'Cancel'}
        </Button>
        {#if kind !== 'file'}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save source'}
          </Button>
        {/if}
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
