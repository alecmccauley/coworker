<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    children: Snippet
    headerActions?: Snippet
    fullWidth?: boolean
  }

  let { children, headerActions, fullWidth = false }: Props = $props()

  // Detect if running on macOS for traffic light spacing
  const isMacOS = navigator.platform.toLowerCase().includes('mac')
</script>

<!--
  AppShell: Premium macOS-native app container
  
  Provides:
  - Draggable title bar region for frameless window
  - Traffic light button spacing on macOS
  - Glass-like translucent background
  - Proper content padding and layout
-->
<div class="app-shell flex h-screen flex-col overflow-hidden">
  <!-- Draggable Title Bar Region -->
  <header
    class="titlebar-drag-region flex h-12 shrink-0 items-center gap-3 border-b border-border/50 px-4"
    class:pl-24={isMacOS}
  >
    <h1 class="font-serif text-lg font-medium tracking-tight text-foreground">
      Coworker
    </h1>
    <span class="flex-1" />
    {#if headerActions}
      <div class="titlebar-no-drag flex items-center gap-2">
        {@render headerActions()}
      </div>
    {/if}
  </header>

  <!-- Main Content Area -->
  <main class="flex min-h-0 flex-1 overflow-hidden">
    {#if fullWidth}
      {@render children()}
    {:else}
      <div class="mx-auto max-w-6xl flex-1 overflow-auto px-6 py-8">
        {@render children()}
      </div>
    {/if}
  </main>
</div>

<style>
  .app-shell {
    /* Subtle background for glass effect when vibrancy is active */
    background-color: oklch(0.975 0.005 85 / 85%);
  }

  :global(.dark) .app-shell {
    background-color: oklch(0.16 0.01 60 / 85%);
  }
</style>
