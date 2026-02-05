<script lang="ts">
  import { onMount } from 'svelte'
  import FRENavigation from '../FRENavigation.svelte'
  import FREProgress from '../FREProgress.svelte'
  import LockIcon from '@lucide/svelte/icons/lock'
  import HardDriveIcon from '@lucide/svelte/icons/hard-drive'
  import EyeOffIcon from '@lucide/svelte/icons/eye-off'
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check'

  interface Props {
    totalSections: number
    currentSection: number
    onContinue: () => void
    onBack: () => void
    onSkip: () => void
  }

  let { totalSections, currentSection, onContinue, onBack, onSkip }: Props = $props()

  let showContent = $state(false)
  let showLock = $state(false)
  let showFeatures = $state(false)

  onMount(() => {
    setTimeout(() => (showContent = true), 100)
    setTimeout(() => (showLock = true), 400)
    setTimeout(() => (showFeatures = true), 1200)
  })

  const features = [
    {
      icon: HardDriveIcon,
      title: 'Stored locally',
      description: 'Your workspace lives on your computer, not in the cloud.'
    },
    {
      icon: EyeOffIcon,
      title: 'We can\'t see it',
      description: 'Your files and conversations never leave your machine.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'No training data',
      description: 'Your content is never used to train AI models.'
    }
  ]
</script>

<!--
  PrivacySection: Emphasizes local-first security model

  Visual: Lock icon
  Content: Three key privacy features
-->
<div
  class="flex w-full max-w-2xl flex-col items-center justify-center text-center transition-all duration-700"
  class:opacity-100={showContent}
  class:opacity-0={!showContent}
  class:translate-y-0={showContent}
  class:translate-y-8={!showContent}
>
  <!-- Lock icon -->
  <div class="mb-8">
    <div
      class="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 transition-all duration-700"
      class:scale-100={showLock}
      class:scale-0={!showLock}
    >
      <LockIcon
        class={`h-10 w-10 text-accent transition-all duration-500 delay-200 ${
          showLock ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  </div>

  <!-- Header -->
  <div class="mb-10">
    <p class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
      Privacy by design
    </p>
    <h2 class="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl text-balance">
      Your workspace stays with you
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
      Everything lives on your computer. Your files, conversations, and co-workers.
    </p>
  </div>

  <!-- Features -->
  <div
    class="mb-10 grid w-full max-w-lg gap-4 transition-all duration-700 delay-200"
    class:opacity-100={showFeatures}
    class:opacity-0={!showFeatures}
    class:translate-y-0={showFeatures}
    class:translate-y-4={!showFeatures}
  >
    {#each features as feature}
      <div class="flex items-start gap-4 rounded-xl border border-border bg-card p-4 text-left">
        <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
          <feature.icon class="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p class="font-medium text-foreground">{feature.title}</p>
          <p class="mt-0.5 text-sm text-muted-foreground">{feature.description}</p>
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
