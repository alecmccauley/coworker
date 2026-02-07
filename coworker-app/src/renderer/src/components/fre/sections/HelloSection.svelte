<script lang="ts">
  import { onMount } from 'svelte'

  interface Props {
    workspaceName: string
    onContinue: () => void
  }

  let { workspaceName, onContinue }: Props = $props()

  // Staggered animation states (Apple "Hello" inspired)
  let showDot = $state(false)
  let showGlow = $state(false)
  let showHello = $state(false)
  let helloExiting = $state(false)
  let showWorkspaceName = $state(false)
  let showSubtitle = $state(false)
  let showLine = $state(false)
  let showContinue = $state(false)

  onMount(() => {
    // Orchestrated reveal sequence
    setTimeout(() => (showDot = true), 500)
    setTimeout(() => (showGlow = true), 1500)
    setTimeout(() => (showHello = true), 1800)
    // Slide "Hello." up and out, then slide workspace name in (no crossfade)
    setTimeout(() => (helloExiting = true), 4000)
    setTimeout(() => (showWorkspaceName = true), 4600)
    setTimeout(() => (showSubtitle = true), 5600)
    setTimeout(() => (showLine = true), 6400)
    setTimeout(() => (showContinue = true), 7100)
  })
</script>

<!--
  HelloSection: The "Hello" moment - Apple-inspired welcome

  Animation sequence:
  1. Terracotta dot appears center
  2. Dot pulses and expands into glow
  3. "Hello." appears
  4. Fades to workspace name
  5. Subtitle appears
  6. Continue button reveals
-->
<div class="flex w-full max-w-2xl flex-col items-center justify-center text-center">
  <!-- Central dot/glow animation -->
  <div class="relative mb-12 flex h-24 w-24 items-center justify-center">
    <!-- Initial dot -->
    <div
      class="absolute h-4 w-4 rounded-full bg-accent transition-all duration-1000"
      class:opacity-100={showDot && !showGlow}
      class:opacity-0={!showDot || showGlow}
      class:scale-100={showDot}
      class:scale-0={!showDot}
    ></div>

    <!-- Expanded glow -->
    <div
      class="absolute h-24 w-24 rounded-full transition-all duration-1000"
      class:opacity-40={showGlow}
      class:opacity-0={!showGlow}
      class:scale-100={showGlow}
      class:scale-0={!showGlow}
      style="background: radial-gradient(circle, oklch(0.65 0.14 25 / 50%), transparent 70%);"
    ></div>

    <!-- Pulsing ring -->
    <div
      class="absolute h-16 w-16 rounded-full border-2 border-accent/30 transition-all duration-1000"
      class:opacity-100={showGlow}
      class:opacity-0={!showGlow}
      class:animate-ping={showGlow && !showWorkspaceName}
    ></div>
  </div>

  <!-- "Hello." text -->
  <h1
    class="absolute font-serif text-8xl font-medium tracking-tight text-foreground transition-all duration-700 ease-out md:text-9xl"
    class:opacity-100={showHello && !helloExiting}
    class:opacity-0={!showHello || helloExiting}
    class:translate-y-0={showHello && !helloExiting}
    class:translate-y-8={!showHello && !helloExiting}
    class:-translate-y-12={helloExiting}
  >
    Hello.
  </h1>

  <!-- Workspace name -->
  <div
    class="transition-all duration-700 ease-out"
    class:opacity-100={showWorkspaceName}
    class:opacity-0={!showWorkspaceName}
    class:translate-y-0={showWorkspaceName}
    class:translate-y-8={!showWorkspaceName}
  >
    <!-- Overline -->
    <p class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
      Welcome to
    </p>

    <!-- Workspace name as hero -->
    <h1 class="font-serif text-6xl font-medium tracking-tight text-foreground md:text-7xl text-balance">
      {workspaceName}
    </h1>
  </div>

  <!-- Subtitle -->
  <p
    class="mt-6 max-w-md text-lg text-muted-foreground transition-all duration-1000 ease-out"
    class:opacity-100={showSubtitle}
    class:opacity-0={!showSubtitle}
    class:translate-y-0={showSubtitle}
    class:translate-y-4={!showSubtitle}
  >
    Your workspace is ready. Let's take a quick look at what you can do here.
  </p>

  <!-- Decorative line -->
  <div
    class="mx-auto mt-12 h-px w-24 origin-center transition-all duration-1000 ease-out"
    class:w-24={showLine}
    class:w-0={!showLine}
    class:opacity-100={showLine}
    class:opacity-0={!showLine}
    style="background: linear-gradient(90deg, transparent, oklch(0.65 0.14 25 / 50%), transparent);"
  ></div>

  <!-- Continue button -->
  <div
    class="mt-12 transition-all duration-1000 ease-out"
    class:opacity-100={showContinue}
    class:opacity-0={!showContinue}
    class:translate-y-0={showContinue}
    class:translate-y-4={!showContinue}
  >
    <button
      onclick={onContinue}
      disabled={!showContinue}
      class="group flex items-center gap-2 rounded-full border border-border bg-card/80 px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-all hover:border-accent hover:bg-card hover:text-accent disabled:pointer-events-none disabled:opacity-0"
    >
      Let's take a quick look around
      <svg
        class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>

<style>
  @keyframes ping {
    75%, 100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  .animate-ping {
    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
</style>
