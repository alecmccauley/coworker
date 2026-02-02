<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import type { Coworker, CreateCoworkerInput, UpdateCoworkerInput } from '$lib/types'

  interface Props {
    open: boolean
    coworker?: Coworker | null // null = create mode, Coworker = edit mode
    onClose: () => void
    onSave: (input: CreateCoworkerInput | UpdateCoworkerInput) => Promise<void>
  }

  let { open = $bindable(false), coworker = null, onClose, onSave }: Props = $props()

  // Form state
  let name = $state('')
  let description = $state('')
  let isSubmitting = $state(false)
  let error = $state('')

  // Computed
  const isEditMode = $derived(coworker !== null)
  const title = $derived(isEditMode ? 'Edit Co-worker' : 'Create Co-worker')
  const submitLabel = $derived(isEditMode ? 'Save Changes' : 'Create Co-worker')

  // Reset form when dialog opens
  $effect(() => {
    if (open) {
      name = coworker?.name ?? ''
      description = coworker?.description ?? ''
      error = ''
      isSubmitting = false
    }
  })

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault()

    if (!name.trim()) {
      error = 'Name is required'
      return
    }

    isSubmitting = true
    error = ''

    try {
      const input: CreateCoworkerInput | UpdateCoworkerInput = {
        name: name.trim(),
        description: description.trim() || undefined
      }

      await onSave(input)
      open = false
      onClose()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Something went wrong'
    } finally {
      isSubmitting = false
    }
  }

  function handleCancel(): void {
    open = false
    onClose()
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="font-serif text-xl">{title}</Dialog.Title>
      <Dialog.Description>
        {#if isEditMode}
          Update your co-worker's details below.
        {:else}
          Give your new co-worker a name and optional description.
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Name field -->
      <div class="space-y-2">
        <Label for="name">Name</Label>
        <Input
          id="name"
          bind:value={name}
          placeholder="e.g., Research Assistant"
          disabled={isSubmitting}
          class={error && !name.trim() ? 'border-destructive' : ''}
        />
      </div>

      <!-- Description field -->
      <div class="space-y-2">
        <Label for="description">Description (optional)</Label>
        <Textarea
          id="description"
          bind:value={description}
          placeholder="What does this co-worker do?"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <!-- Error message -->
      {#if error}
        <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
          <p class="text-sm text-destructive">{error}</p>
        </div>
      {/if}

      <Dialog.Footer class="gap-2 sm:gap-0">
        <Button variant="outline" type="button" onclick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} class="gap-2">
          {#if isSubmitting}
            <Loader2Icon class="h-4 w-4 animate-spin" />
          {/if}
          {submitLabel}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
