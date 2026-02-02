<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import { Button } from '$lib/components/ui/button'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import type { Coworker } from '$lib/types'

  interface Props {
    open: boolean
    coworker: Coworker | null
    onClose: () => void
    onConfirm: () => Promise<void>
  }

  let { open = $bindable(false), coworker, onClose, onConfirm }: Props = $props()

  let isDeleting = $state(false)

  async function handleConfirm(): Promise<void> {
    isDeleting = true
    try {
      await onConfirm()
      open = false
      onClose()
    } finally {
      isDeleting = false
    }
  }

  function handleCancel(): void {
    open = false
    onClose()
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Co-worker</AlertDialog.Title>
      <AlertDialog.Description>
        {#if coworker}
          Are you sure you want to delete <strong>{coworker.name}</strong>? This action cannot be
          undone.
        {:else}
          Are you sure you want to delete this co-worker? This action cannot be undone.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel asChild>
        <Button variant="outline" onclick={handleCancel} disabled={isDeleting}>
          Cancel
        </Button>
      </AlertDialog.Cancel>
      <AlertDialog.Action asChild>
        <Button variant="destructive" onclick={handleConfirm} disabled={isDeleting} class="gap-2">
          {#if isDeleting}
            <Loader2Icon class="h-4 w-4 animate-spin" />
          {/if}
          Delete
        </Button>
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
