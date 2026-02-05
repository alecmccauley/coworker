<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { Button } from '$lib/components/ui/button'
  import type { UpdateState } from '$lib/types'

  let updateState = $state<UpdateState | null>(null)
  let isChecking = $state(false)
  let isDownloading = $state(false)
  let autoDownload = $state(true)

  const statusLabel = $derived(() => {
    if (!updateState) return 'Checking for updates...'
    switch (updateState.status) {
      case 'idle':
        return 'Ready to check for updates.'
      case 'checking':
        return 'Checking for updates...'
      case 'available':
        return `Update ${updateState.availableVersion ?? ''} available.`.trim()
      case 'not-available':
        return 'You are up to date.'
      case 'downloading':
        return 'Downloading update...'
      case 'downloaded':
        return 'Update ready to install.'
      case 'error':
        return updateState.error || 'Update failed.'
      default:
        return 'Update status unknown.'
    }
  })

  let unsubscribe: (() => void) | null = null

  onMount(async () => {
    updateState = await window.api.updates.getState()
    autoDownload = updateState.autoDownload

    unsubscribe = window.api.updates.onState((state) => {
      updateState = state
      autoDownload = state.autoDownload
    })
  })

  onDestroy(() => {
    unsubscribe?.()
  })

  async function handleCheck(): Promise<void> {
    isChecking = true
    try {
      await window.api.updates.check()
    } finally {
      isChecking = false
    }
  }

  async function handleDownload(): Promise<void> {
    isDownloading = true
    try {
      await window.api.updates.download()
    } finally {
      isDownloading = false
    }
  }

  function handleInstall(): void {
    window.api.updates.quitAndInstall()
  }

  async function handleToggleAutoDownload(): Promise<void> {
    const nextValue = !autoDownload
    autoDownload = nextValue
    await window.api.updates.setAutoDownload(nextValue)
  }

  const isUpdateAvailable = $derived(
    () => updateState?.status === 'available' || updateState?.status === 'downloading'
  )
  const isUpdateDownloaded = $derived(() => updateState?.status === 'downloaded')
  const progressPercent = $derived(() => updateState?.progress?.percent ?? 0)
</script>

<section class="space-y-6">
  <div>
    <h3 class="text-lg font-semibold text-foreground">Updates</h3>
    <p class="text-sm text-muted-foreground">Keep Coworkers up to date automatically.</p>
  </div>

  <div class="rounded-xl border border-border bg-card p-6 space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-foreground">Current version</p>
        <p class="text-sm text-muted-foreground">{updateState?.currentVersion ?? '—'}</p>
      </div>
      <Button size="sm" onclick={handleCheck} disabled={isChecking}>
        {isChecking ? 'Checking…' : 'Check for updates'}
      </Button>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium text-foreground">Status</p>
      <p class="text-sm text-muted-foreground">{statusLabel}</p>
    </div>

    {#if updateState?.status === 'downloading'}
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>Downloading…</span>
          <span>{progressPercent.toFixed(0)}%</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full bg-accent transition-all"
            style={`width: ${progressPercent}%`}
          ></div>
        </div>
      </div>
    {/if}

    <div class="flex flex-wrap items-center gap-3">
      {#if isUpdateAvailable && !autoDownload}
        <Button size="sm" variant="secondary" onclick={handleDownload} disabled={isDownloading}>
          {isDownloading ? 'Downloading…' : 'Download update'}
        </Button>
      {/if}
      {#if isUpdateDownloaded}
        <Button size="sm" onclick={handleInstall}>
          Restart to install
        </Button>
      {/if}
    </div>
  </div>

  <div class="rounded-xl border border-border bg-card p-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-foreground">Auto-download updates</p>
        <p class="text-xs text-muted-foreground">
          Download updates in the background and install when you restart.
        </p>
      </div>
      <button
        class={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          autoDownload ? 'bg-foreground' : 'bg-muted'
        }`}
        onclick={handleToggleAutoDownload}
        aria-pressed={autoDownload}
        type="button"
      >
        <span
          class={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
            autoDownload ? 'translate-x-6' : 'translate-x-1'
          }`}
        ></span>
      </button>
    </div>
  </div>
</section>
