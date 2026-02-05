<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import FRENavigation from '../FRENavigation.svelte'
  import FREProgress from '../FREProgress.svelte'
  import { driver, type DriveStep, type Driver } from 'driver.js'
  import 'driver.js/dist/driver.css'

  interface Props {
    totalSections: number
    currentSection: number
    onContinue: () => void
    onBack: () => void
    onSkip: () => void
    onTourStateChange?: (isActive: boolean) => void
  }

  let { totalSections, currentSection, onContinue, onBack, onSkip, onTourStateChange }: Props = $props()

  let showContent = $state(false)
  let tourStarted = $state(false)
  let tourCompleted = $state(false)
  let driverInstance: Driver | null = null

  onMount(() => {
    setTimeout(() => (showContent = true), 100)
  })

  onDestroy(() => {
    if (driverInstance) {
      driverInstance.destroy()
    }
    onTourStateChange?.(false)
  })

  const TOUR_FADE_MS = 300

  function startTour(): void {
    tourStarted = true
    onTourStateChange?.(true)

    const steps: DriveStep[] = [
      {
        element: '[data-fre="sidebar"]',
        popover: {
          title: 'Your Command Center',
          description: 'Channels and co-workers live here. Think of it as your team directory.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '[data-fre="channels"]',
        popover: {
          title: 'Channels',
          description: 'Organize conversations by topic or project. Like rooms in an office.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '[data-fre="coworkers"]',
        popover: {
          title: 'Co-workers',
          description: 'Your AI teammates. Each one has a specialty and remembers your context.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '[data-fre="settings"]',
        popover: {
          title: 'Settings',
          description: 'Configure your workspace, manage knowledge, and customize the experience.',
          side: 'bottom',
          align: 'end'
        }
      }
    ]

    const overlayOpacity = 0.2
    // #region agent log
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    fetch('http://127.0.0.1:7242/ingest/110516fa-2f6a-4c88-8d7b-9639e803203f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'UIOrientationSection.svelte:driverConfig', message: 'FRE tour driver config', data: { overlayOpacity, isDark }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H3,H4' }) }).catch(() => {})
    // #endregion

    driverInstance = driver({
      showProgress: true,
      animate: true,
      showButtons: ['next', 'previous'],
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      overlayOpacity,
      steps,
      onDestroyStarted: () => {
        tourCompleted = true
        onTourStateChange?.(false)
        driverInstance?.destroy()
      }
    })

    // Start spotlight after "Let's look around" fades out for a smooth handoff
    setTimeout(() => {
      driverInstance?.drive()
    }, TOUR_FADE_MS)

    // #region agent log
    setTimeout(() => {
      const overlay = document.querySelector('.driver-overlay')
      const stage = document.querySelector('.driver-stage')
      const overlayStyle = overlay ? getComputedStyle(overlay) : null
      const stageStyle = stage ? getComputedStyle(stage) : null
      fetch('http://127.0.0.1:7242/ingest/110516fa-2f6a-4c88-8d7b-9639e803203f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'UIOrientationSection.svelte:computedStyles', message: 'FRE Driver overlay/stage computed styles', data: { overlayBackground: overlayStyle?.background ?? overlayStyle?.backgroundColor, overlayOpacity: overlayStyle?.opacity, stageBoxShadow: stageStyle?.boxShadow, stageBackground: stageStyle?.backgroundColor }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1,H2,H5' }) }).catch(() => {})
    }, 400)
    // #endregion
  }

  function handleContinue(): void {
    if (driverInstance) {
      driverInstance.destroy()
    }
    onTourStateChange?.(false)
    onContinue()
  }
</script>

<!--
  UIOrientationSection: Spotlight tour of the UI using Driver.js

  Takes the user through the main UI elements:
  - Sidebar (command center)
  - Channels section
  - Co-workers section
  - Settings button
-->
<div
  class="flex w-full max-w-2xl flex-col items-center justify-center text-center transition-all duration-700"
  class:opacity-100={showContent && !(tourStarted && !tourCompleted)}
  class:opacity-0={!showContent || (tourStarted && !tourCompleted)}
  class:translate-y-0={showContent}
  class:translate-y-8={!showContent}
  class:pointer-events-none={tourStarted && !tourCompleted}
  class:duration-300={(tourStarted || tourCompleted)}
  class:duration-700={!tourStarted && !tourCompleted}
  class:ease-out={(tourStarted || tourCompleted)}
>
  <!-- Header (hidden during spotlight tour so only Driver popover + highlighted UI show) -->
  <div class="mb-12">
    <p class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
      Quick tour
    </p>
    <h2 class="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl text-balance">
      Let's look around
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
      {#if !tourStarted}
        We'll highlight the key parts of the interface so you know where everything is.
      {:else if tourCompleted}
        You've seen the essentials. Ready to continue?
      {:else}
        Follow the highlights to learn the interface.
      {/if}
    </p>
  </div>

  <!-- Tour status / Start button -->
  <div class="mb-12">
    {#if !tourStarted}
      <button
        onclick={startTour}
        class="group flex items-center gap-3 rounded-xl bg-accent px-6 py-4 text-accent-foreground shadow-lg transition-all hover:shadow-xl hover:opacity-90"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span class="font-medium">Start the tour</span>
      </button>
    {:else if tourCompleted}
      <div class="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/10 px-6 py-4 text-accent">
        <svg
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span class="font-medium">Tour complete!</span>
      </div>
    {:else}
      <p class="text-sm text-muted-foreground">
        Tour in progress...
      </p>
    {/if}
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
      continueLabel={tourCompleted || tourStarted ? 'Continue' : 'Skip tour'}
      onBack={onBack}
      onSkip={onSkip}
      onContinue={handleContinue}
    />
  </div>
</div>
