<script lang="ts">
  import { onMount } from 'svelte'
  import { Button } from '$lib/components/ui/button'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import FolderOpenIcon from '@lucide/svelte/icons/folder-open'
  import FolderIcon from '@lucide/svelte/icons/folder'
  import RecentWorkspacesList from './RecentWorkspacesList.svelte'
  import type { RecentWorkspace } from '$lib/types'

  interface Props {
    recentWorkspaces: RecentWorkspace[]
    onNewWorkspace: () => void
    onOpenWorkspace: () => void
    onSelectRecent: (workspace: RecentWorkspace) => void
    onRemoveRecent: (path: string) => void
    onClearRecent: () => void
  }

  let {
    recentWorkspaces,
    onNewWorkspace,
    onOpenWorkspace,
    onSelectRecent,
    onRemoveRecent,
    onClearRecent
  }: Props = $props()

  // Animation states
  let mounted = $state(false)
  let showContent = $state(false)

  onMount(() => {
    mounted = true
    setTimeout(() => (showContent = true), 100)
  })
</script>

<div class="flex min-h-full flex-col items-center justify-center px-8 py-12">
  <div
    class="w-full max-w-2xl text-center transition-all duration-700 ease-out"
    class:opacity-100={showContent}
    class:opacity-0={!showContent}
    class:translate-y-0={showContent}
    class:translate-y-4={!showContent}
  >
    <!-- Decorative accent line -->
    <div
      class="mx-auto mb-8 h-px w-16 transition-all duration-1000 ease-out"
      class:opacity-100={mounted}
      class:opacity-0={!mounted}
      style="background: linear-gradient(90deg, transparent, oklch(0.65 0.14 25), transparent);"
    ></div>

    <!-- Brand name -->
    <h1
      class="mb-4 font-serif text-5xl font-medium tracking-tight text-foreground md:text-6xl"
    >
      Coworker
    </h1>

    <!-- Subtitle -->
    <p class="mb-10 text-lg text-muted-foreground">
      Start by opening a workspace
    </p>

    <!-- Action buttons -->
    <div class="mb-12 flex flex-wrap items-center justify-center gap-4">
      <Button size="lg" onclick={onNewWorkspace} class="gap-2">
        <PlusIcon class="h-4 w-4" />
        New Workspace
      </Button>
      <Button variant="outline" size="lg" onclick={onOpenWorkspace} class="gap-2">
        <FolderOpenIcon class="h-4 w-4" />
        Open Workspace
      </Button>
    </div>

    <!-- Recent workspaces section -->
    {#if recentWorkspaces.length > 0}
      <div class="text-left">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Recent Workspaces
          </h2>
          <button
            onclick={onClearRecent}
            class="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear all
          </button>
        </div>
        <RecentWorkspacesList
          workspaces={recentWorkspaces}
          onSelect={onSelectRecent}
          onRemove={onRemoveRecent}
        />
      </div>
    {:else}
      <!-- Empty state for recent workspaces -->
      <div class="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
        <FolderIcon class="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p class="text-sm text-muted-foreground">
          No recent workspaces
        </p>
        <p class="mt-1 text-xs text-muted-foreground/70">
          Create or open a workspace to get started
        </p>
      </div>
    {/if}

    <!-- Keyboard shortcut hint -->
    <p class="mt-8 text-xs text-muted-foreground/60">
      Or use <kbd class="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘N</kbd> to create or
      <kbd class="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘O</kbd> to open
    </p>
  </div>
</div>
