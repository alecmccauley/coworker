<script lang="ts">
  import { onMount } from 'svelte'
  import FRENavigation from '../FRENavigation.svelte'
  import FREProgress from '../FREProgress.svelte'
  import LayersIcon from '@lucide/svelte/icons/layers'
  import HashIcon from '@lucide/svelte/icons/hash'
  import UsersIcon from '@lucide/svelte/icons/users'
  import MessageSquareIcon from '@lucide/svelte/icons/message-square'
  import BookOpenIcon from '@lucide/svelte/icons/book-open'

  interface Props {
    totalSections: number
    currentSection: number
    onContinue: () => void
    onBack: () => void
    onSkip: () => void
  }

  let { totalSections, currentSection, onContinue, onBack, onSkip }: Props = $props()

  // Animation states
  let showContent = $state(false)
  let showWorkspace = $state(false)
  let showChannels = $state(false)
  let showCoworkers = $state(false)
  let showThreads = $state(false)
  let showKnowledge = $state(false)

  // Expanded explanation state
  let expandedItem = $state<string | null>(null)

  onMount(() => {
    setTimeout(() => (showContent = true), 100)
    setTimeout(() => (showWorkspace = true), 400)
    setTimeout(() => (showChannels = true), 700)
    setTimeout(() => (showCoworkers = true), 900)
    setTimeout(() => (showKnowledge = true), 1100)
    setTimeout(() => (showThreads = true), 1300)
  })

  function toggleExpanded(item: string): void {
    expandedItem = expandedItem === item ? null : item
  }

  const items = [
    {
      id: 'workspace',
      label: 'Workspace',
      icon: LayersIcon,
      description: 'Your home base. Global context that applies everywhere.',
      color: 'bg-foreground text-background',
      show: () => showWorkspace
    },
    {
      id: 'channels',
      label: 'Channels',
      icon: HashIcon,
      description: 'Project containers. Each one focuses on a topic.',
      color: 'bg-accent/10 text-accent border border-accent/20',
      show: () => showChannels
    },
    {
      id: 'coworkers',
      label: 'Co-workers',
      icon: UsersIcon,
      description: 'AI specialists. Each has expertise and remembers context.',
      color: 'bg-accent/10 text-accent border border-accent/20',
      show: () => showCoworkers
    },
    {
      id: 'knowledge',
      label: 'Knowledge',
      icon: BookOpenIcon,
      description: 'Context and files that make your co-workers smarter.',
      color: 'bg-accent/10 text-accent border border-accent/20',
      show: () => showKnowledge
    },
    {
      id: 'threads',
      label: 'Threads',
      icon: MessageSquareIcon,
      description: 'Conversations. Ask questions, collaborate, get things done.',
      color: 'bg-muted text-muted-foreground',
      show: () => showThreads
    }
  ]
</script>

<!--
  MentalModelSection: Explains the workspace hierarchy

  Visual hierarchy diagram showing:
  Workspace → Channels/Co-workers/Knowledge → Threads
-->
<div
  class="flex w-full max-w-3xl flex-col items-center justify-center text-center transition-all duration-700"
  class:opacity-100={showContent}
  class:opacity-0={!showContent}
  class:translate-y-0={showContent}
  class:translate-y-8={!showContent}
>
  <!-- Header -->
  <div class="mb-12">
    <p class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
      How it works
    </p>
    <h2 class="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl text-balance">
      Everything has a place
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
      Coworker organizes your AI conversations just like you'd organize a team.
    </p>
  </div>

  <!-- Hierarchy diagram -->
  <div class="mb-12 w-full max-w-xl">
    <!-- Workspace (top level) -->
    <div
      class="transition-all duration-500"
      class:opacity-100={showWorkspace}
      class:opacity-0={!showWorkspace}
      class:translate-y-0={showWorkspace}
      class:translate-y-4={!showWorkspace}
    >
      <button
        onclick={() => toggleExpanded('workspace')}
        class="group mx-auto flex items-center gap-3 rounded-xl bg-foreground px-5 py-3 text-background shadow-lg transition-all hover:shadow-xl"
      >
        <LayersIcon class="h-5 w-5" />
        <span class="font-medium">Workspace</span>
      </button>
      {#if expandedItem === 'workspace'}
        <p class="mt-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2">
          Your home base. Global context that applies everywhere.
        </p>
      {/if}
    </div>

    <!-- Connector line -->
    <div
      class="mx-auto my-3 h-6 w-px bg-border transition-all duration-500 delay-200"
      class:opacity-100={showChannels}
      class:opacity-0={!showChannels}
    ></div>

    <!-- Second level: Channels, Co-workers, Knowledge -->
    <div
      class="flex items-start justify-center gap-4 transition-all duration-500"
      class:opacity-100={showChannels}
      class:opacity-0={!showChannels}
      class:translate-y-0={showChannels}
      class:translate-y-4={!showChannels}
    >
      <!-- Channels -->
      <div class="flex flex-col items-center">
        <button
          onclick={() => toggleExpanded('channels')}
          class="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2.5 text-accent transition-all hover:bg-accent/20"
        >
          <HashIcon class="h-4 w-4" />
          <span class="text-sm font-medium">Channels</span>
        </button>
        {#if expandedItem === 'channels'}
          <p class="mt-2 max-w-[140px] text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2">
            Project containers. Each one focuses on a topic.
          </p>
        {/if}
      </div>

      <!-- Co-workers -->
      <div
        class="flex flex-col items-center transition-all duration-500 delay-100"
        class:opacity-100={showCoworkers}
        class:opacity-0={!showCoworkers}
      >
        <button
          onclick={() => toggleExpanded('coworkers')}
          class="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2.5 text-accent transition-all hover:bg-accent/20"
        >
          <UsersIcon class="h-4 w-4" />
          <span class="text-sm font-medium">Co-workers</span>
        </button>
        {#if expandedItem === 'coworkers'}
          <p class="mt-2 max-w-[140px] text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2">
            AI specialists. Each has expertise and remembers context.
          </p>
        {/if}
      </div>

      <!-- Knowledge -->
      <div
        class="flex flex-col items-center transition-all duration-500 delay-200"
        class:opacity-100={showKnowledge}
        class:opacity-0={!showKnowledge}
      >
        <button
          onclick={() => toggleExpanded('knowledge')}
          class="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2.5 text-accent transition-all hover:bg-accent/20"
        >
          <BookOpenIcon class="h-4 w-4" />
          <span class="text-sm font-medium">Knowledge</span>
        </button>
        {#if expandedItem === 'knowledge'}
          <p class="mt-2 max-w-[140px] text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2">
            Context and files that make co-workers smarter.
          </p>
        {/if}
      </div>
    </div>

    <!-- Connector line from Channels to Threads -->
    <div
      class="relative mx-auto my-3 transition-all duration-500 delay-300"
      class:opacity-100={showThreads}
      class:opacity-0={!showThreads}
    >
      <div class="mx-auto h-6 w-px bg-border"></div>
    </div>

    <!-- Threads (bottom level) -->
    <div
      class="flex flex-col items-center transition-all duration-500 delay-300"
      class:opacity-100={showThreads}
      class:opacity-0={!showThreads}
      class:translate-y-0={showThreads}
      class:translate-y-4={!showThreads}
    >
      <button
        onclick={() => toggleExpanded('threads')}
        class="flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-muted-foreground transition-all hover:bg-muted/80"
      >
        <MessageSquareIcon class="h-4 w-4" />
        <span class="text-sm font-medium">Threads</span>
      </button>
      {#if expandedItem === 'threads'}
        <p class="mt-2 max-w-[180px] text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2">
          Conversations. Ask questions, collaborate, get things done.
        </p>
      {/if}
    </div>
  </div>

  <!-- Hint text -->
  <p class="mb-8 text-sm text-muted-foreground">
    Click any item to learn more
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
