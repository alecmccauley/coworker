<script lang="ts">
  import { cn } from '$lib/utils.js'

  interface Props {
    label: string
    variant?: 'pill' | 'inline'
  }

  let { label, variant = 'pill' }: Props = $props()

  const wrapperClass = $derived(
    cn(
      'inline-flex items-center gap-2 text-xs font-medium',
      variant === 'pill' &&
        'rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-foreground',
      variant === 'inline' && 'text-muted-foreground'
    )
  )
</script>

<div class={wrapperClass} aria-live="polite">
  <span class="relative flex h-2 w-2 items-center justify-center">
    <span class="absolute h-2 w-2 rounded-full bg-accent/30 animate-ping"></span>
    <span class="h-1.5 w-1.5 rounded-full bg-accent"></span>
  </span>
  <span>{label}</span>
</div>
