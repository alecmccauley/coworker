<script lang="ts">
  import { onMount } from 'svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check'

  interface Props {
    open: boolean
  }

  let { open = $bindable(false) }: Props = $props()

  let apiUrl = $state('')

  onMount(() => {
    window.api.config.getApiUrl().then((url) => {
      apiUrl = url
    })
  })
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="font-serif text-2xl">Legal</Dialog.Title>
      <Dialog.Description>
        Review our terms and policies.
      </Dialog.Description>
    </Dialog.Header>

    <div class="mt-4 space-y-3">
      <a
        href="{apiUrl}/terms"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors duration-200 hover:border-accent/40 hover:bg-accent/5"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <FileTextIcon class="h-5 w-5 text-accent" />
        </div>
        <div>
          <p class="text-sm font-semibold text-foreground">Terms of Service</p>
          <p class="mt-0.5 text-xs text-muted-foreground">Usage terms and conditions</p>
        </div>
      </a>

      <a
        href="{apiUrl}/privacy"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors duration-200 hover:border-accent/40 hover:bg-accent/5"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <ShieldCheckIcon class="h-5 w-5 text-accent" />
        </div>
        <div>
          <p class="text-sm font-semibold text-foreground">Privacy Policy</p>
          <p class="mt-0.5 text-xs text-muted-foreground">How we handle your data</p>
        </div>
      </a>
    </div>
  </Dialog.Content>
</Dialog.Root>
