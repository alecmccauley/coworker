<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import FileStackIcon from '@lucide/svelte/icons/file-stack'
  import FileUpIcon from '@lucide/svelte/icons/file-up'
  import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2'
  import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import { Button } from '$lib/components/ui/button'
  import KnowledgeSourceList from './KnowledgeSourceList.svelte'
  import AddKnowledgeDialog from './AddKnowledgeDialog.svelte'
  import type {
    KnowledgeSource,
    SourceScopeType,
    ImportProgressPayload
  } from '$lib/types'

  interface Props {
    scopeType: SourceScopeType
    scopeId?: string
    title: string
    description?: string
    readonly?: boolean
  }

  let { scopeType, scopeId, title, description, readonly = false }: Props = $props()

  let sources = $state<KnowledgeSource[]>([])
  let isLoading = $state(true)
  let showAddDialog = $state(false)
  let isDragActive = $state(false)
  let importItems = $state<ImportProgressPayload[]>([])
  let importBatchId = $state<string | null>(null)
  let isImporting = $state(false)
  let importWarning = $state<string | null>(null)
  let removeImportListener: (() => void) | null = null
  let warningTimeout: ReturnType<typeof setTimeout> | null = null

  const supportedExtensions = ['.pdf', '.docx', '.md']

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
      sources = await window.api.knowledge.listSources(scopeType, scopeId)
    } catch (error) {
      console.error('Failed to load sources:', error)
    } finally {
      isLoading = false
    }
  }

  async function handleSourceAdded(): Promise<void> {
    await loadSources()
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

  function clearWarningTimeout(): void {
    if (warningTimeout) {
      clearTimeout(warningTimeout)
      warningTimeout = null
    }
  }

  function setWarning(message: string): void {
    importWarning = message
    clearWarningTimeout()
    warningTimeout = setTimeout(() => {
      importWarning = null
      warningTimeout = null
    }, 4000)
  }

  async function importFiles(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0 || readonly) return
    isImporting = true
    importItems = []
    importBatchId = null

    registerImportListener()

    try {
      const result = await window.api.knowledge.importFilesByPath(
        filePaths,
        scopeType,
        scopeId
      )
      if (!result.canceled) {
        await loadSources()
      }
    } catch (error) {
      console.error('Failed to import sources:', error)
      setWarning('Unable to import those files right now.')
    } finally {
      isImporting = false
    }
  }

  function handleDragOver(event: DragEvent): void {
    if (readonly) return
    event.preventDefault()
    isDragActive = true
  }

  function handleDragEnter(event: DragEvent): void {
    if (readonly) return
    event.preventDefault()
    isDragActive = true
  }

  function handleDragLeave(event: DragEvent): void {
    if (readonly) return
    event.preventDefault()
    isDragActive = false
  }

  async function handleDrop(event: DragEvent): Promise<void> {
    if (readonly) return
    event.preventDefault()
    isDragActive = false

    const transfer = event.dataTransfer
    if (!transfer) return

    const droppedFiles =
      transfer.files.length > 0
        ? Array.from(transfer.files)
        : Array.from(transfer.items ?? [])
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file))
    if (droppedFiles.length === 0) {
      setWarning('No files were detected. Try dropping again.')
      return
    }

    const supportedFiles = droppedFiles.filter((file) =>
      supportedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    )
    const unsupportedCount = droppedFiles.length - supportedFiles.length

    if (unsupportedCount > 0) {
      setWarning('Only PDF, DOCX, and Markdown files can be attached.')
    }

    const paths = supportedFiles
      .map((file) => file.path)
      .filter((path): path is string => Boolean(path && path.length > 0))

    if (paths.length === 0) {
      setWarning('Unable to access those files. Try the Add button instead.')
      return
    }

    await importFiles(paths)
  }

  onDestroy(() => {
    removeImportListener?.()
    clearWarningTimeout()
  })
</script>

<div
  class="relative space-y-3"
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
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

  {#if importWarning}
    <div class="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <AlertTriangleIcon class="h-4 w-4" />
      {importWarning}
    </div>
  {/if}

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

  <KnowledgeSourceList {sources} {isLoading} onChanged={handleSourceAdded} />

  {#if isDragActive && !readonly}
    <div class="pointer-events-none absolute inset-0 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5">
      <div class="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <FileUpIcon class="h-5 w-5 text-accent" />
        Drop files to attach
      </div>
    </div>
  {/if}
</div>

<AddKnowledgeDialog
  bind:open={showAddDialog}
  onClose={() => (showAddDialog = false)}
  onAdded={handleSourceAdded}
  {scopeType}
  {scopeId}
/>
