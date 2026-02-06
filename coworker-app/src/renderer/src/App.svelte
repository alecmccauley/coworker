<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { AuthUser } from '@coworker/shared-services'
  import type { UpdateState } from '$lib/types'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import WelcomeSplash from './components/WelcomeSplash.svelte'
  import AuthFlow from './components/AuthFlow.svelte'
  import Dashboard from './components/Dashboard.svelte'
  import UpdatesDialog from './components/updates/UpdatesDialog.svelte'

  // App navigation state
  type AppState = 'loading' | 'splash' | 'auth' | 'dashboard'
  let currentState = $state<AppState>('loading')
  let currentUser = $state<AuthUser | null>(null)
  let showUpdatesDialog = $state(false)
  let updateState = $state<UpdateState | null>(null)
  let cleanupMenuUpdates: (() => void) | null = null
  let cleanupUpdatesListener: (() => void) | null = null

  onMount(async () => {
    cleanupMenuUpdates = window.api.settings.onOpenUpdates(() => {
      showUpdatesDialog = true
    })

    try {
      updateState = await window.api.updates.getState()
      cleanupUpdatesListener = window.api.updates.onState((state) => {
        updateState = state
      })
    } catch {
      updateState = null
    }

    // Check if user is already authenticated
    try {
      const result = await window.api.auth.isAuthenticated()
      if (result.authenticated && result.user) {
        currentUser = result.user
        currentState = 'dashboard'
      } else {
        currentState = 'splash'
      }
    } catch {
      currentState = 'splash'
    }
  })

  onDestroy(() => {
    cleanupMenuUpdates?.()
    cleanupUpdatesListener?.()
  })

  function handleSignIn(): void {
    currentState = 'auth'
  }

  function handleAuthSuccess(user: AuthUser): void {
    currentUser = user
    currentState = 'dashboard'
  }

  function handleAuthBack(): void {
    currentState = 'splash'
  }

  function handleLogout(): void {
    currentUser = null
    currentState = 'splash'
  }

  function handleOpenUpdates(): void {
    showUpdatesDialog = true
  }

  const showUpdatePill = $derived(
    currentState !== 'dashboard' &&
      (updateState?.status === 'available' ||
        updateState?.status === 'downloaded'),
  )
  const updatePillLabel = $derived(
    updateState?.status === 'downloaded' ? 'Restart to install' : 'Update available',
  )
</script>

{#if currentState === 'loading'}
  <!-- Loading state -->
  <div class="flex min-h-screen items-center justify-center" style="background-color: oklch(0.975 0.005 85);">
    <div class="flex flex-col items-center gap-4">
      <Loader2Icon class="h-8 w-8 animate-spin text-accent" />
      <p class="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
{:else if currentState === 'splash'}
  <WelcomeSplash onSignIn={handleSignIn} />
{:else if currentState === 'auth'}
  <AuthFlow onSuccess={handleAuthSuccess} onBack={handleAuthBack} />
{:else if currentState === 'dashboard' && currentUser}
  <Dashboard
    user={currentUser}
    onLogout={handleLogout}
    onOpenUpdates={handleOpenUpdates}
  />
{/if}

{#if showUpdatePill}
  <button
    onclick={handleOpenUpdates}
    class="fixed right-14 top-4 z-[70] flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-all hover:border-accent hover:text-accent"
    aria-label="Open updates"
    style="-webkit-app-region: no-drag;"
  >
    <span class="h-1.5 w-1.5 rounded-full bg-accent"></span>
    {updatePillLabel}
  </button>
{/if}

<UpdatesDialog bind:open={showUpdatesDialog} />
