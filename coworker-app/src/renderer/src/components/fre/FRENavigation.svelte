<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'

  interface Props {
    showBack?: boolean
    showSkip?: boolean
    showContinue?: boolean
    continueLabel?: string
    backLabel?: string
    skipLabel?: string
    continueDisabled?: boolean
    onBack?: () => void
    onSkip?: () => void
    onContinue?: () => void
  }

  let {
    showBack = false,
    showSkip = false,
    showContinue = true,
    continueLabel = 'Continue',
    backLabel = 'Back',
    skipLabel = 'Skip tour',
    continueDisabled = false,
    onBack,
    onSkip,
    onContinue
  }: Props = $props()
</script>

<!--
  FRENavigation: Navigation controls for the FRE

  Provides Continue, Back, and Skip buttons with consistent styling.
-->
<div class="flex items-center justify-between gap-4">
  <!-- Left side: Back button -->
  <div class="flex-1">
    {#if showBack && onBack}
      <button
        onclick={onBack}
        class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon class="h-4 w-4" />
        {backLabel}
      </button>
    {/if}
  </div>

  <!-- Center: Skip button -->
  <div class="flex-shrink-0">
    {#if showSkip && onSkip}
      <button
        onclick={onSkip}
        class="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {skipLabel}
      </button>
    {/if}
  </div>

  <!-- Right side: Continue button -->
  <div class="flex flex-1 justify-end">
    {#if showContinue && onContinue}
      <Button
        onclick={onContinue}
        disabled={continueDisabled}
        size="lg"
        class="h-11 gap-2 px-6"
      >
        {continueLabel}
        <ChevronRightIcon class="h-4 w-4" />
      </Button>
    {/if}
  </div>
</div>
