<script lang="ts">
  import { onMount } from 'svelte'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import PinIcon from '@lucide/svelte/icons/pin'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'
  import type { KnowledgeItem } from '$lib/types'

  interface Props {
    readonly?: boolean
  }

  let { readonly = false }: Props = $props()

  let notes = $state<KnowledgeItem[]>([])
  let isLoading = $state(true)
  let isAdding = $state(false)
  let newNoteContent = $state('')

  onMount(async () => {
    await loadNotes()
  })

  async function loadNotes(): Promise<void> {
    isLoading = true
    try {
      // Get workspace-scoped, pinned knowledge items
      const items = await window.api.knowledge.list('workspace')
      notes = items.filter((item) => item.isPinned)
    } catch (error) {
      console.error('Failed to load workspace notes:', error)
    } finally {
      isLoading = false
    }
  }

  async function handleAddNote(): Promise<void> {
    if (!newNoteContent.trim()) return

    isAdding = true
    try {
      await window.api.knowledge.add({
        scopeType: 'workspace',
        title: 'Workspace Note',
        summary: newNoteContent.trim(),
        isPinned: true
      })
      newNoteContent = ''
      await loadNotes()
    } catch (error) {
      console.error('Failed to add note:', error)
    } finally {
      isAdding = false
    }
  }

  async function handleRemoveNote(id: string): Promise<void> {
    try {
      await window.api.knowledge.remove(id)
      await loadNotes()
    } catch (error) {
      console.error('Failed to remove note:', error)
    }
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <PinIcon class="h-4 w-4 text-muted-foreground" />
      <h3 class="font-medium text-foreground">Workspace Notes</h3>
    </div>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center py-4">
      <Loader2Icon class="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  {:else}
    <div class="space-y-2">
      {#each notes as note (note.id)}
        <div class="group relative rounded-lg border border-border bg-card p-3">
          <p class="text-sm text-foreground">{note.summary}</p>
          {#if !readonly}
            <button
              onclick={() => handleRemoveNote(note.id)}
              class="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
            >
              <span class="sr-only">Remove</span>
              ×
            </button>
          {/if}
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">No notes yet. Add what your team should know.</p>
      {/each}
    </div>

    {#if !readonly}
      <div class="space-y-2">
        <Textarea
          bind:value={newNoteContent}
          placeholder="What should your team know?"
          rows={2}
          disabled={isAdding}
        />
        <Button
          onclick={handleAddNote}
          disabled={!newNoteContent.trim() || isAdding}
          size="sm"
          class="gap-2"
        >
          {#if isAdding}
            <Loader2Icon class="h-4 w-4 animate-spin" />
          {:else}
            <PlusIcon class="h-4 w-4" />
          {/if}
          Add Note
        </Button>
      </div>
    {/if}
  {/if}
</div>
