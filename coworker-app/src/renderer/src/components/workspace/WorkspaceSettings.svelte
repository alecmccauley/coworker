<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
  import { Button } from '$lib/components/ui/button'
  import ScopedNotes from '../knowledge/ScopedNotes.svelte'
  import ScopedSources from '../knowledge/ScopedSources.svelte'
  import IndexingStatusPanel from '../knowledge/IndexingStatusPanel.svelte'
  import UpdateSettingsPanel from '../updates/UpdateSettingsPanel.svelte'
  import type { WorkspaceInfo } from '$lib/types'

  interface Props {
    workspace: WorkspaceInfo
    onBack: () => void
    initialTab?: 'overview' | 'indexing' | 'updates'
  }

  let { workspace, onBack, initialTab = 'overview' }: Props = $props()

  let activeTab = $state<'overview' | 'indexing' | 'updates'>(initialTab)
  let lastInitialTab = $state(initialTab)

  // Only sync activeTab when the parent passes a new initialTab (e.g. opening via "Updates" menu).
  // Do not overwrite user's in-component tab choice when they click Indexing/Updates.
  $effect(() => {
    const it = initialTab
    if (it !== lastInitialTab) {
      lastInitialTab = it
      activeTab = it
    }
  })
</script>

<div class="flex h-full flex-1 flex-col">
  <!-- Header -->
  <div class="flex items-center gap-4 border-b border-border px-6 py-4">
    <Button variant="ghost" size="sm" onclick={onBack} class="gap-2">
      <ArrowLeftIcon class="h-4 w-4" />
      Back
    </Button>
    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Settings</p>
      <h2 class="font-serif text-xl font-medium text-foreground">{workspace.manifest.name}</h2>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-2xl space-y-6 p-6">
      <div class="flex items-center gap-2 rounded-full border border-border bg-card p-1 text-sm">
        <button
          class={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === 'overview'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onclick={() => (activeTab = 'overview')}
        >
          Overview
        </button>
        <button
          class={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === 'indexing'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onclick={() => (activeTab = 'indexing')}
        >
          Indexing
        </button>
        <button
          class={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === 'updates'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onclick={() => (activeTab = 'updates')}
        >
          Updates
        </button>
      </div>

      {#if activeTab === 'overview'}
        <div class="space-y-8">
          <!-- Workspace Info -->
          <section class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-foreground">Workspace</h3>
              <p class="text-sm text-muted-foreground">General settings for this workspace</p>
            </div>
            <div class="rounded-xl border border-border bg-card p-6">
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-foreground">Name</label>
                  <p class="mt-1 text-foreground">{workspace.manifest.name}</p>
                </div>
                {#if workspace.manifest.description}
                  <div>
                    <label class="text-sm font-medium text-foreground">Description</label>
                    <p class="mt-1 text-muted-foreground">{workspace.manifest.description}</p>
                  </div>
                {/if}
                <div>
                  <label class="text-sm font-medium text-foreground">Location</label>
                  <p class="mt-1 text-sm text-muted-foreground font-mono">{workspace.path}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Workspace Knowledge -->
          <section class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-foreground">Knowledge</h3>
              <p class="text-sm text-muted-foreground">
                Global context that guides all co-workers across every channel
              </p>
            </div>
            <div class="rounded-xl border border-border bg-card p-6">
              <ScopedNotes
                scopeType="workspace"
                title="Workspace Notes"
                description="Truths, goals, preferences, and constraints that apply everywhere"
              />
            </div>
          </section>

          <!-- Workspace Sources -->
          <section class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-foreground">Sources</h3>
              <p class="text-sm text-muted-foreground">
                Documents and references available to all co-workers
              </p>
            </div>
            <div class="rounded-xl border border-border bg-card p-6">
              <ScopedSources
                scopeType="workspace"
                title="Workspace Sources"
                description="Docs and references for everyone"
              />
            </div>
          </section>
        </div>
      {:else if activeTab === 'indexing'}
        <div class="rounded-xl border border-border bg-card p-6">
          <IndexingStatusPanel />
        </div>
      {:else}
        <UpdateSettingsPanel />
      {/if}
    </div>
  </div>
</div>
