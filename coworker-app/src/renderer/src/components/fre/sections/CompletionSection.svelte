<script lang="ts">
  import { onMount } from 'svelte'
  import { Button } from '$lib/components/ui/button'
  import CheckIcon from '@lucide/svelte/icons/check'
  import RocketIcon from '@lucide/svelte/icons/rocket'

  interface Props {
    hasSelectedChannel: boolean
    hasSelectedCoworker: boolean
    onComplete: (dontShowAgain: boolean) => void
  }

  let { hasSelectedChannel, hasSelectedCoworker, onComplete }: Props = $props()

  let showContent = $state(false)
  let showChecklist = $state(false)
  let showButton = $state(false)
  let dontShowAgain = $state(false)

  onMount(() => {
    setTimeout(() => (showContent = true), 100)
    setTimeout(() => (showChecklist = true), 500)
    setTimeout(() => (showButton = true), 1000)
  })

  const checklistItems = [
    {
      label: 'Opened your workspace',
      completed: true
    },
    {
      label: 'Learned how things are organized',
      completed: true
    },
    {
      label: 'Picked a channel',
      completed: hasSelectedChannel
    },
    {
      label: 'Met your first co-worker',
      completed: hasSelectedCoworker
    },
    {
      label: 'Ready to start a conversation',
      completed: true
    }
  ]

  function handleComplete(): void {
    onComplete(dontShowAgain)
  }
</script>

<!--
  CompletionSection: Final section with completion checklist

  Shows:
  - Completion checklist (auto-checked based on user actions)
  - "Don't show again" checkbox
  - "Let's get to work" button
-->
<div
  class="flex w-full max-w-2xl flex-col items-center justify-center text-center transition-all duration-700"
  class:opacity-100={showContent}
  class:opacity-0={!showContent}
  class:translate-y-0={showContent}
  class:translate-y-8={!showContent}
>
  <!-- Celebratory icon -->
  <div class="mb-8">
    <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
      <RocketIcon class="h-10 w-10 text-accent" />
    </div>
  </div>

  <!-- Header -->
  <div class="mb-10">
    <p class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
      You're ready
    </p>
    <h2 class="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl text-balance">
      Time to get to work
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
      You've got the basics down. Your co-workers are ready to help.
    </p>
  </div>

  <!-- Completion checklist -->
  <div
    class="mb-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 transition-all duration-700 delay-200"
    class:opacity-100={showChecklist}
    class:opacity-0={!showChecklist}
    class:translate-y-0={showChecklist}
    class:translate-y-4={!showChecklist}
  >
    <p class="mb-4 text-left text-sm font-medium uppercase tracking-wider text-muted-foreground">
      Quick checklist
    </p>
    <ul class="space-y-3">
      {#each checklistItems as item}
        <li class="flex items-center gap-3 text-left">
          <div
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            class:bg-accent={item.completed}
            class:text-accent-foreground={item.completed}
            class:bg-muted={!item.completed}
            class:text-muted-foreground={!item.completed}
          >
            {#if item.completed}
              <CheckIcon class="h-3 w-3" />
            {:else}
              <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
            {/if}
          </div>
          <span
            class="text-sm transition-colors"
            class:text-foreground={item.completed}
            class:text-muted-foreground={!item.completed}
          >
            {item.label}
          </span>
        </li>
      {/each}
    </ul>
  </div>

  <!-- Don't show again checkbox -->
  <label
    class="mb-6 flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
    class:opacity-100={showButton}
    class:opacity-0={!showButton}
  >
    <input
      type="checkbox"
      bind:checked={dontShowAgain}
      class="h-4 w-4 rounded border-border text-accent focus:ring-accent focus:ring-offset-background"
    />
    <span>Don't show this tour again</span>
  </label>

  <!-- Complete button -->
  <div
    class="transition-all duration-700 delay-400"
    class:opacity-100={showButton}
    class:opacity-0={!showButton}
    class:translate-y-0={showButton}
    class:translate-y-4={!showButton}
  >
    <Button
      onclick={handleComplete}
      size="lg"
      class="h-12 gap-2 bg-accent px-8 text-accent-foreground hover:bg-accent/90"
    >
      <RocketIcon class="h-5 w-5" />
      Let's get to work
    </Button>
  </div>
</div>
