<script lang="ts">
  import UsersIcon from '@lucide/svelte/icons/users'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import UserIcon from '@lucide/svelte/icons/user'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import { Button } from '$lib/components/ui/button'
  import type { Channel, Coworker } from '$lib/types'

  interface Props {
    channel: Channel
    coworkers: Coworker[]
    onCreateCoworker: (channelId?: string) => void
    onAssignmentsUpdated: () => Promise<void> | void
    variant?: 'full' | 'banner'
  }

  let {
    channel,
    coworkers,
    onCreateCoworker,
    onAssignmentsUpdated,
    variant = 'full'
  }: Props = $props()

  let isAssigning = $state<string | null>(null)

  async function handleAddCoworker(coworkerId: string): Promise<void> {
    isAssigning = coworkerId
    try {
      await window.api.channel.addCoworker(channel.id, coworkerId)
      await onAssignmentsUpdated()
    } catch (error) {
      console.error('Failed to add coworker to channel:', error)
    } finally {
      isAssigning = null
    }
  }
</script>

<div
  class={`rounded-2xl border border-dashed border-border bg-card/60 px-6 py-8 ${
    variant === 'banner' ? 'mx-6 my-4' : 'mx-auto max-w-2xl'
  }`}
>
  <div class="flex items-start gap-4">
    <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-muted">
      <UsersIcon class="h-6 w-6 text-muted-foreground" />
    </div>
    <div class="flex-1">
      <h3 class="font-serif text-xl font-medium text-foreground">
        No co-workers in #{channel.name}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        This channel needs at least one co-worker before you can start new work.
      </p>

      {#if coworkers.length > 0}
        <div class="mt-5">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Add someone already in your workspace
          </p>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            {#each coworkers as coworker (coworker.id)}
              <button
                class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted"
                onclick={() => handleAddCoworker(coworker.id)}
                disabled={isAssigning !== null}
              >
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <UserIcon class="h-4 w-4 text-muted-foreground" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-foreground">
                    {coworker.name}
                  </p>
                  {#if coworker.shortDescription}
                    <p class="truncate text-xs text-muted-foreground">
                      {coworker.shortDescription}
                    </p>
                  {/if}
                </div>
                {#if isAssigning === coworker.id}
                  <Loader2Icon class="h-4 w-4 animate-spin text-muted-foreground" />
                {:else}
                  <PlusIcon class="h-4 w-4 text-muted-foreground" />
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <div class="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-4">
          <p class="text-sm text-muted-foreground">
            You do not have any co-workers yet. Create your first one to get started.
          </p>
          <Button class="mt-3 gap-2" onclick={() => onCreateCoworker(channel.id)}>
            <PlusIcon class="h-4 w-4" />
            Create a co-worker
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>
