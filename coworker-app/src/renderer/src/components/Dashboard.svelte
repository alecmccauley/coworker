<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Button } from '$lib/components/ui/button'
  import FolderXIcon from '@lucide/svelte/icons/folder-x'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import type { AuthUser } from '@coworker/shared-services'
  import type { WorkspaceInfo, RecentWorkspace, Coworker } from '$lib/types'

  // Workspace components
  import WelcomeView from './workspace/WelcomeView.svelte'

  // Coworker components
  import CoworkerList from './coworker/CoworkerList.svelte'
  import CoworkerForm from './coworker/CoworkerForm.svelte'
  import DeleteCoworkerDialog from './coworker/DeleteCoworkerDialog.svelte'

  import AppShell from './AppShell.svelte'

  interface Props {
    user: AuthUser
    onLogout: () => void
  }

  let { user, onLogout }: Props = $props()

  // Animation states
  let mounted = $state(false)
  let showContent = $state(false)
  let isLoggingOut = $state(false)

  // Workspace state
  let currentWorkspace = $state<WorkspaceInfo | null>(null)
  let recentWorkspaces = $state<RecentWorkspace[]>([])
  let isLoadingWorkspace = $state(false)

  // Coworker state
  let coworkers = $state<Coworker[]>([])
  let isLoadingCoworkers = $state(false)

  // Dialog state
  let showCoworkerForm = $state(false)
  let editingCoworker = $state<Coworker | null>(null)
  let showDeleteDialog = $state(false)
  let deletingCoworker = $state<Coworker | null>(null)

  // Error state
  let errorMessage = $state<string | null>(null)

  // Display name
  const displayName = $derived(user.name || user.email.split('@')[0] || 'there')

  // Cleanup functions for menu listeners
  let cleanupMenuNew: (() => void) | null = null
  let cleanupMenuOpen: (() => void) | null = null
  let cleanupMenuClose: (() => void) | null = null

  onMount(async () => {
    mounted = true
    setTimeout(() => (showContent = true), 100)

    // Load initial state
    await loadCurrentWorkspace()
    await loadRecentWorkspaces()

    // Set up menu event listeners
    cleanupMenuNew = window.api.workspace.onMenuNew(handleWorkspaceOpened)
    cleanupMenuOpen = window.api.workspace.onMenuOpen(handleWorkspaceOpened)
    cleanupMenuClose = window.api.workspace.onMenuClose(handleWorkspaceClosed)
  })

  onDestroy(() => {
    cleanupMenuNew?.()
    cleanupMenuOpen?.()
    cleanupMenuClose?.()
  })

  async function loadCurrentWorkspace(): Promise<void> {
    try {
      currentWorkspace = await window.api.workspace.getCurrent()
      if (currentWorkspace) {
        await loadCoworkers()
      }
    } catch (error) {
      console.error('Failed to load current workspace:', error)
      errorMessage = formatError(error, 'Failed to load current workspace.')
    }
  }

  async function loadRecentWorkspaces(): Promise<void> {
    try {
      recentWorkspaces = await window.api.workspace.listRecent()
    } catch (error) {
      console.error('Failed to load recent workspaces:', error)
      errorMessage = formatError(error, 'Failed to load recent workspaces.')
    }
  }

  async function loadCoworkers(): Promise<void> {
    if (!currentWorkspace) return

    isLoadingCoworkers = true
    try {
      coworkers = await window.api.coworker.list()
    } catch (error) {
      console.error('Failed to load coworkers:', error)
      errorMessage = formatError(error, 'Failed to load coworkers.')
    } finally {
      isLoadingCoworkers = false
    }
  }

  async function handleNewWorkspace(): Promise<void> {
    isLoadingWorkspace = true
    errorMessage = null
    try {
      const workspace = await window.api.workspace.showCreateDialog()
      if (workspace) {
        handleWorkspaceOpened(workspace)
      }
    } catch (error) {
      console.error('Failed to create workspace:', error)
      errorMessage = formatError(error, 'Failed to create workspace.')
    } finally {
      isLoadingWorkspace = false
    }
  }

  async function handleOpenWorkspace(): Promise<void> {
    isLoadingWorkspace = true
    errorMessage = null
    try {
      const workspace = await window.api.workspace.showOpenDialog()
      if (workspace) {
        handleWorkspaceOpened(workspace)
      }
    } catch (error) {
      console.error('Failed to open workspace:', error)
      errorMessage = formatError(error, 'Failed to open workspace.')
    } finally {
      isLoadingWorkspace = false
    }
  }

  async function handleSelectRecentWorkspace(recent: RecentWorkspace): Promise<void> {
    isLoadingWorkspace = true
    errorMessage = null
    try {
      const workspace = await window.api.workspace.open(recent.path)
      handleWorkspaceOpened(workspace)
    } catch (error) {
      console.error('Failed to open recent workspace:', error)
      errorMessage = formatError(error, 'Failed to open recent workspace.')
      // Remove from recent list if it failed to open
      await handleRemoveRecentWorkspace(recent.path)
    } finally {
      isLoadingWorkspace = false
    }
  }

  async function handleRemoveRecentWorkspace(path: string): Promise<void> {
    await window.api.workspace.removeRecent(path)
    await loadRecentWorkspaces()
  }

  async function handleClearRecentWorkspaces(): Promise<void> {
    await window.api.workspace.clearRecent()
    recentWorkspaces = []
  }

  function handleWorkspaceOpened(workspace: WorkspaceInfo): void {
    currentWorkspace = workspace
    loadCoworkers()
    loadRecentWorkspaces()
  }

  async function handleWorkspaceClosed(): Promise<void> {
    try {
      await window.api.workspace.close()
      currentWorkspace = null
      coworkers = []
      await loadRecentWorkspaces()
    } catch (error) {
      console.error('Failed to close workspace:', error)
      errorMessage = formatError(error, 'Failed to close workspace.')
    }
  }

  async function handleLogout(): Promise<void> {
    isLoggingOut = true
    try {
      // Close any open workspace first
      if (currentWorkspace) {
        await window.api.workspace.close()
      }
      await window.api.auth.logout()
      onLogout()
    } catch {
      // Still logout locally even if API call fails
      onLogout()
    }
  }

  // Coworker handlers
  function handleCreateCoworker(): void {
    editingCoworker = null
    showCoworkerForm = true
  }

  function handleEditCoworker(coworker: Coworker): void {
    editingCoworker = coworker
    showCoworkerForm = true
  }

  function handleDeleteCoworker(coworker: Coworker): void {
    deletingCoworker = coworker
    showDeleteDialog = true
  }

  async function handleSaveCoworker(
    input: { name: string; description?: string }
  ): Promise<void> {
    if (editingCoworker) {
      await window.api.coworker.update(editingCoworker.id, input)
    } else {
      await window.api.coworker.create(input)
    }
    await loadCoworkers()
  }

  async function handleConfirmDeleteCoworker(): Promise<void> {
    if (!deletingCoworker) return
    await window.api.coworker.delete(deletingCoworker.id)
    await loadCoworkers()
  }

  function formatError(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message
    }
    if (typeof error === 'string' && error.trim().length > 0) {
      return error
    }
    return fallbackMessage
  }
</script>

{#snippet dashboardHeaderActions()}
  {#if currentWorkspace}
    <button
      onclick={handleWorkspaceClosed}
      class="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
      title="Close workspace"
    >
      <FolderXIcon class="h-3.5 w-3.5" />
      Close
    </button>
  {/if}
  <button
    onclick={handleLogout}
    disabled={isLoggingOut}
    class="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50"
  >
    {#if isLoggingOut}
      <Loader2Icon class="h-3.5 w-3.5 animate-spin" />
    {:else}
      <LogOutIcon class="h-3.5 w-3.5" />
    {/if}
    Sign out
  </button>
{/snippet}

<AppShell headerActions={dashboardHeaderActions}>
  <div class="relative flex flex-1 flex-col">
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

    <!-- Main content -->
    <div class="flex flex-1 flex-col">
      {#if errorMessage}
        <div class="px-8 pt-6">
          <div class="flex items-start justify-between gap-3 rounded-2xl border border-muted bg-card px-4 py-3 text-sm text-foreground shadow-sm">
            <div class="flex items-start gap-3">
              <AlertTriangleIcon class="mt-0.5 h-4 w-4 text-accent" />
              <div>
                <p class="font-medium text-foreground">Something went wrong</p>
                <p class="text-muted-foreground">{errorMessage}</p>
              </div>
            </div>
            <button
              class="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              onclick={() => (errorMessage = null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      {/if}
      {#if isLoadingWorkspace}
        <div class="flex flex-1 items-center justify-center">
          <Loader2Icon class="h-8 w-8 animate-spin text-accent" />
        </div>
      {:else if currentWorkspace}
        <div
          class="flex flex-1 flex-col px-8 py-6 transition-all duration-500"
          class:opacity-100={showContent}
          class:opacity-0={!showContent}
        >
          <div class="mb-8 flex items-center justify-between">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Workspace
              </p>
              <h1 class="font-serif text-3xl font-medium text-foreground">
                {currentWorkspace.manifest.name}
              </h1>
            </div>
            <Button onclick={handleCreateCoworker} class="gap-2">
              <PlusIcon class="h-4 w-4" />
              Add Co-worker
            </Button>
          </div>
          <div class="flex-1">
            {#if isLoadingCoworkers}
              <div class="flex items-center justify-center py-16">
                <Loader2Icon class="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            {:else}
              <CoworkerList
                {coworkers}
                onEdit={handleEditCoworker}
                onDelete={handleDeleteCoworker}
                onCreateCoworker={handleCreateCoworker}
              />
            {/if}
          </div>
        </div>
      {:else}
        <WelcomeView
          {recentWorkspaces}
          onNewWorkspace={handleNewWorkspace}
          onOpenWorkspace={handleOpenWorkspace}
          onSelectRecent={handleSelectRecentWorkspace}
          onRemoveRecent={handleRemoveRecentWorkspace}
          onClearRecent={handleClearRecentWorkspaces}
        />
      {/if}
    </div>
  </div>
</AppShell>

<!-- Dialogs -->
<CoworkerForm
  bind:open={showCoworkerForm}
  coworker={editingCoworker}
  onClose={() => {
    showCoworkerForm = false
    editingCoworker = null
  }}
  onSave={handleSaveCoworker}
/>

<DeleteCoworkerDialog
  bind:open={showDeleteDialog}
  coworker={deletingCoworker}
  onClose={() => {
    showDeleteDialog = false
    deletingCoworker = null
  }}
  onConfirm={handleConfirmDeleteCoworker}
/>

