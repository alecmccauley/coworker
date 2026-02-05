<script lang="ts">
  import { onMount } from 'svelte'
  import FRENavigation from '../FRENavigation.svelte'
  import FREProgress from '../FREProgress.svelte'
  import LayersIcon from '@lucide/svelte/icons/layers'
  import HashIcon from '@lucide/svelte/icons/hash'
  import UserIcon from '@lucide/svelte/icons/user'
  import MessageSquareIcon from '@lucide/svelte/icons/message-square'

  interface Props {
    totalSections: number
    currentSection: number
    onContinue: () => void
    onBack: () => void
    onSkip: () => void
  }

  let { totalSections, currentSection, onContinue, onBack, onSkip }: Props = $props()

  let showContent = $state(false)
  let selectedScope = $state<string | null>(null)

  const scopes = [
    {
      id: 'workspace',
      label: 'Workspace',
      icon: LayersIcon,
      description: 'Company info, style guides',
      detail: 'Knowledge at the workspace level is available everywhere. Use it for things every co-worker should know.',
      example: 'Brand guidelines, company policies, team structure'
    },
    {
      id: 'channel',
      label: 'Channel',
      icon: HashIcon,
      description: 'Project docs, requirements',
      detail: 'Channel knowledge applies to a specific topic. Co-workers in that channel will have this context.',
      example: 'Project specs, API docs, meeting notes'
    },
    {
      id: 'coworker',
      label: 'Co-worker',
      icon: UserIcon,
      description: 'Role instructions, playbooks',
      detail: 'Personal knowledge for a specific co-worker. Shapes their expertise and how they respond.',
      example: 'Writing style guide, domain expertise, preferred tools'
    },
    {
      id: 'thread',
      label: 'Thread',
      icon: MessageSquareIcon,
      description: 'One-time context',
      detail: 'Temporary knowledge for a single conversation. Perfect for files you need to discuss once.',
      example: 'A specific document to review, code to analyze'
    }
  ]

  onMount(() => {
    setTimeout(() => (showContent = true), 100)
  })
</script>

<!--
  KnowledgeGuideSection: Explains the four knowledge scopes

  Visual: Four-quadrant diagram showing:
  - Workspace (global)
  - Channel (topic-specific)
  - Co-worker (personal)
  - Thread (temporary)
-->
<div
  class="flex w-full max-w-3xl flex-col items-center justify-center text-center transition-all duration-700"
  class:opacity-100={showContent}
  class:opacity-0={!showContent}
  class:translate-y-0={showContent}
  class:translate-y-8={!showContent}
>
  <!-- Header -->
  <div class="mb-10">
    <p class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
      Knowledge scopes
    </p>
    <h2 class="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl text-balance">
      Give your co-workers context
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
      Add files and notes at different levels to help your co-workers understand your world.
    </p>
  </div>

  <!-- Four-quadrant grid -->
  <div class="mb-8 grid w-full max-w-2xl grid-cols-2 gap-4">
    {#each scopes as scope (scope.id)}
      <button
        onclick={() => selectedScope = selectedScope === scope.id ? null : scope.id}
        class={`group flex flex-col items-start rounded-xl border p-5 text-left transition-all ${
          selectedScope === scope.id
            ? 'border-accent bg-accent/5'
            : 'border-border bg-card hover:border-accent/50'
        }`}
      >
        <div class="mb-3 flex items-center gap-3">
          <div
            class={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              selectedScope === scope.id
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground group-hover:bg-accent/20'
            }`}
          >
            <scope.icon class="h-5 w-5" />
          </div>
          <div>
            <p class="font-medium text-foreground">{scope.label}</p>
            <p class="text-sm text-muted-foreground">{scope.description}</p>
          </div>
        </div>

        {#if selectedScope === scope.id}
          <div class="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <p class="text-sm text-foreground">
              {scope.detail}
            </p>
            <p class="mt-2 text-xs text-muted-foreground">
              <span class="font-medium">Example:</span> {scope.example}
            </p>
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Hint -->
  <p class="mb-8 text-sm text-muted-foreground">
    Click each scope to learn more
  </p>

  <!-- Progress and navigation -->
  <div class="mt-auto w-full max-w-md space-y-6">
    <div class="flex justify-center">
      <FREProgress {totalSections} {currentSection} />
    </div>
    <FRENavigation
      showBack={true}
      showSkip={true}
      showContinue={true}
      onBack={onBack}
      onSkip={onSkip}
      onContinue={onContinue}
    />
  </div>
</div>

<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-in-from-top-2 {
    from { transform: translateY(-0.5rem); }
    to { transform: translateY(0); }
  }

  .animate-in {
    animation: fade-in 0.3s ease-out, slide-in-from-top-2 0.3s ease-out;
  }
</style>
