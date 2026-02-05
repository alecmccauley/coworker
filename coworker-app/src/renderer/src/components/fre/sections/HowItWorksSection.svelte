<script lang="ts">
  import { onMount } from 'svelte'
  import FRENavigation from '../FRENavigation.svelte'
  import FREProgress from '../FREProgress.svelte'
  import BookOpenIcon from '@lucide/svelte/icons/book-open'
  import MessageSquareIcon from '@lucide/svelte/icons/message-square'
  import BrainIcon from '@lucide/svelte/icons/brain'
  import SparklesIcon from '@lucide/svelte/icons/sparkles'

  interface Props {
    totalSections: number
    currentSection: number
    onContinue: () => void
    onBack: () => void
    onSkip: () => void
  }

  let { totalSections, currentSection, onContinue, onBack, onSkip }: Props = $props()

  let showContent = $state(false)
  let showStep1 = $state(false)
  let showStep2 = $state(false)
  let showStep3 = $state(false)
  let showStep4 = $state(false)

  onMount(() => {
    setTimeout(() => (showContent = true), 100)
    setTimeout(() => (showStep1 = true), 400)
    setTimeout(() => (showStep2 = true), 700)
    setTimeout(() => (showStep3 = true), 1000)
    setTimeout(() => (showStep4 = true), 1300)
  })

  const steps = [
    {
      icon: BookOpenIcon,
      title: 'They read what you share',
      description: 'Upload documents, paste text, or add files. Your co-workers study everything.',
      show: () => showStep1
    },
    {
      icon: MessageSquareIcon,
      title: 'They remember conversations',
      description: 'Every thread builds context. They learn your preferences and past decisions.',
      show: () => showStep2
    },
    {
      icon: BrainIcon,
      title: 'They get better over time',
      description: 'The more you work together, the more they understand your world.',
      show: () => showStep3
    },
    {
      icon: SparklesIcon,
      title: 'They stay in their lane',
      description: "Each co-worker has a specialty. They know what they're good at.",
      show: () => showStep4
    }
  ]
</script>

<!--
  HowItWorksSection: Non-technical explanation of how co-workers work

  Explains in human terms:
  - They read your content
  - They remember conversations
  - They improve over time
  - They have specialties
-->
<!-- self-center so section is centered horizontally but sizes to content height (full section in scroll range) -->
<div
  class="flex w-full max-w-2xl flex-shrink-0 flex-col items-center justify-start text-center transition-all duration-700 self-center pt-12 pb-12"
  class:opacity-100={showContent}
  class:opacity-0={!showContent}
  class:translate-y-0={showContent}
  class:translate-y-8={!showContent}
>
  <!-- Header -->
  <div class="mb-12">
    <p class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
      Under the hood
    </p>
    <h2 class="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl text-balance">
      They're not magic. They're teammates.
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
      Think of them as brilliant colleagues who never forget anything.
    </p>
  </div>

  <!-- Steps -->
  <div class="mb-12 w-full max-w-lg space-y-4">
    {#each steps as step}
      <div
        class="flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all duration-500"
        class:opacity-100={step.show()}
        class:opacity-0={!step.show()}
        class:translate-x-0={step.show()}
        class:-translate-x-4={!step.show()}
      >
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <step.icon class="h-5 w-5 text-accent" />
        </div>
        <div>
          <p class="font-medium text-foreground">{step.title}</p>
          <p class="mt-1 text-sm text-muted-foreground">{step.description}</p>
        </div>
      </div>
    {/each}
  </div>

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
