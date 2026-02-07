<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
  import UserPlusIcon from '@lucide/svelte/icons/user-plus'
  import { Button } from '$lib/components/ui/button'
  import CoworkerCard from './CoworkerCard.svelte'
  import type { Coworker } from '$lib/types'

  interface Props {
    coworkers: Coworker[]
    onBack: () => void
    onEdit: (coworker: Coworker) => void
    onArchive: (coworker: Coworker) => void
    onCreateCoworker: (channelId?: string) => void
  }

  let { coworkers, onBack, onEdit, onArchive, onCreateCoworker }: Props =
    $props()
</script>

<div class="flex h-full flex-1 flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" onclick={onBack} class="gap-2">
        <ArrowLeftIcon class="h-4 w-4" />
        Back
      </Button>
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Settings
        </p>
        <h2 class="font-serif text-xl font-medium text-foreground">
          Co-workers
        </h2>
      </div>
    </div>
    <Button onclick={onCreateCoworker} class="gap-2">
      <UserPlusIcon class="h-4 w-4" />
      Add co-worker
    </Button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-2xl p-6">
      <p class="mb-6 text-sm text-muted-foreground">
        Manage the co-workers in this workspace. Add new co-workers, edit their
        roles and descriptions, or archive those you no longer need.
      </p>
      {#if coworkers.length === 0}
        <div class="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
          <p class="text-muted-foreground">No co-workers yet</p>
          <Button onclick={onCreateCoworker} class="mt-4 gap-2">
            <UserPlusIcon class="h-4 w-4" />
            Add your first co-worker
          </Button>
        </div>
      {:else}
        <div class="grid gap-4 sm:grid-cols-1">
          {#each coworkers as coworker (coworker.id)}
            <CoworkerCard
              {coworker}
              onEdit={onEdit}
              onDelete={onArchive}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
