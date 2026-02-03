<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'
  import CoworkerTemplateSelector from '../coworker/CoworkerTemplateSelector.svelte'
  import CheckIcon from '@lucide/svelte/icons/check'
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'

  interface Template {
    id: string
    slug: string
    name: string
    description: string | null
    rolePrompt: string
  }

  interface Props {
    workspaceName: string
    onComplete: (data: {
      workspaceGoals?: string
      workspacePriorities?: string
      workspacePreferences?: string
      coworkerTemplate?: Template
      coworkerName?: string
      coworkerResponsibility?: string
    }) => void
    onSkip?: () => void
  }

  let { workspaceName, onComplete, onSkip }: Props = $props()

  type Step = 'workspace-basics' | 'first-coworker' | 'coworker-details' | 'complete'
  
  let currentStep = $state<Step>('workspace-basics')

  // Workspace basics
  let workspaceGoals = $state('')
  let workspacePriorities = $state('')
  let workspacePreferences = $state('')

  // Coworker creation
  let selectedTemplate = $state<Template | null>(null)
  let coworkerName = $state('')
  let coworkerResponsibility = $state('')

  function handleWorkspaceBasicsNext(): void {
    currentStep = 'first-coworker'
  }

  function handleTemplateSelect(template: Template): void {
    selectedTemplate = template
    coworkerName = template.name
    currentStep = 'coworker-details'
  }

  function handleSkipTemplate(): void {
    currentStep = 'coworker-details'
  }

  function handleCoworkerDetailsNext(): void {
    currentStep = 'complete'
  }

  function handleComplete(): void {
    onComplete({
      workspaceGoals: workspaceGoals.trim() || undefined,
      workspacePriorities: workspacePriorities.trim() || undefined,
      workspacePreferences: workspacePreferences.trim() || undefined,
      coworkerTemplate: selectedTemplate ?? undefined,
      coworkerName: coworkerName.trim() || undefined,
      coworkerResponsibility: coworkerResponsibility.trim() || undefined
    })
  }
</script>

<div class="mx-auto w-full max-w-2xl px-4 py-8">
  <!-- Progress indicator -->
  <div class="mb-8 flex justify-center gap-2">
    {#each ['workspace-basics', 'first-coworker', 'coworker-details', 'complete'] as step, i}
      <div
        class="h-2 w-8 rounded-full transition-colors"
        class:bg-accent={currentStep === step || (['workspace-basics', 'first-coworker', 'coworker-details', 'complete'].indexOf(currentStep) >= i)}
        class:bg-muted={['workspace-basics', 'first-coworker', 'coworker-details', 'complete'].indexOf(currentStep) < i}
      />
    {/each}
  </div>

  {#if currentStep === 'workspace-basics'}
    <!-- Step 1: Workspace Basics -->
    <div class="space-y-6">
      <div class="text-center">
        <h1 class="font-serif text-3xl font-medium text-foreground">
          Welcome to {workspaceName}
        </h1>
        <p class="mt-2 text-muted-foreground">
          Help your co-workers understand what you're working on. (Optional)
        </p>
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="goals">What are you working on?</Label>
          <Textarea
            id="goals"
            bind:value={workspaceGoals}
            placeholder="e.g., A SaaS product for small businesses..."
            rows={2}
          />
        </div>

        <div class="space-y-2">
          <Label for="priorities">What matters most?</Label>
          <Textarea
            id="priorities"
            bind:value={workspacePriorities}
            placeholder="e.g., Speed to market, user experience, cost efficiency..."
            rows={2}
          />
        </div>

        <div class="space-y-2">
          <Label for="preferences">Any preferences?</Label>
          <Textarea
            id="preferences"
            bind:value={workspacePreferences}
            placeholder="e.g., Keep responses concise, use bullet points..."
            rows={2}
          />
        </div>
      </div>

      <div class="flex justify-center gap-3">
        {#if onSkip}
          <Button variant="ghost" onclick={onSkip}>Skip Setup</Button>
        {/if}
        <Button onclick={handleWorkspaceBasicsNext} class="gap-2">
          Continue
          <ArrowRightIcon class="h-4 w-4" />
        </Button>
      </div>
    </div>
  {:else if currentStep === 'first-coworker'}
    <!-- Step 2: Choose Template -->
    <CoworkerTemplateSelector
      onSelect={handleTemplateSelect}
      onSkip={handleSkipTemplate}
    />
  {:else if currentStep === 'coworker-details'}
    <!-- Step 3: Coworker Details -->
    <div class="space-y-6">
      <div class="text-center">
        <h2 class="font-serif text-2xl font-medium text-foreground">
          {selectedTemplate ? `Customize ${selectedTemplate.name}` : 'Create Your Co-worker'}
        </h2>
        <p class="mt-2 text-muted-foreground">
          Give your co-worker a name and responsibility.
        </p>
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="coworker-name">Name</Label>
          <Input
            id="coworker-name"
            bind:value={coworkerName}
            placeholder="e.g., Marketing, Research, Ops..."
          />
        </div>

        <div class="space-y-2">
          <Label for="responsibility">What are they responsible for?</Label>
          <Textarea
            id="responsibility"
            bind:value={coworkerResponsibility}
            placeholder="e.g., Helping with content creation and social media strategy..."
            rows={2}
          />
        </div>
      </div>

      <div class="flex justify-center gap-3">
        <Button variant="outline" onclick={() => (currentStep = 'first-coworker')}>
          Back
        </Button>
        <Button onclick={handleCoworkerDetailsNext} class="gap-2">
          Continue
          <ArrowRightIcon class="h-4 w-4" />
        </Button>
      </div>
    </div>
  {:else if currentStep === 'complete'}
    <!-- Step 4: Complete -->
    <div class="space-y-6 text-center">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
        <CheckIcon class="h-8 w-8 text-accent" />
      </div>
      
      <div>
        <h2 class="font-serif text-2xl font-medium text-foreground">You're all set!</h2>
        <p class="mt-2 text-muted-foreground">
          Your workspace is ready. Start collaborating with your co-workers.
        </p>
      </div>

      <Button onclick={handleComplete} class="gap-2">
        Get Started
        <ArrowRightIcon class="h-4 w-4" />
      </Button>
    </div>
  {/if}
</div>
