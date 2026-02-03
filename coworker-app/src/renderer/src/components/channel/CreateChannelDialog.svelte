<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'

  interface Props {
    open: boolean
    onClose: () => void
    onSave: (input: { name: string; purpose?: string }) => Promise<void>
  }

  let { open = $bindable(), onClose, onSave }: Props = $props()

  let name = $state('')
  let purpose = $state('')
  let isSubmitting = $state(false)
  let error = $state<string | null>(null)

  $effect(() => {
    if (open) {
      // Reset form when dialog opens
      name = ''
      purpose = ''
      error = null
    }
  })

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault()
    
    if (!name.trim()) {
      error = 'Channel name is required'
      return
    }

    isSubmitting = true
    error = null

    try {
      await onSave({
        name: name.trim(),
        purpose: purpose.trim() || undefined
      })
      onClose()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create channel'
    } finally {
      isSubmitting = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Create Channel</Dialog.Title>
      <Dialog.Description>
        Channels are project containers where you organize conversations.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="channel-name">What are you working on?</Label>
        <Input
          id="channel-name"
          bind:value={name}
          placeholder="e.g., Marketing Campaign"
          disabled={isSubmitting}
        />
      </div>

      <div class="space-y-2">
        <Label for="channel-purpose">Purpose (optional)</Label>
        <Textarea
          id="channel-purpose"
          bind:value={purpose}
          placeholder="A brief description of this project..."
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      {#if error}
        <p class="text-sm text-destructive">{error}</p>
      {/if}

      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Channel'}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
