<script lang="ts">
  import HelloWorld from './components/HelloWorld.svelte'
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
</script>

<main class="container mx-auto p-8">
  <h1 class="mb-8 text-2xl font-bold">Coworker App</h1>

  <div class="mb-8">
    <HelloWorld />
  </div>

  <AlertDialog.Root>
    <AlertDialog.Trigger class={buttonVariants({ variant: "outline" })}>
      Show Dialog
    </AlertDialog.Trigger>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
        <AlertDialog.Description>
          This action cannot be undone. This will permanently delete your account
          and remove your data from our servers.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action>Continue</AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
</main>
