<script lang="ts">
  import { helloApi } from '$lib/api'
  import type { HelloData } from '@coworker/shared-services'

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
      error = e instanceof Error ? e.message : 'An unexpected error occurred'
    } finally {
      loading = false
    }
  }
</script>

<div class="space-y-4 rounded-lg border p-4">
  <h2 class="text-lg font-semibold">Hello World API Test</h2>

  <div class="flex gap-2">
    <input
      type="text"
      bind:value={name}
      placeholder="Enter your name"
      class="flex-1 rounded border px-3 py-2 text-sm"
    />
    <button
      onclick={sayHello}
      disabled={loading}
      class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Say Hello'}
    </button>
  </div>

  {#if error}
    <div class="rounded bg-red-100 p-3 text-sm text-red-700">
      {error}
    </div>
  {/if}

  {#if greeting}
    <div class="rounded bg-green-100 p-3 text-sm text-green-700">
      <p class="font-medium">{greeting.message}</p>
      <p class="text-xs text-green-600">Timestamp: {greeting.timestamp}</p>
    </div>
  {/if}
</div>
