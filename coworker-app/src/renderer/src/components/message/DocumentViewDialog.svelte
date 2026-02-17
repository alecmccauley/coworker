<script lang="ts">
  import { onDestroy } from "svelte";
  import CheckIcon from "@lucide/svelte/icons/check";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { copyRichContent, htmlToPlainText } from "$lib/clipboard";
  import { renderMarkdown } from "$lib/markdown";
  import { Input } from "$lib/components/ui/input";
  import DocumentVersionSidebar from "./DocumentVersionSidebar.svelte";
  import type { DocumentVersion } from "$lib/types";

  interface Props {
    open: boolean;
    title: string;
    blobId: string;
    messageId?: string;
  }

  let {
    open = $bindable(false),
    title,
    blobId,
    messageId = "",
  }: Props = $props();

  let markdownHtml = $state("");
  let markdownText = $state("");
  let loading = $state(false);
  let error = $state("");
  let versions = $state<DocumentVersion[]>([]);
  let selectedVersionId = $state<string | null>(null);
  let commitMessage = $state("");
  let versionsLoading = $state(false);
  let isCopied = $state(false);
  let copyResetTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (open && blobId) {
      loading = true;
      error = "";
      markdownHtml = "";
      markdownText = "";
      window.api.blob
        .read(blobId)
        .then((data: Uint8Array | null) => {
          if (data) {
            const text = new TextDecoder().decode(data);
            markdownText = text;
            markdownHtml = renderMarkdown(text);
          } else {
            error = "Document not found";
          }
        })
        .catch(() => {
          error = "Failed to load document";
        })
        .finally(() => {
          loading = false;
        });
    }
  });

  $effect(() => {
    if (open && messageId) {
      void loadVersions();
    }
  });

  async function loadVersions(): Promise<void> {
    versionsLoading = true;
    try {
      versions = await window.api.documentHistory.list(messageId);
    } catch (err) {
      console.error("Failed to load document versions:", err);
      versions = [];
    } finally {
      versionsLoading = false;
    }
  }

  async function selectVersion(versionId: string): Promise<void> {
    selectedVersionId = versionId;
    try {
      const result = await window.api.documentHistory.get(versionId);
      if (result?.content) {
        markdownText = result.content;
        markdownHtml = renderMarkdown(result.content);
      }
    } catch (err) {
      console.error("Failed to load document version:", err);
    }
  }

  async function revertVersion(versionId: string): Promise<void> {
    if (!messageId) return;
    if (!commitMessage.trim()) {
      commitMessage = "Revert document";
    }
    try {
      await window.api.documentHistory.revert({
        messageId,
        versionId,
        commitMessage: commitMessage.trim(),
        authorType: "user",
      });
      commitMessage = "";
      await loadVersions();
    } catch (err) {
      console.error("Failed to revert document:", err);
    }
  }

  async function handleCopy(): Promise<void> {
    if (loading || error || !markdownHtml) return;
    const plainText = markdownText || htmlToPlainText(markdownHtml);
    if (!plainText) return;

    const copied = await copyRichContent({
      html: markdownHtml,
      text: plainText,
    });
    if (!copied) return;

    isCopied = true;
    if (copyResetTimeout) {
      clearTimeout(copyResetTimeout);
    }
    copyResetTimeout = setTimeout(() => {
      isCopied = false;
    }, 1800);
  }

  onDestroy(() => {
    if (copyResetTimeout) {
      clearTimeout(copyResetTimeout);
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-5xl max-h-[80vh] flex flex-col">
    <Dialog.Header>
      <div class="flex items-center justify-between gap-3">
        <Dialog.Title>{title}</Dialog.Title>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || Boolean(error) || !markdownHtml}
          onclick={handleCopy}
        >
          {#if isCopied}
            <CheckIcon class="mr-1 h-4 w-4" />
            Copied
          {:else}
            <CopyIcon class="mr-1 h-4 w-4" />
            Copy
          {/if}
        </Button>
      </div>
    </Dialog.Header>
    <div class="flex flex-1 overflow-hidden">
      <div class="flex-1 overflow-y-auto">
        {#if loading}
          <div class="flex items-center justify-center py-8">
            <span class="text-sm text-muted-foreground"
              >Loading document...</span
            >
          </div>
        {:else if error}
          <div class="flex items-center justify-center py-8">
            <span class="text-sm text-destructive">{error}</span>
          </div>
        {:else}
          <div class="prose prose-sm max-w-none">
            {@html markdownHtml}
          </div>
        {/if}
      </div>
      {#if messageId}
        <div
          class="w-72 border-l border-border bg-muted/20 px-4 py-4 flex flex-col gap-3"
        >
          <div>
            <label class="text-xs font-medium text-muted-foreground"
              >Commit message</label
            >
            <Input
              placeholder="Describe this change"
              value={commitMessage}
              oninput={(event) =>
                (commitMessage = (event.target as HTMLInputElement).value)}
            />
          </div>
          <DocumentVersionSidebar
            {versions}
            {selectedVersionId}
            onSelect={selectVersion}
            onRevert={revertVersion}
            loading={versionsLoading}
          />
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
