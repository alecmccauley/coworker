<script lang="ts">
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Button } from '$lib/components/ui/button'
  import type { Coworker, ChannelDocument } from '$lib/types'
  import { parseDocumentData } from '$lib/types/document'
  import type { DocumentData } from '$lib/types'
  import DocumentViewDialog from '../message/DocumentViewDialog.svelte'
  import DocumentRenameDialog from '../message/DocumentRenameDialog.svelte'

  interface Props {
    channelId: string
    coworkers: Coworker[]
  }

  let { channelId, coworkers }: Props = $props()

  let documents = $state<ChannelDocument[]>([])
  let isLoading = $state(false)
  let dialogOpen = $state(false)
  let dialogTitle = $state('')
  let dialogBlobId = $state('')

  let isRenameOpen = $state(false)
  let renameTarget = $state<ChannelDocument | null>(null)
  let renameError = $state<string | null>(null)
  let isRenaming = $state(false)

  let coworkerNameById = $derived.by(() => {
    const map = new Map<string, string>()
    for (const cw of coworkers) {
      map.set(cw.id, cw.name)
    }
    return map
  })

  $effect(() => {
    if (channelId) {
      loadDocuments()
    }
  })

  $effect(() => {
    const cleanup = window.api.chat.onComplete(() => {
      loadDocuments()
    })
    return () => cleanup()
  })

  async function loadDocuments(): Promise<void> {
    isLoading = true
    try {
      documents = await window.api.message.listDocumentsByChannel(channelId)
    } catch (error) {
      console.error('Failed to load channel documents:', error)
      documents = []
    } finally {
      isLoading = false
    }
  }

  function openDocument(doc: ChannelDocument): void {
    const parsed = parseDocumentData(doc.contentShort)
    if (!parsed?.blobId) return
    dialogTitle = parsed.title
    dialogBlobId = parsed.blobId
    dialogOpen = true
  }

  function openRename(doc: ChannelDocument): void {
    renameTarget = doc
    renameError = null
    isRenameOpen = true
  }

  async function handleRename(newTitle: string): Promise<void> {
    if (!renameTarget) return
    const parsed = parseDocumentData(renameTarget.contentShort)
    if (!parsed) return
    isRenaming = true
    renameError = null
    try {
      const updated: DocumentData = { ...parsed, title: newTitle }
      await window.api.message.update(renameTarget.messageId, {
        contentShort: JSON.stringify(updated)
      })
      isRenameOpen = false
      renameTarget = null
      await loadDocuments()
    } catch (err) {
      console.error('Failed to rename document:', err)
      renameError = 'Failed to rename document. Please try again.'
    } finally {
      isRenaming = false
    }
  }

  function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }
</script>

<div class="flex h-full flex-col overflow-y-auto">
  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <Loader2Icon class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  {:else if documents.length === 0}
    <div class="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <FileTextIcon class="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 class="font-medium text-foreground">No documents yet</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Documents created by coworkers in this channel will appear here
      </p>
    </div>
  {:else}
    <div class="p-4">
      <div class="space-y-1">
        {#each documents as doc (doc.messageId)}
          {@const parsed = parseDocumentData(doc.contentShort)}
          {#if parsed?.blobId}
            <div
              class="group flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted"
            >
              <button
                type="button"
                class="flex min-w-0 flex-1 items-start gap-3"
                onclick={() => openDocument(doc)}
              >
                <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent/5">
                  <FileTextIcon class="h-4 w-4 text-accent" />
                </div>
                <div class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-foreground">
                    {parsed.title}
                  </span>
                  <span class="block truncate text-xs text-muted-foreground">
                    {#if doc.authorId}
                      by {coworkerNameById.get(doc.authorId) ?? 'Unknown'}
                    {/if}
                    {#if doc.threadTitle}
                      {doc.authorId ? ' · ' : ''}in {doc.threadTitle}
                    {/if}
                    {#if doc.createdAt}
                      {(doc.authorId || doc.threadTitle) ? ' · ' : ''}{formatRelativeTime(doc.createdAt)}
                    {/if}
                  </span>
                </div>
              </button>
              <div class="opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <Button variant="ghost" size="icon-sm" {...props}>
                        <MoreHorizontalIcon class="h-4 w-4" />
                      </Button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item onclick={() => openRename(doc)}>
                      <PencilIcon class="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<DocumentViewDialog
  bind:open={dialogOpen}
  title={dialogTitle}
  blobId={dialogBlobId}
/>

<DocumentRenameDialog
  bind:open={isRenameOpen}
  currentTitle={renameTarget ? (parseDocumentData(renameTarget.contentShort)?.title ?? '') : ''}
  onClose={() => { isRenameOpen = false; renameTarget = null }}
  onSave={handleRename}
  isSaving={isRenaming}
  error={renameError}
/>
