<script lang="ts">
  import { helloApi } from '$lib/api'
  import type { HelloData } from '@coworker/shared-services'
  import { Button } from '$lib/components/ui/button/index.js'

  let name = $state('')
  let greeting = $state<HelloData | null>(null)
  let error = $state<string | null>(null)
  let loading = $state(false)

  async function sayHello() {
    loading = true
    error = null
    greeting = null

    try {
      greeting = await helloApi.sayHello(name || undefined)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong. Let\'s try that again.'
    } finally {
      loading = false
    }
  }
</script>

<div class="rounded-xl border border-border bg-card p-6">
  <h3 class="text-lg font-semibold text-card-foreground">
    Hello World API Test
  </h3>
  <p class="mt-1 text-sm text-muted-foreground">
    Test the connection to your API co-worker.
  </p>

  <div class="mt-6 flex gap-3">
    <input
      type="text"
      bind:value={name}
      placeholder="Enter your name"
      class="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
    />
    <Button onclick={sayHello} disabled={loading} variant="default" size="lg">
      {loading ? 'Loading...' : 'Say Hello'}
    </Button>
  </div>

  {#if error}
    <div class="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
      <p class="text-sm text-destructive">
        {error}
      </p>
    </div>
  {/if}

  {#if greeting}
    <div class="mt-4 rounded-lg border border-accent/20 bg-accent/10 p-4">
      <p class="font-medium text-foreground">
        {greeting.message}
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        Timestamp: {greeting.timestamp}
      </p>
    </div>
  {/if}
</div>
