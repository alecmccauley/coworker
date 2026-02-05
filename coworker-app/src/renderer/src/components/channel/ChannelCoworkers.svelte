<script lang="ts">
  import { onMount } from 'svelte'
  import UsersIcon from '@lucide/svelte/icons/users'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import XIcon from '@lucide/svelte/icons/x'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import type { Coworker } from '$lib/types'

  interface Props {
    channelId: string
  }

  let { channelId }: Props = $props()

  let assignedCoworkers = $state<Coworker[]>([])
  let allCoworkers = $state<Coworker[]>([])
  let isLoading = $state(true)
  let showAddDialog = $state(false)
  let isAdding = $state(false)
  let removingId = $state<string | null>(null)

  // Coworkers that are NOT assigned to the channel
  let availableCoworkers = $derived(
    allCoworkers.filter((c) => !assignedCoworkers.some((ac) => ac.id === c.id))
  )

  onMount(async () => {
    await loadData()
  })

  $effect(() => {
    // Reload when channelId changes
    void loadData()
  })

  async function loadData(): Promise<void> {
    isLoading = true
    try {
      const [assigned, all] = await Promise.all([
        window.api.channel.listCoworkers(channelId),
        window.api.coworker.list()
      ])
      assignedCoworkers = assigned
      allCoworkers = all
    } catch (error) {
      console.error('Failed to load coworkers:', error)
    } finally {
      isLoading = false
    }
  }

  async function handleAddCoworker(coworkerId: string): Promise<void> {
    isAdding = true
    try {
      await window.api.channel.addCoworker(channelId, coworkerId)
      await loadData()
      showAddDialog = false
    } catch (error) {
      console.error('Failed to add coworker:', error)
    } finally {
      isAdding = false
    }
  }

  async function handleRemoveCoworker(coworkerId: string): Promise<void> {
    removingId = coworkerId
    try {
      await window.api.channel.removeCoworker(channelId, coworkerId)
      await loadData()
    } catch (error) {
      console.error('Failed to remove coworker:', error)
    } finally {
      removingId = null
    }
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <div class="flex items-center gap-2">
        <UsersIcon class="h-4 w-4 text-muted-foreground" />
        <h3 class="font-medium text-foreground">Co-workers</h3>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">
        Co-workers assigned to this channel
      </p>
    </div>
    <Button
      size="sm"
      variant="outline"
      class="gap-2"
      onclick={() => (showAddDialog = true)}
      disabled={availableCoworkers.length === 0}
    >
      <PlusIcon class="h-4 w-4" />
      Add
    </Button>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center py-4">
      <Loader2Icon class="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  {:else if assignedCoworkers.length === 0}
    <div class="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
      <p class="text-sm text-muted-foreground">No co-workers assigned</p>
      {#if availableCoworkers.length > 0}
        <Button
          size="sm"
          variant="ghost"
          class="mt-2 gap-2"
          onclick={() => (showAddDialog = true)}
        >
          <PlusIcon class="h-4 w-4" />
          Add a co-worker
        </Button>
      {:else}
        <p class="mt-1 text-xs text-muted-foreground/70">
          Create co-workers in settings to add them here
        </p>
      {/if}
    </div>
  {:else}
    <div class="space-y-2">
      {#each assignedCoworkers as coworker (coworker.id)}
        <div
          class="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-foreground">{coworker.name}</p>
            {#if coworker.description}
              <p class="truncate text-xs text-muted-foreground">{coworker.description}</p>
            {/if}
          </div>
          <button
            class="ml-2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onclick={() => handleRemoveCoworker(coworker.id)}
            disabled={removingId === coworker.id}
          >
            {#if removingId === coworker.id}
              <Loader2Icon class="h-4 w-4 animate-spin" />
            {:else}
              <XIcon class="h-4 w-4" />
            {/if}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<Dialog.Root bind:open={showAddDialog}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Add Co-worker to Channel</Dialog.Title>
      <Dialog.Description>
        Select a co-worker to add to this channel.
      </Dialog.Description>
    </Dialog.Header>

    <div class="max-h-64 space-y-2 overflow-y-auto py-4">
      {#if availableCoworkers.length === 0}
        <p class="py-4 text-center text-sm text-muted-foreground">
          All co-workers are already assigned to this channel.
        </p>
      {:else}
        {#each availableCoworkers as coworker (coworker.id)}
          <button
            class="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted"
            onclick={() => handleAddCoworker(coworker.id)}
            disabled={isAdding}
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-foreground">{coworker.name}</p>
              {#if coworker.description}
                <p class="truncate text-xs text-muted-foreground">{coworker.description}</p>
              {/if}
            </div>
            {#if isAdding}
              <Loader2Icon class="h-4 w-4 animate-spin text-muted-foreground" />
            {:else}
              <PlusIcon class="h-4 w-4 text-muted-foreground" />
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
