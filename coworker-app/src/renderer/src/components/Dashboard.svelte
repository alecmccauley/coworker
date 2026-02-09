<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import FolderXIcon from '@lucide/svelte/icons/folder-x'
  import EraserIcon from '@lucide/svelte/icons/eraser'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle'
  import type { AuthUser } from '@coworker/shared-services'
  import type { WorkspaceInfo, RecentWorkspace, Coworker, Channel, CreateCoworkerInput, UpdateCoworkerInput, UpdateState } from '$lib/types'
  import { trackEvent } from '$lib/track-event'

  // Workspace components
  import WelcomeView from './workspace/WelcomeView.svelte'
  import WorkspaceSettings from './workspace/WorkspaceSettings.svelte'


  // Coworker components
  import CoworkerForm from './coworker/CoworkerForm.svelte'
  import CreateCoworkerDialog from './coworker/CreateCoworkerDialog.svelte'
  import DeleteCoworkerDialog from './coworker/DeleteCoworkerDialog.svelte'
  import CoworkerProfile from './coworker/CoworkerProfile.svelte'
  import WorkersSettings from './coworker/WorkersSettings.svelte'

  // Sidebar
  import { Sidebar } from './sidebar'

  // Channel components
  import ChannelView from './channel/ChannelView.svelte'
  import CreateChannelDialog from './channel/CreateChannelDialog.svelte'

  // First-run experience
  import { FirstRunExperience } from './fre'

  import AppShell from './AppShell.svelte'

  interface Props {
    user: AuthUser
    onLogout: () => void
    onOpenUpdates: () => void
  }

  let { user, onLogout, onOpenUpdates }: Props = $props()

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

  // Channel state
  let channels = $state<Channel[]>([])
  let selectedChannel = $state<Channel | null>(null)
  let isLoadingChannels = $state(false)

  // Navigation state
  type ViewType =
    | 'channel'
    | 'coworker-profile'
    | 'workspace-settings'
    | 'workers-settings'
  let currentView = $state<ViewType>('channel')
  let selectedCoworkerId = $state<string | null>(null)
  let openChannelSettingsPanel = $state(false)

  // Updates state
  let updateState = $state<UpdateState | null>(null)
  // Dialog state
  let showCreateCoworkerDialog = $state(false)
  let showEditCoworkerForm = $state(false)
  let editingCoworker = $state<Coworker | null>(null)
  let showDeleteDialog = $state(false)
  let deletingCoworker = $state<Coworker | null>(null)
  let showChannelDialog = $state(false)
  let pendingCoworkerAssignChannelId = $state<string | null>(null)

  // First-run experience state
  let showFRE = $state(false)

  // Error state
  let errorMessage = $state<string | null>(null)

  // User display name - currently unused but available for UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const displayName = $derived(user.name || user.email.split('@')[0] || 'there')

  // Cleanup functions for menu listeners
  let cleanupMenuNew: (() => void) | null = null
  let cleanupMenuOpen: (() => void) | null = null
  let cleanupMenuClose: (() => void) | null = null
  let cleanupMenuWorkspaceSettings: (() => void) | null = null
  let cleanupMenuChannelsSettings: (() => void) | null = null
  let cleanupMenuWorkersSettings: (() => void) | null = null
  let cleanupUpdatesListener: (() => void) | null = null

  $effect(() => {
    if (currentView === 'channel' && openChannelSettingsPanel) {
      const id = setTimeout(() => {
        openChannelSettingsPanel = false
      }, 0)
      return () => clearTimeout(id)
    }
  })

  $effect(() => {
    window.api.settings.setChannelSettingsEnabled(
      currentWorkspace !== null && selectedChannel !== null,
    )
  })

  onMount(async () => {
    mounted = true
    setTimeout(() => (showContent = true), 100)

    // Load initial state
    await loadCurrentWorkspace()
    await loadRecentWorkspaces()

    updateState = await window.api.updates.getState()
    cleanupUpdatesListener = window.api.updates.onState((state) => {
      updateState = state
    })

    // Set up menu event listeners
    cleanupMenuNew = window.api.workspace.onMenuNew(handleWorkspaceOpened)
    cleanupMenuOpen = window.api.workspace.onMenuOpen(handleWorkspaceOpened)
    cleanupMenuClose = window.api.workspace.onMenuClose(handleWorkspaceClosed)
    cleanupMenuWorkspaceSettings =
      window.api.settings.onOpenWorkspaceSettings(handleMenuWorkspaceSettings)
    cleanupMenuChannelsSettings =
      window.api.settings.onOpenChannelsSettings(handleMenuChannelsSettings)
    cleanupMenuWorkersSettings =
      window.api.settings.onOpenWorkersSettings(handleMenuWorkersSettings)
  })

  onDestroy(() => {
    cleanupMenuNew?.()
    cleanupMenuOpen?.()
    cleanupMenuClose?.()
    cleanupMenuWorkspaceSettings?.()
    cleanupMenuChannelsSettings?.()
    cleanupMenuWorkersSettings?.()
    cleanupUpdatesListener?.()
  })

  async function loadCurrentWorkspace(): Promise<void> {
    try {
      currentWorkspace = await window.api.workspace.getCurrent()
      if (currentWorkspace) {
        await Promise.all([loadCoworkers(), loadChannels()])
        // Check if we should show the first-run experience
        checkOnboardingStatus()
      }
    } catch (error) {
      console.error('Failed to load current workspace:', error)
      errorMessage = formatError(error, 'Failed to load current workspace.')
    }
  }

  function checkOnboardingStatus(): void {
    if (!currentWorkspace) return
    const manifest = currentWorkspace.manifest
    // Show FRE if onboarding hasn't been completed
    if (!manifest.hasCompletedOnboarding) {
      showFRE = true
    }
  }

  async function loadChannels(): Promise<void> {
    if (!currentWorkspace) return

    isLoadingChannels = true
    try {
      channels = await window.api.channel.list()
      
      // Create default channels if none exist
      if (channels.length === 0) {
        channels = await window.api.channel.createDefaults()
      }
      
      // Select first channel by default if none selected
      if (!selectedChannel && channels.length > 0) {
        selectedChannel = channels[0]
      }
    } catch (error) {
      console.error('Failed to load channels:', error)
      errorMessage = formatError(error, 'Failed to load channels.')
    } finally {
      isLoadingChannels = false
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
        trackEvent('workspace.created', { workspaceName: workspace.manifest.name })
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
    errorMessage = null
    try {
      await window.api.workspace.clearRecent()
      await window.api.menu.refresh()
      recentWorkspaces = []
    } catch (error) {
      console.error('Failed to clear recent workspaces:', error)
      errorMessage = formatError(error, 'Failed to clear recent workspaces.')
    }
  }

  function handleWorkspaceOpened(workspace: WorkspaceInfo): void {
    currentWorkspace = workspace
    selectedChannel = null
    channels = []
    showFRE = false // Reset FRE state
    loadCoworkers()
    loadChannels()
    loadRecentWorkspaces()
    // Check onboarding status for the new workspace
    checkOnboardingStatus()
  }

  async function handleWorkspaceClosed(): Promise<void> {
    try {
      await window.api.workspace.close()
      currentWorkspace = null
      coworkers = []
      channels = []
      selectedChannel = null
      await loadRecentWorkspaces()
    } catch (error) {
      console.error('Failed to close workspace:', error)
      errorMessage = formatError(error, 'Failed to close workspace.')
    }
  }

  // Channel handlers
  function handleSelectChannel(channel: Channel): void {
    selectedChannel = channel
    currentView = 'channel'
    selectedCoworkerId = null
  }

  function handleSelectCoworker(coworker: Coworker): void {
    selectedCoworkerId = coworker.id
    selectedChannel = null
    currentView = 'coworker-profile'
  }

  function handleOpenWorkspaceSettings(): void {
    currentView = 'workspace-settings'
    selectedCoworkerId = null
    selectedChannel = null
  }

  function handleOpenWorkersSettings(): void {
    currentView = 'workers-settings'
    selectedCoworkerId = null
    selectedChannel = null
  }

  function handleMenuWorkspaceSettings(): void {
    if (!currentWorkspace) return
    handleOpenWorkspaceSettings()
  }

  function handleMenuChannelsSettings(): void {
    if (!currentWorkspace) return
    currentView = 'channel'
    selectedCoworkerId = null
    if (!selectedChannel && channels.length > 0) {
      selectedChannel = channels[0]
    }
    openChannelSettingsPanel = true
  }

  function handleMenuWorkersSettings(): void {
    if (!currentWorkspace) return
    handleOpenWorkersSettings()
  }

  function handleBackFromSettings(): void {
    currentView = 'channel'
  }

  function handleOpenUpdates(): void {
    onOpenUpdates()
  }

  function handleOpenCreateChannel(): void {
    showChannelDialog = true
  }

  async function handleCreateChannel(input: { name: string; purpose?: string }): Promise<void> {
    const channel = await window.api.channel.create(input)
    await loadChannels()
    selectedChannel = channel
    currentView = 'channel'
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
  function handleCreateCoworker(channelId?: string): void {
    pendingCoworkerAssignChannelId = channelId ?? null
    showCreateCoworkerDialog = true
  }

  function handleEditCoworker(coworker: Coworker): void {
    editingCoworker = coworker
    showEditCoworkerForm = true
  }

  function handleDeleteCoworker(coworker: Coworker): void {
    deletingCoworker = coworker
    showDeleteDialog = true
  }

  async function handleCreateCoworkerSave(input: CreateCoworkerInput): Promise<void> {
    const coworker = await window.api.coworker.create(input)
    if (pendingCoworkerAssignChannelId) {
      try {
        await window.api.channel.addCoworker(pendingCoworkerAssignChannelId, coworker.id)
      } catch (error) {
        console.error('Failed to assign coworker to channel:', error)
      }
    }
    pendingCoworkerAssignChannelId = null
    await loadCoworkers()
  }

  async function handleEditCoworkerSave(input: UpdateCoworkerInput): Promise<void> {
    if (editingCoworker) {
      await window.api.coworker.update(editingCoworker.id, input)
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

  // FRE handlers
  async function handleFREComplete(dontShowAgain: boolean): Promise<void> {
    showFRE = false
    if (dontShowAgain) {
      try {
        await window.api.workspace.setOnboardingComplete(true)
      } catch (error) {
        console.error('Failed to save onboarding preference:', error)
      }
    }
  }

  function handleFRESkip(): void {
    showFRE = false
  }

  function handleFREChannelCreated(channel: Channel): void {
    channels = [...channels, channel]
    if (!selectedChannel) {
      selectedChannel = channel
    }
  }

  function handleFRECoworkerCreated(coworker: Coworker): void {
    coworkers = [...coworkers, coworker]
  }
</script>

{#snippet dashboardHeaderActions()}
  {#if updateState && (updateState.status === 'available' || updateState.status === 'downloaded')}
    <button
      onclick={handleOpenUpdates}
      class="group relative flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:border-accent hover:text-accent"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-accent"></span>
      {updateState.status === 'downloaded' ? 'Restart to install' : 'Update available'}
      <span
        class="pointer-events-none absolute -bottom-8 right-0 whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      >
        Open updates
      </span>
    </button>
  {/if}
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
  {#if !currentWorkspace && recentWorkspaces.length > 0}
    <button
      onclick={handleClearRecentWorkspaces}
      class="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
      title="Clear recent workspaces"
    >
      <EraserIcon class="h-3.5 w-3.5" />
      Clear Recents
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

<AppShell headerActions={dashboardHeaderActions} fullWidth={true}>
  <div class="relative flex h-full w-full flex-1 flex-col">
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
    <div class="flex min-h-0 flex-1 flex-col">
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
          class="flex min-h-0 flex-1 transition-all duration-500"
          class:opacity-100={showContent}
          class:opacity-0={!showContent}
        >
          <!-- Sidebar -->
          <Sidebar
            workspaceName={currentWorkspace.manifest.name}
            {channels}
            {coworkers}
            selectedChannelId={selectedChannel?.id ?? null}
            {selectedCoworkerId}
            isWorkspaceSettingsActive={currentView === 'workspace-settings'}
            isWorkersSettingsActive={currentView === 'workers-settings'}
            onSelectChannel={handleSelectChannel}
            onSelectCoworker={handleSelectCoworker}
            onCreateChannel={handleOpenCreateChannel}
            onCreateCoworker={handleCreateCoworker}
            onOpenSettings={handleOpenWorkspaceSettings}
            onOpenWorkersSettings={handleOpenWorkersSettings}
          />

          <!-- Main Content Area -->
          <div class="flex flex-1 flex-col">
            {#if isLoadingChannels || isLoadingCoworkers}
              <div class="flex flex-1 items-center justify-center">
                <Loader2Icon class="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            {:else if currentView === 'workspace-settings' && currentWorkspace}
              <WorkspaceSettings
                workspace={currentWorkspace}
                onBack={handleBackFromSettings}
              />
            {:else if currentView === 'workers-settings'}
              <WorkersSettings
                {coworkers}
                onBack={handleBackFromSettings}
                onEdit={handleEditCoworker}
                onArchive={handleDeleteCoworker}
                onCreateCoworker={handleCreateCoworker}
              />
            {:else if currentView === 'channel' && selectedChannel}
              <ChannelView
                channel={selectedChannel}
                {coworkers}
                onCreateCoworker={handleCreateCoworker}
                openSettingsPanel={openChannelSettingsPanel}
              />
            {:else if currentView === 'coworker-profile' && selectedCoworkerId}
              {#each coworkers.filter((c) => c.id === selectedCoworkerId) as coworker (coworker.id)}
                <CoworkerProfile
                  {coworker}
                  {channels}
                  onEdit={handleEditCoworker}
                  onArchive={handleDeleteCoworker}
                />
              {/each}
            {:else}
              <!-- Default empty state -->
              <div class="flex flex-1 items-center justify-center">
                <div class="text-center">
                  <p class="text-muted-foreground">Select a channel or co-worker to get started</p>
                </div>
              </div>
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
<CreateCoworkerDialog
  bind:open={showCreateCoworkerDialog}
  onClose={() => {
    showCreateCoworkerDialog = false
    pendingCoworkerAssignChannelId = null
  }}
  onSave={handleCreateCoworkerSave}
/>

<CoworkerForm
  bind:open={showEditCoworkerForm}
  coworker={editingCoworker}
  onClose={() => {
    showEditCoworkerForm = false
    editingCoworker = null
  }}
  onSave={handleEditCoworkerSave}
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

<CreateChannelDialog
  bind:open={showChannelDialog}
  onClose={() => (showChannelDialog = false)}
  onSave={handleCreateChannel}
/>

<!-- First-Run Experience -->
{#if showFRE && currentWorkspace}
  <FirstRunExperience
    workspace={currentWorkspace}
    {channels}
    {coworkers}
    onComplete={handleFREComplete}
    onSkip={handleFRESkip}
    onChannelCreated={handleFREChannelCreated}
    onCoworkerCreated={handleFRECoworkerCreated}
  />
{/if}

<!-- Updates Dialog -->
