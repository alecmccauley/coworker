<script lang="ts">
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import Trash2Icon from '@lucide/svelte/icons/trash-2'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Button } from '$lib/components/ui/button'
  import type { Coworker } from '$lib/types'

  interface Props {
    coworker: Coworker
    onEdit: (coworker: Coworker) => void
    onDelete: (coworker: Coworker) => void
    onSelect?: (coworker: Coworker) => void
  }

  let { coworker, onEdit, onDelete, onSelect }: Props = $props()

  /**
   * Get initials from coworker name
   */
  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  /**
   * Generate a consistent color based on the coworker ID
   */
  function getAvatarColor(id: string): string {
    // Use the first few characters of the ID to generate a hue
    const hue = (id.charCodeAt(0) * 7 + id.charCodeAt(1) * 13) % 360
    return `oklch(0.75 0.12 ${hue})`
  }
</script>

<div class="group relative rounded-xl border border-border bg-card p-5 transition-all hover:border-accent/30 hover:shadow-sm">
  <!-- Action menu -->
  <div class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button variant="ghost" size="icon-sm" {...props}>
            <MoreHorizontalIcon class="h-4 w-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item onclick={() => onEdit(coworker)}>
          <PencilIcon class="mr-2 h-4 w-4" />
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          class="text-destructive focus:text-destructive"
          onclick={() => onDelete(coworker)}
        >
          <Trash2Icon class="mr-2 h-4 w-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <!-- Card content -->
  <button
    class="flex w-full items-start gap-4 text-left"
    onclick={() => onSelect?.(coworker)}
  >
    <!-- Avatar -->
    <div
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
      style="background-color: {getAvatarColor(coworker.id)};"
    >
      {getInitials(coworker.name)}
    </div>

    <!-- Info -->
    <div class="min-w-0 flex-1 pt-1">
      <h3 class="truncate font-semibold text-foreground">
        {coworker.name}
      </h3>
      {#if coworker.description}
        <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {coworker.description}
        </p>
      {:else}
        <p class="mt-1 text-sm italic text-muted-foreground/50">
          No description
        </p>
      {/if}
    </div>
  </button>
</div>
