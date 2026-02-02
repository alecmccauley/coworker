<script lang="ts">
  import { onMount } from 'svelte'
  import { helloApi } from '$lib/api'
  import type { HelloData } from '@coworker/shared-services'
  import { Button } from '$lib/components/ui/button'

  // Staggered animation states
  let mounted = $state(false)
  let showGreeting = $state(false)
  let showName = $state(false)
  let showMessage = $state(false)
  let showTagline = $state(false)

  // Debug panel state
  let showDebugPanel = $state(false)
  let isTestingApi = $state(false)
  let apiTestResult = $state<HelloData | null>(null)
  let apiTestError = $state<string | null>(null)
  let apiUrl = $state<string | null>(null)

  onMount(() => {
    // Fetch API URL for debug panel
    window.api.config.getApiUrl().then((url) => {
      apiUrl = url
    })
    mounted = true
    // Staggered reveal for a delightful entrance
    setTimeout(() => (showGreeting = true), 300)
    setTimeout(() => (showName = true), 800)
    setTimeout(() => (showMessage = true), 1400)
    setTimeout(() => (showTagline = true), 2200)
  })

  // Detect if running on macOS for traffic light spacing
  const isMacOS = navigator.platform.toLowerCase().includes('mac')

  async function testApiConnection() {
    isTestingApi = true
    apiTestResult = null
    apiTestError = null

    try {
      const result = await helloApi.sayHello('Coworker')
      apiTestResult = result
    } catch (error) {
      apiTestError = error instanceof Error ? error.message : 'Connection failed'
    } finally {
      isTestingApi = false
    }
  }

  function toggleDebugPanel() {
    showDebugPanel = !showDebugPanel
    if (!showDebugPanel) {
      // Reset state when closing
      apiTestResult = null
      apiTestError = null
    }
  }
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

  <!-- Debug button in top-right corner -->
  <button
    onclick={toggleDebugPanel}
    class="titlebar-no-drag fixed right-4 top-4 z-[60] flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground opacity-0 transition-all duration-500 hover:bg-muted hover:text-foreground"
    class:opacity-100={showTagline}
    aria-label="Toggle debug panel"
    style="-webkit-app-region: no-drag;"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M12 2v2" />
      <path d="M12 22v-2" />
      <path d="m17 20.66-1-1.73" />
      <path d="M11 10.27 7 3.34" />
      <path d="m20.66 17-1.73-1" />
      <path d="m3.34 7 1.73 1" />
      <path d="M14 12h8" />
      <path d="M2 12h2" />
      <path d="m20.66 7-1.73 1" />
      <path d="m3.34 17 1.73-1" />
      <path d="m17 3.34-1 1.73" />
      <path d="m11 13.73-4 6.93" />
    </svg>
  </button>

  <!-- Debug Panel -->
  {#if showDebugPanel}
    <div
      class="fixed right-4 top-14 z-40 w-80 overflow-hidden rounded-xl border border-border bg-card p-6 shadow-lg transition-all duration-300"
    >
      <h3 class="mb-4 font-serif text-lg font-medium text-foreground">
        API Diagnostics
      </h3>

      <div class="space-y-4">
        <div class="rounded-lg bg-muted/50 p-3">
          <p class="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            API URL
          </p>
          <p class="break-all font-mono text-sm text-foreground">
            {apiUrl ?? 'Loading...'}
          </p>
        </div>
        <Button
          onclick={testApiConnection}
          disabled={isTestingApi}
          variant="default"
          class="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {#if isTestingApi}
            <svg
              class="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Testing...
          {:else}
            Test API Connection
          {/if}
        </Button>

        {#if apiTestResult}
          <div class="rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
            <div class="mb-2 flex items-center gap-2">
              <svg
                class="h-4 w-4 text-green-600 dark:text-green-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              <span class="text-sm font-medium text-green-700 dark:text-green-300">
                Connection Successful
              </span>
            </div>
            <p class="font-serif text-lg text-green-800 dark:text-green-200">
              {apiTestResult.message}
            </p>
            <p class="mt-1 text-xs text-green-600 dark:text-green-400">
              {new Date(apiTestResult.timestamp).toLocaleString()}
            </p>
          </div>
        {/if}

        {#if apiTestError}
          <div class="rounded-lg bg-red-50 p-4 dark:bg-red-950/30">
            <div class="mb-2 flex items-center gap-2">
              <svg
                class="h-4 w-4 text-red-600 dark:text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span class="text-sm font-medium text-red-700 dark:text-red-300">
                Connection Failed
              </span>
            </div>
            <p class="text-sm text-red-600 dark:text-red-400">
              {apiTestError}
            </p>
            <p class="mt-2 text-xs text-muted-foreground">
              Make sure the API is running on localhost:3000
            </p>
          </div>
        {/if}

        {#if !apiTestResult && !apiTestError && !isTestingApi}
          <p class="text-center text-sm text-muted-foreground">
            Click the button above to test the API connection.
          </p>
        {/if}
      </div>
    </div>
  {/if}

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

  /* Ensure buttons in the titlebar area are clickable */
  .titlebar-no-drag {
    -webkit-app-region: no-drag;
  }
</style>
