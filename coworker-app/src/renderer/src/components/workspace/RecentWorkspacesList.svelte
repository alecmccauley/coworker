<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder'
  import XIcon from '@lucide/svelte/icons/x'
  import type { RecentWorkspace } from '$lib/types'

  interface Props {
    workspaces: RecentWorkspace[]
    onSelect: (workspace: RecentWorkspace) => void
    onRemove: (path: string) => void
  }

  let { workspaces, onSelect, onRemove }: Props = $props()

  /**
   * Format the last opened date as a relative time string
   */
  function formatRelativeTime(isoDate: string): string {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  /**
   * Shorten a path for display
   */
  function shortenPath(path: string): string {
    // Replace home directory with ~
    const home = path.includes('/Users/')
      ? path.replace(/^\/Users\/[^/]+/, '~')
      : path

    // Truncate if too long
    if (home.length > 50) {
      const parts = home.split('/')
      if (parts.length > 3) {
        return `${parts[0]}/.../${parts.slice(-2).join('/')}`
      }
    }

    return home
  }
</script>

<ul class="divide-y divide-border rounded-xl border border-border bg-card">
  {#each workspaces as workspace (workspace.path)}
    <li class="group relative">
      <button
        onclick={() => onSelect(workspace)}
        class="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FolderIcon class="h-5 w-5 text-muted-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-foreground">
            {workspace.name}
          </p>
          <p class="truncate text-xs text-muted-foreground">
            {shortenPath(workspace.path)}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-xs text-muted-foreground">
            {formatRelativeTime(workspace.lastOpened)}
          </p>
        </div>
      </button>
      <!-- Remove button -->
      <button
        onclick={(e) => {
          e.stopPropagation()
          onRemove(workspace.path)
        }}
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        title="Remove from recent"
      >
        <XIcon class="h-4 w-4" />
      </button>
    </li>
  {/each}
</ul>
