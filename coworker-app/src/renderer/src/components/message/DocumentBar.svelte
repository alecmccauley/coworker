<script lang="ts">
  import type { DocumentData } from '$lib/types'
  import DocumentViewDialog from './DocumentViewDialog.svelte'

  interface Props {
    documentData: DocumentData
    authorLabel: string
  }

  let { documentData, authorLabel }: Props = $props()

  let dialogOpen = $state(false)
</script>

<div class="flex flex-col gap-1 items-start">
  <span class="text-xs font-medium text-muted-foreground">{authorLabel}</span>
  <button
    type="button"
    class="max-w-2xl w-full rounded-2xl border border-accent/40 bg-accent/5 px-5 py-4 cursor-pointer hover:bg-accent/10 transition-colors text-left flex items-center gap-3"
    onclick={() => (dialogOpen = true)}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0 text-accent"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 13H8" />
      <path d="M16 17H8" />
      <path d="M16 13h-2" />
    </svg>
    <span class="text-sm font-medium text-foreground truncate">{documentData.title}</span>
  </button>
  <DocumentViewDialog
    bind:open={dialogOpen}
    title={documentData.title}
    blobId={documentData.blobId}
  />
</div>
