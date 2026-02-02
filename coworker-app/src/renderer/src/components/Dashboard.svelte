<script lang="ts">
  import { onMount } from 'svelte'
  import { Button } from '$lib/components/ui/button'
  import Icon from '@iconify/svelte'
  import type { AuthUser } from '@coworker/shared-services'

  interface Props {
    user: AuthUser
    onLogout: () => void
  }

  let { user, onLogout }: Props = $props()

  // Animation states
  let mounted = $state(false)
  let showContent = $state(false)
  let isLoggingOut = $state(false)

  // Detect macOS for traffic light spacing
  const isMacOS = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')

  onMount(() => {
    mounted = true
    setTimeout(() => (showContent = true), 100)
  })

  async function handleLogout() {
    isLoggingOut = true
    try {
      await window.api.auth.logout()
      onLogout()
    } catch {
      // Still logout locally even if API call fails
      onLogout()
    }
  }

  // Get display name
  const displayName = $derived(user.name || user.email.split('@')[0] || 'there')
</script>

<div class="dashboard-container flex min-h-screen flex-col">
  <!-- Invisible draggable title bar -->
  <header
    class="titlebar-drag-region fixed left-0 right-0 top-0 z-50 h-12"
    class:pl-24={isMacOS}
  ></header>

  <!-- Logout button in top-right -->
  <button
    onclick={handleLogout}
    disabled={isLoggingOut}
    class="titlebar-no-drag fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-foreground disabled:opacity-50"
    style="-webkit-app-region: no-drag;"
  >
    {#if isLoggingOut}
      <Icon icon="lucide:loader-2" class="h-4 w-4 animate-spin" />
    {:else}
      <Icon icon="lucide:log-out" class="h-4 w-4" />
    {/if}
    Sign out
  </button>

  <!-- Main content -->
  <main class="flex flex-1 flex-col items-center justify-center px-8">
    <div
      class="max-w-2xl text-center transition-all duration-700 ease-out"
      class:opacity-100={showContent}
      class:opacity-0={!showContent}
      class:translate-y-0={showContent}
      class:translate-y-4={!showContent}
    >
      <!-- Decorative accent line -->
      <div
        class="mx-auto mb-12 h-px w-16 transition-all duration-1000 ease-out"
        class:opacity-100={mounted}
        class:opacity-0={!mounted}
        style="background: linear-gradient(90deg, transparent, oklch(0.65 0.14 25), transparent);"
      ></div>

      <!-- Greeting -->
      <p
        class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground"
      >
        Welcome back
      </p>

      <!-- Name - the hero moment -->
      <h1
        class="mb-6 font-serif text-5xl font-medium tracking-tight text-foreground md:text-6xl lg:text-7xl"
      >
        Hello, <span class="text-accent">{displayName}</span>
      </h1>

      <!-- Subtitle -->
      <p
        class="mb-8 font-serif text-xl font-normal leading-relaxed text-foreground/80 md:text-2xl"
      >
        You're signed in and ready to go.
        <br />
        <span class="text-foreground">Great things lie ahead.</span>
      </p>

      <!-- Decorative accent line -->
      <div
        class="mx-auto mt-12 h-px w-24 transition-all duration-1000 ease-out delay-500"
        class:opacity-100={showContent}
        class:opacity-0={!showContent}
        style="background: linear-gradient(90deg, transparent, oklch(0.65 0.14 25 / 50%), transparent);"
      ></div>

      <!-- User info card -->
      <div class="mx-auto mt-8 max-w-sm rounded-xl border border-border bg-card p-6">
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Signed in as
        </p>
        <p class="text-lg font-medium text-foreground">{user.email}</p>
        {#if user.name}
          <p class="mt-1 text-sm text-muted-foreground">{user.name}</p>
        {/if}
      </div>
    </div>
  </main>

  <!-- Subtle ambient decoration -->
  <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
    <div
      class="absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-0 blur-3xl transition-opacity duration-[3000ms]"
      class:opacity-30={mounted}
      style="background: radial-gradient(circle, oklch(0.65 0.14 25 / 15%), transparent 70%);"
    ></div>
    <div
      class="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full opacity-0 blur-3xl transition-opacity duration-[3000ms] delay-1000"
      class:opacity-20={mounted}
      style="background: radial-gradient(circle, oklch(0.65 0.14 25 / 10%), transparent 70%);"
    ></div>
  </div>
</div>

<style>
  .dashboard-container {
    background-color: oklch(0.975 0.005 85);
  }

  :global(.dark) .dashboard-container {
    background-color: oklch(0.16 0.01 60);
  }

  .titlebar-no-drag {
    -webkit-app-region: no-drag;
  }
</style>
