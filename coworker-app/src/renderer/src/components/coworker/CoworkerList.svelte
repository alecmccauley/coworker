<script lang="ts">
  import CoworkerCard from './CoworkerCard.svelte'
  import EmptyCoworkerState from './EmptyCoworkerState.svelte'
  import type { Coworker } from '$lib/types'

  interface Props {
    coworkers: Coworker[]
    onEdit: (coworker: Coworker) => void
    onDelete: (coworker: Coworker) => void
    onSelect?: (coworker: Coworker) => void
    onCreateCoworker: () => void
  }

  let { coworkers, onEdit, onDelete, onSelect, onCreateCoworker }: Props = $props()
</script>

{#if coworkers.length === 0}
  <EmptyCoworkerState {onCreateCoworker} />
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each coworkers as coworker (coworker.id)}
      <CoworkerCard {coworker} {onEdit} {onDelete} {onSelect} />
    {/each}
  </div>
{/if}
