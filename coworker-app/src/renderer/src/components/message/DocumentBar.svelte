<script lang="ts">
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Button } from '$lib/components/ui/button'
  import type { DocumentData } from '$lib/types'
  import DocumentViewDialog from './DocumentViewDialog.svelte'
  import DocumentRenameDialog from './DocumentRenameDialog.svelte'

  interface Props {
    documentData: DocumentData
    authorLabel: string
    activityLabel?: string
    messageId?: string
    onRenamed?: (messageId: string, updatedContentShort: string) => void
  }

  let { documentData, authorLabel, activityLabel, messageId, onRenamed }: Props = $props()

  let dialogOpen = $state(false)
  let isDrafting = $derived(!documentData.blobId)

  let isRenameOpen = $state(false)
  let renameError = $state<string | null>(null)
  let isRenaming = $state(false)

  async function handleRename(newTitle: string): Promise<void> {
    if (!messageId) return
    isRenaming = true
    renameError = null
    try {
      const updated: DocumentData = { ...documentData, title: newTitle }
      const updatedContentShort = JSON.stringify(updated)
      await window.api.message.update(messageId, { contentShort: updatedContentShort })
      onRenamed?.(messageId, updatedContentShort)
      isRenameOpen = false
    } catch (err) {
      console.error('Failed to rename document:', err)
      renameError = 'Failed to rename document. Please try again.'
    } finally {
      isRenaming = false
    }
  }
</script>

<div class="flex flex-col gap-1 items-start">
  <span class="text-xs font-medium text-muted-foreground">{authorLabel}</span>
  {#if isDrafting}
    <div
      class="max-w-2xl w-full rounded-2xl border border-accent/40 bg-accent/5 px-5 py-4 text-left flex items-center gap-3 animate-pulse"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0 text-accent"
      >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 13H8" />
        <path d="M16 17H8" />
        <path d="M16 13h-2" />
      </svg>
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="text-sm font-medium text-foreground truncate">{documentData.title}</span>
        {#if activityLabel}
          <span class="text-xs text-muted-foreground">{activityLabel}</span>
        {:else}
          <span class="text-xs text-muted-foreground">Drafting...</span>
        {/if}
      </div>
    </div>
  {:else}
    <div class="group max-w-2xl w-full flex items-center gap-1">
      <button
        type="button"
        class="flex-1 min-w-0 rounded-2xl border border-accent/40 bg-accent/5 px-5 py-4 cursor-pointer hover:bg-accent/10 transition-colors text-left flex items-center gap-3"
        onclick={() => (dialogOpen = true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0 text-accent"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 13H8" />
          <path d="M16 17H8" />
          <path d="M16 13h-2" />
        </svg>
        <span class="text-sm font-medium text-foreground truncate">{documentData.title}</span>
      </button>
      {#if messageId}
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
              <DropdownMenu.Item onclick={() => (isRenameOpen = true)}>
                <PencilIcon class="mr-2 h-4 w-4" />
                Rename
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {/if}
    </div>
    <DocumentViewDialog
      bind:open={dialogOpen}
      title={documentData.title}
      blobId={documentData.blobId ?? ''}
    />
  {/if}
</div>

<DocumentRenameDialog
  bind:open={isRenameOpen}
  currentTitle={documentData.title}
  onClose={() => (isRenameOpen = false)}
  onSave={handleRename}
  isSaving={isRenaming}
  error={renameError}
/>
