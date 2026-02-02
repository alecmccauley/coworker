<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import UsersIcon from '@lucide/svelte/icons/users'
  import PlusIcon from '@lucide/svelte/icons/plus'

  interface Props {
    onCreateCoworker: () => void
  }

  let { onCreateCoworker }: Props = $props()
</script>

<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
    <UsersIcon class="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 class="mb-2 text-lg font-semibold text-foreground">
    No co-workers yet
  </h3>
  <p class="mb-6 max-w-sm text-muted-foreground">
    Create your first co-worker to start building your AI team.
    Each co-worker can have unique skills and personalities.
  </p>
  <Button onclick={onCreateCoworker} class="gap-2">
    <PlusIcon class="h-4 w-4" />
    Create Co-worker
  </Button>
</div>
