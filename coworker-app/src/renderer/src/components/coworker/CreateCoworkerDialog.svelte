<script lang="ts">
  import { onMount } from 'svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import UserIcon from '@lucide/svelte/icons/user'
  import CheckIcon from '@lucide/svelte/icons/check'
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
  import type { CreateCoworkerInput } from '$lib/types'

  interface Template {
    id: string
    slug: string
    name: string
    description: string | null
    rolePrompt: string
    defaultBehaviors: {
      tone?: string
      formatting?: string
      guardrails?: string[]
    } | null
    version: number
  }

  interface Props {
    open: boolean
    onClose: () => void
    onSave: (input: CreateCoworkerInput) => Promise<void>
  }

  let { open = $bindable(false), onClose, onSave }: Props = $props()

  // Step state: 'template' or 'customize'
  type Step = 'template' | 'customize'
  let currentStep = $state<Step>('template')

  // Template state
  let templates = $state<Template[]>([])
  let selectedTemplate = $state<Template | null>(null)
  let isLoadingTemplates = $state(true)

  // Form state
  let name = $state('')
  let isSubmitting = $state(false)
  let error = $state('')

  // Load templates when dialog opens
  $effect(() => {
    if (open) {
      currentStep = 'template'
      selectedTemplate = null
      name = ''
      error = ''
      isSubmitting = false
      loadTemplates()
    }
  })

  async function loadTemplates(): Promise<void> {
    isLoadingTemplates = true
    try {
      templates = (await window.api.templates.list()) as Template[]
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      isLoadingTemplates = false
    }
  }

  function handleSelectTemplate(template: Template): void {
    selectedTemplate = template
  }

  function handleContinueWithTemplate(): void {
    if (selectedTemplate) {
      name = selectedTemplate.name
      currentStep = 'customize'
    }
  }

  function handleCreateFromScratch(): void {
    selectedTemplate = null
    name = ''
    currentStep = 'customize'
  }

  function handleBack(): void {
    currentStep = 'template'
    error = ''
  }

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault()

    if (!name.trim()) {
      error = 'Name is required'
      return
    }

    isSubmitting = true
    error = ''

    try {
      const input: CreateCoworkerInput = {
        name: name.trim()
      }

      // Add template data if a template was selected
      if (selectedTemplate) {
        input.rolePrompt = selectedTemplate.rolePrompt
        input.defaultsJson = selectedTemplate.defaultBehaviors
          ? JSON.stringify(selectedTemplate.defaultBehaviors)
          : undefined
        input.templateId = selectedTemplate.id
        input.templateVersion = selectedTemplate.version
        input.templateDescription = selectedTemplate.description ?? undefined
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
  <Dialog.Content class="sm:max-w-xl">
    {#if currentStep === 'template'}
      <!-- Step 1: Template Selection -->
      <Dialog.Header>
        <Dialog.Title class="font-serif text-xl">Create a Co-worker</Dialog.Title>
        <Dialog.Description>
          Choose a template to give your co-worker a role and personality, or start from scratch.
        </Dialog.Description>
      </Dialog.Header>

      <div class="py-4">
        {#if isLoadingTemplates}
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
          </div>
        {:else}
          <div class="grid gap-3 sm:grid-cols-2">
            {#each templates as template (template.id)}
              <button
                onclick={() => handleSelectTemplate(template)}
                class="relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all {selectedTemplate?.id ===
                template.id
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/50'}"
              >
                {#if selectedTemplate?.id === template.id}
                  <div
                    class="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground"
                  >
                    <CheckIcon class="h-3 w-3" />
                  </div>
                {/if}
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <UserIcon class="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 class="font-medium text-foreground">{template.name}</h3>
                  {#if template.description}
                    <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <Dialog.Footer class="gap-2 sm:gap-0">
        <Button variant="outline" onclick={handleCreateFromScratch}>Create from Scratch</Button>
        <Button onclick={handleContinueWithTemplate} disabled={!selectedTemplate}>
          Continue with {selectedTemplate?.name || 'Template'}
        </Button>
      </Dialog.Footer>
    {:else}
      <!-- Step 2: Customize Name -->
      <Dialog.Header>
        <Dialog.Title class="font-serif text-xl">
          {#if selectedTemplate}
            Customize Your Co-worker
          {:else}
            Create a Co-worker
          {/if}
        </Dialog.Title>
        <Dialog.Description>
          {#if selectedTemplate}
            Give your {selectedTemplate.name} a custom name, or keep the default.
          {:else}
            Give your new co-worker a name to get started.
          {/if}
        </Dialog.Description>
      </Dialog.Header>

      <form onsubmit={handleSubmit} class="space-y-4 py-4">
        {#if selectedTemplate}
          <div class="rounded-lg border border-border bg-muted/30 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <UserIcon class="h-4 w-4 text-accent" />
              </div>
              <div>
                <p class="text-sm font-medium text-foreground">Based on {selectedTemplate.name}</p>
                {#if selectedTemplate.description}
                  <p class="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <div class="space-y-2">
          <Label for="coworker-name">Name</Label>
          <Input
            id="coworker-name"
            bind:value={name}
            placeholder={selectedTemplate ? selectedTemplate.name : 'e.g., Research Assistant'}
            disabled={isSubmitting}
            class={error && !name.trim() ? 'border-destructive' : ''}
          />
        </div>

        {#if error}
          <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
            <p class="text-sm text-destructive">{error}</p>
          </div>
        {/if}
      </form>

      <Dialog.Footer class="gap-2 sm:gap-0">
        <Button variant="ghost" onclick={handleBack} disabled={isSubmitting}>
          <ArrowLeftIcon class="mr-2 h-4 w-4" />
          Back
        </Button>
        <div class="flex-1"></div>
        <Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>Cancel</Button>
        <Button onclick={handleSubmit} disabled={isSubmitting} class="gap-2">
          {#if isSubmitting}
            <Loader2Icon class="h-4 w-4 animate-spin" />
          {/if}
          Create Co-worker
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
