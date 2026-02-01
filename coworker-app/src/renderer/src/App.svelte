<script lang="ts">
  import AppShell from './components/AppShell.svelte'
  import HelloWorld from './components/HelloWorld.svelte'
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js'
  import { buttonVariants } from '$lib/components/ui/button/index.js'
</script>

<AppShell>
  <!-- Welcome Section -->
  <section class="mb-12">
    <h2 class="font-serif text-4xl font-medium tracking-tight text-foreground text-balance">
      Welcome to Coworker
    </h2>
    <p class="mt-4 max-w-2xl text-lg text-muted-foreground">
      Where AI feels like a team you already know how to work with.
    </p>
  </section>

  <!-- API Test Section -->
  <section class="mb-12">
    <HelloWorld />
  </section>

  <!-- Dialog Demo Section -->
  <section>
    <h3 class="mb-4 text-xl font-semibold text-foreground">Component Demo</h3>
    <AlertDialog.Root>
      <AlertDialog.Trigger class={buttonVariants({ variant: 'outline' })}>
        Show Dialog
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
          <AlertDialog.Description>
            This action cannot be undone. This will permanently delete your account and remove
            your data from our servers.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action>Continue</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  </section>
</AppShell>
