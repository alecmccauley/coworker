<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'
  import type { KnowledgeSourceKind } from '$lib/types'

  interface Props {
    open: boolean
    onClose: () => void
    onAdded: () => Promise<void>
  }

  let { open = $bindable(), onClose, onAdded }: Props = $props()

  let kind = $state<KnowledgeSourceKind>('text')
  let name = $state('')
  let content = $state('')
  let url = $state('')
  let isSubmitting = $state(false)
  let error = $state<string | null>(null)

  $effect(() => {
    if (open) {
      kind = 'text'
      name = ''
      content = ''
      url = ''
      error = null
    }
  })

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault()

    if (kind === 'text' && !content.trim()) {
      error = 'Please add some notes before saving.'
      return
    }

    if (kind === 'url' && !url.trim()) {
      error = 'Please add a link to save.'
      return
    }

    isSubmitting = true
    error = null

    try {
      if (kind === 'text') {
        const blobResult = await window.api.blob.add({
          data: content.trim(),
          mime: 'text/plain'
        })

        await window.api.knowledge.addSource({
          kind: 'text',
          name: name.trim() || 'Text note',
          blobId: blobResult.blob.id,
          metadata: JSON.stringify({
            preview: content.trim().slice(0, 160)
          })
        })
      } else if (kind === 'url') {
        let label = name.trim()
        try {
          if (!label) {
            const parsed = new URL(url.trim())
            label = parsed.hostname
          }
        } catch {
          label = label || 'Link'
        }

        await window.api.knowledge.addSource({
          kind: 'url',
          name: label || 'Link',
          metadata: JSON.stringify({ url: url.trim() })
        })
      }

      await onAdded()
      onClose()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to save this source.'
    } finally {
      isSubmitting = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Add Knowledge Source</Dialog.Title>
      <Dialog.Description>
        Save notes or links so your co-workers can keep context close.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="source-kind">Source type</Label>
        <select
          id="source-kind"
          bind:value={kind}
          class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          disabled={isSubmitting}
        >
          <option value="text">Text notes</option>
          <option value="url">Link</option>
        </select>
      </div>

      <div class="space-y-2">
        <Label for="source-name">Label (optional)</Label>
        <Input
          id="source-name"
          bind:value={name}
          placeholder="e.g., Brand voice notes"
          disabled={isSubmitting}
        />
      </div>

      {#if kind === 'text'}
        <div class="space-y-2">
          <Label for="source-content">Notes</Label>
          <Textarea
            id="source-content"
            bind:value={content}
            placeholder="Paste the key context you want to remember..."
            rows={4}
            disabled={isSubmitting}
          />
        </div>
      {:else if kind === 'url'}
        <div class="space-y-2">
          <Label for="source-url">Link</Label>
          <Input
            id="source-url"
            bind:value={url}
            placeholder="https://example.com"
            disabled={isSubmitting}
          />
        </div>
      {/if}

      {#if error}
        <p class="text-sm text-destructive">{error}</p>
      {/if}

      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save source'}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
