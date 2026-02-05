<script lang="ts">
  import { onMount } from 'svelte'
  import type { Snippet } from 'svelte'

  interface Props {
    children: Snippet
    transparentBackdrop?: boolean
  }

  let { children, transparentBackdrop = false }: Props = $props()

  let mounted = $state(false)
  let visible = $state(false)

  // Detect if running on macOS for traffic light spacing
  const isMacOS = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')

  onMount(() => {
    mounted = true
    // Slight delay for entrance animation
    requestAnimationFrame(() => {
      visible = true
    })
  })
</script>

<!--
  FREOverlay: Full-screen overlay container for the First-Run Experience

  Features:
  - Semi-transparent backdrop
  - Ambient terracotta glows
  - Centered content area
  - Draggable title bar for macOS traffic lights
-->
<div
  class="fixed inset-0 z-50 flex flex-col overflow-hidden transition-opacity duration-500"
  class:opacity-100={visible}
  class:opacity-0={!visible}
>
  <!-- Draggable title bar for window controls -->
  <header
    class="titlebar-drag-region fixed left-0 right-0 top-0 z-[60] h-12"
    class:pl-24={isMacOS}
  ></header>

  <!-- Background layer with warm overlay -->
  <div
    class={`absolute inset-0 ${transparentBackdrop ? 'bg-transparent' : 'bg-background'}`}
    aria-hidden="true"
  ></div>

  <!-- Ambient decorations -->
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

    <!-- Center accent glow - very subtle -->
    <div
      class="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-[4000ms] delay-500"
      class:opacity-10={mounted}
      style="background: radial-gradient(circle, oklch(0.65 0.14 25 / 8%), transparent 60%);"
    ></div>
  </div>

  <!-- Content area: top-aligned so tall sections (e.g. Under the hood) stay within scroll range -->
  <main class="relative flex w-full flex-1 min-h-0 flex-col items-center justify-start overflow-y-auto px-8 pt-20 pb-16">
    {@render children()}
  </main>
</div>

<style>
  /* Ensure the overlay doesn't block traffic lights on macOS */
  .titlebar-drag-region {
    -webkit-app-region: drag;
  }
</style>
