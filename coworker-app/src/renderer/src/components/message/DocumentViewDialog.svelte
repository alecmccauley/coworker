<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import { renderMarkdown } from '$lib/markdown'

  interface Props {
    open: boolean
    title: string
    blobId: string
  }

  let { open = $bindable(false), title, blobId }: Props = $props()

  let markdownHtml = $state('')
  let loading = $state(false)
  let error = $state('')

  $effect(() => {
    if (open && blobId) {
      loading = true
      error = ''
      markdownHtml = ''
      window.api.blob
        .read(blobId)
        .then((data: Uint8Array | null) => {
          if (data) {
            const text = new TextDecoder().decode(data)
            markdownHtml = renderMarkdown(text)
          } else {
            error = 'Document not found'
          }
        })
        .catch(() => {
          error = 'Failed to load document'
        })
        .finally(() => {
          loading = false
        })
    }
  })
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-3xl max-h-[80vh] flex flex-col">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
    </Dialog.Header>
    <div class="flex-1 overflow-y-auto">
      {#if loading}
        <div class="flex items-center justify-center py-8">
          <span class="text-sm text-muted-foreground">Loading document...</span>
        </div>
      {:else if error}
        <div class="flex items-center justify-center py-8">
          <span class="text-sm text-destructive">{error}</span>
        </div>
      {:else}
        <div class="prose prose-sm max-w-none">
          {@html markdownHtml}
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
