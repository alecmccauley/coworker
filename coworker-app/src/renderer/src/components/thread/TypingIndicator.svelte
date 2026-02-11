<script lang="ts">
  const ACTIVITY_PHRASES: string[] = [
    'working',
    'collaborating',
    'on it',
    'in progress',
    'getting things done',
    'on the clock',
    'crushing it',
    'making moves',
    'in the zone',
    'firing on all cylinders',
    'building something great',
    'locked in',
    'doing the thing',
    'too busy being awesome',
    'in beast mode',
    'cooking',
    'making magic happen',
    'running the show',
    'hustling (respectfully)',
    'out here winning',
    'slaying the to-do list',
    'busy being brilliant',
    'pretending to be busy',
    'definitely not on Reddit',
    'earning that coffee',
    'in a meeting about a meeting',
    'looking productive',
    'typing very fast and important things'
  ]

  const ROTATION_INTERVAL_MS = 10000

  function pickRandomPhrase(exclude?: string): string {
    if (ACTIVITY_PHRASES.length <= 1) return ACTIVITY_PHRASES[0] ?? 'working'
    const pool =
      exclude && ACTIVITY_PHRASES.length > 1
        ? ACTIVITY_PHRASES.filter((phrase) => phrase !== exclude)
        : ACTIVITY_PHRASES
    const index = Math.floor(Math.random() * pool.length)
    return pool[index]
  }

  let status = $state(pickRandomPhrase())

  $effect(() => {
    const interval = setInterval(() => {
      status = pickRandomPhrase(status)
    }, ROTATION_INTERVAL_MS)

    return () => clearInterval(interval)
  })
</script>

<div class="inline-flex items-center gap-2 text-xs text-muted-foreground">
  <span class="flex items-end gap-0.5">
    <span class="typing-dot" style="animation-delay: 0ms"></span>
    <span class="typing-dot" style="animation-delay: 150ms"></span>
    <span class="typing-dot" style="animation-delay: 300ms"></span>
  </span>
  <span>Co-workers are {status}...</span>
</div>
