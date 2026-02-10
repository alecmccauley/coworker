<script lang="ts">
  import BellIcon from '@lucide/svelte/icons/bell'
  import SparklesIcon from '@lucide/svelte/icons/sparkles'
  import { Button } from '$lib/components/ui/button'

  interface Props {
    supported: boolean
    permission: NotificationPermission
    onRequestPermission: () => void
  }

  let { supported, permission, onRequestPermission }: Props = $props()

  const headline = $derived(
    permission === 'denied'
      ? 'Notifications are off'
      : 'Don’t miss a coworker reply',
  )
  const body = $derived(
    permission === 'denied'
      ? 'Enable notifications in System Settings to see new replies instantly.'
      : 'Turn on desktop notifications so coworker updates reach you right away.',
  )
</script>

{#if supported && permission !== 'granted'}
  <div class="relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur">
    <div class="pointer-events-none absolute inset-0 opacity-70">
      <div class="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
      <div class="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl" />
      <div class="absolute inset-0 bg-gradient-to-r from-white/50 via-transparent to-white/10" />
    </div>
    <div class="relative flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-start gap-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border/70 bg-background shadow-inner">
          <BellIcon class="h-5 w-5 text-accent" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-foreground">{headline}</p>
            <SparklesIcon class="h-4 w-4 text-accent" />
          </div>
          <p class="mt-1 text-xs text-muted-foreground">{body}</p>
        </div>
      </div>
      <Button size="sm" class="gap-2" onclick={onRequestPermission}>
        Enable notifications
      </Button>
    </div>
  </div>
{/if}
