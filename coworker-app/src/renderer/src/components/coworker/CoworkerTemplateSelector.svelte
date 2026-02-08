<script lang="ts">
  import { onMount } from 'svelte'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import UserIcon from '@lucide/svelte/icons/user'
  import CheckIcon from '@lucide/svelte/icons/check'
  import { Button } from '$lib/components/ui/button'

  interface Template {
    id: string
    slug: string
    name: string
    description: string | null
    shortDescription: string | null
    rolePrompt: string
    model: string | null
  }

  interface Props {
    onSelect: (template: Template) => void
    onSkip?: () => void
  }

  let { onSelect, onSkip }: Props = $props()

  let templates = $state<Template[]>([])
  let selectedTemplate = $state<Template | null>(null)
  let isLoading = $state(true)

  onMount(async () => {
    try {
      templates = await window.api.templates.list()
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      isLoading = false
    }
  })

  function handleSelect(template: Template): void {
    selectedTemplate = template
  }

  function handleConfirm(): void {
    if (selectedTemplate) {
      onSelect(selectedTemplate)
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="text-center">
    <h2 class="font-serif text-2xl font-medium text-foreground">Choose a Co-worker Template</h2>
    <p class="mt-2 text-muted-foreground">
      Templates give your co-worker a role and personality. Pick one to get started.
    </p>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <Loader2Icon class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  {:else if templates.length === 0}
    <div class="rounded-lg border border-border bg-card p-6 text-center">
      <UserIcon class="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h3 class="mt-4 font-medium text-foreground">No templates available</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        You can create a co-worker from scratch instead.
      </p>
      {#if onSkip}
        <Button onclick={onSkip} class="mt-4">Create from Scratch</Button>
      {/if}
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2">
      {#each templates as template (template.id)}
        <button
          onclick={() => handleSelect(template)}
          class="relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all {selectedTemplate?.id === template.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}"
        >
          {#if selectedTemplate?.id === template.id}
            <div class="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <CheckIcon class="h-3 w-3" />
            </div>
          {/if}
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <UserIcon class="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 class="font-medium text-foreground">{template.name}</h3>
            {#if template.shortDescription}
              <p class="mt-1 text-sm text-muted-foreground line-clamp-2">
                {template.shortDescription}
              </p>
            {/if}
          </div>
        </button>
      {/each}
    </div>

    <div class="flex justify-center gap-3">
      {#if onSkip}
        <Button variant="outline" onclick={onSkip}>
          Create from Scratch
        </Button>
      {/if}
      <Button onclick={handleConfirm} disabled={!selectedTemplate}>
        Continue with {selectedTemplate?.name || 'Template'}
      </Button>
    </div>
  {/if}
</div>
