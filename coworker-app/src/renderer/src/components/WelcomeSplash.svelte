<script lang="ts">
  import { onMount } from 'svelte'

  // Staggered animation states
  let mounted = $state(false)
  let showGreeting = $state(false)
  let showName = $state(false)
  let showMessage = $state(false)
  let showTagline = $state(false)

  onMount(() => {
    mounted = true
    // Staggered reveal for a delightful entrance
    setTimeout(() => (showGreeting = true), 300)
    setTimeout(() => (showName = true), 800)
    setTimeout(() => (showMessage = true), 1400)
    setTimeout(() => (showTagline = true), 2200)
  })

  // Detect if running on macOS for traffic light spacing
  const isMacOS = navigator.platform.toLowerCase().includes('mac')
</script>

<!--
  WelcomeSplash: A premium welcome experience for our first user

  Designed to evoke:
  - Clarity, not complexity
  - Partnership, not performance
  - Delight, not just utility
-->
<div class="splash-container flex min-h-screen flex-col">
  <!-- Invisible draggable title bar for window controls -->
  <header
    class="titlebar-drag-region fixed left-0 right-0 top-0 z-50 h-12"
    class:pl-24={isMacOS}
  ></header>

  <!-- Main content - perfectly centered -->
  <main class="flex flex-1 flex-col items-center justify-center px-8">
    <div class="max-w-2xl text-center">

      <!-- Decorative accent line -->
      <div
        class="mx-auto mb-12 h-px w-16 origin-center transition-all duration-1000 ease-out"
        class:w-16={mounted}
        class:opacity-100={mounted}
        class:opacity-0={!mounted}
        style="background: linear-gradient(90deg, transparent, oklch(0.65 0.14 25), transparent);"
      ></div>

      <!-- Greeting -->
      <p
        class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground transition-all duration-700 ease-out"
        class:opacity-100={showGreeting}
        class:opacity-0={!showGreeting}
        class:translate-y-0={showGreeting}
        class:translate-y-4={!showGreeting}
      >
        Welcome
      </p>

      <!-- Name - the hero moment -->
      <h1
        class="mb-6 font-serif text-7xl font-medium tracking-tight text-foreground transition-all duration-1000 ease-out md:text-8xl"
        class:opacity-100={showName}
        class:opacity-0={!showName}
        class:translate-y-0={showName}
        class:translate-y-6={!showName}
      >
        <span class="text-accent">Joie</span>
      </h1>

      <!-- Main message -->
      <p
        class="mb-8 font-serif text-2xl font-normal leading-relaxed text-foreground/90 transition-all duration-1000 ease-out md:text-3xl"
        class:opacity-100={showMessage}
        class:opacity-0={!showMessage}
        class:translate-y-0={showMessage}
        class:translate-y-4={!showMessage}
      >
        We are so happy to have you.
        <br />
        <span class="text-foreground">Great things lie ahead.</span>
      </p>

      <!-- Decorative accent line -->
      <div
        class="mx-auto mt-12 mb-8 h-px w-24 transition-all duration-1000 ease-out delay-500"
        class:opacity-100={showMessage}
        class:opacity-0={!showMessage}
        style="background: linear-gradient(90deg, transparent, oklch(0.65 0.14 25 / 50%), transparent);"
      ></div>

      <!-- Tagline -->
      <p
        class="font-sans text-sm text-muted-foreground transition-all duration-1000 ease-out"
        class:opacity-100={showTagline}
        class:opacity-0={!showTagline}
        class:translate-y-0={showTagline}
        class:translate-y-2={!showTagline}
      >
        Where AI feels like a team you already know how to work with.
      </p>

    </div>
  </main>

  <!-- Subtle ambient decoration -->
  <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
    <!-- Top-right warm glow -->
    <div
      class="absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-0 blur-3xl transition-opacity duration-[3000ms]"
      class:opacity-30={mounted}
      style="background: radial-gradient(circle, oklch(0.65 0.14 25 / 15%), transparent 70%);"
    ></div>

    <!-- Bottom-left subtle glow -->
    <div
      class="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full opacity-0 blur-3xl transition-opacity duration-[3000ms] delay-1000"
      class:opacity-20={mounted}
      style="background: radial-gradient(circle, oklch(0.65 0.14 25 / 10%), transparent 70%);"
    ></div>
  </div>
</div>

<style>
  .splash-container {
    /* Warm cream background matching brand */
    background-color: oklch(0.975 0.005 85);
  }

  :global(.dark) .splash-container {
    background-color: oklch(0.16 0.01 60);
  }
</style>
