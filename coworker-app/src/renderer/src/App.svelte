<script lang="ts">
  import { onMount } from 'svelte'
  import type { AuthUser } from '@coworker/shared-services'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import WelcomeSplash from './components/WelcomeSplash.svelte'
  import AuthFlow from './components/AuthFlow.svelte'
  import Dashboard from './components/Dashboard.svelte'

  // App navigation state
  type AppState = 'loading' | 'splash' | 'auth' | 'dashboard'
  let currentState = $state<AppState>('loading')
  let currentUser = $state<AuthUser | null>(null)

  onMount(async () => {
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

  function handleSignIn() {
    currentState = 'auth'
  }

  function handleAuthSuccess(user: AuthUser) {
    currentUser = user
    currentState = 'dashboard'
  }

  function handleAuthBack() {
    currentState = 'splash'
  }

  function handleLogout() {
    currentUser = null
    currentState = 'splash'
  }
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
  <Dashboard user={currentUser} onLogout={handleLogout} />
{/if}
