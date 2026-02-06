<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import UpdateSettingsPanel from './UpdateSettingsPanel.svelte'

  interface Props {
    open: boolean
  }

  let { open = $bindable() }: Props = $props()
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Software Updates</Dialog.Title>
      <Dialog.Description>
        Manage Coworker application updates.
      </Dialog.Description>
    </Dialog.Header>
    <UpdateSettingsPanel />
  </Dialog.Content>
</Dialog.Root>
