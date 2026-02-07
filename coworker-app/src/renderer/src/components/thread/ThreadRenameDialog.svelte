<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import type { Thread } from '$lib/types'

  interface Props {
    open: boolean
    thread: Thread | null
    onClose: () => void
    onSave: (title: string) => Promise<void>
    isSaving?: boolean
    error?: string | null
  }

  let {
    open = $bindable(),
    thread,
    onClose,
    onSave,
    isSaving = false,
    error = null
  }: Props = $props()

  let titleInput = $state('')
  let localError = $state<string | null>(null)

  $effect(() => {
    if (open) {
      titleInput = thread?.title?.trim() ?? ''
      localError = null
    }
  })

  const normalizedTitle = $derived(titleInput.trim())
  const isValid = $derived(normalizedTitle.length > 0)
  const displayError = $derived(localError ?? error)

  async function handleSave(): Promise<void> {
    if (!isValid) {
      localError = 'Please enter a title.'
      return
    }
    localError = null
    await onSave(normalizedTitle)
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Rename Conversation</Dialog.Title>
      <Dialog.Description>Give this conversation a clear, memorable name.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-2">
      <Label for="thread-title-input">Title</Label>
      <Input
        id="thread-title-input"
        bind:value={titleInput}
        placeholder="Conversation title"
        disabled={isSaving}
      />
      {#if displayError}
        <p class="text-xs text-destructive">{displayError}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={onClose} disabled={isSaving}>
        Cancel
      </Button>
      <Button onclick={handleSave} disabled={!isValid || isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
