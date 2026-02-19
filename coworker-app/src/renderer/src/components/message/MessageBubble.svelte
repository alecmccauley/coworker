<script lang="ts">
  import { onDestroy } from "svelte";
  import CheckIcon from "@lucide/svelte/icons/check";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";
  import { copyRichContent, htmlToPlainText } from "$lib/clipboard";
  import { renderMarkdown } from "$lib/markdown.js";
  import type { Message } from "$lib/types";

  interface Props {
    message: Message;
    authorLabel: string;
    isOwn?: boolean;
    highlight?: boolean;
    activityLabel?: string;
    isQueued?: boolean;
    showRetry?: boolean;
    onRetry?: () => void;
    retryDisabled?: boolean;
  }

  let {
    message,
    authorLabel,
    isOwn = false,
    highlight = false,
    activityLabel,
    isQueued = false,
    showRetry = false,
    onRetry,
    retryDisabled = false,
  }: Props = $props();

  const content = $derived(
    message.contentShort ??
      (message.contentRef ? "Content stored in attachments." : ""),
  );

  const contentHtml = $derived(renderMarkdown(content));

  const isStreaming = $derived(message.status === "streaming");
  let isCopied = $state(false);
  let copyResetTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleCopy(): Promise<void> {
    if (!content || !contentHtml) return;

    const plainText = htmlToPlainText(contentHtml) || content;
    const copied = await copyRichContent({
      html: contentHtml,
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

  function handleRetry(): void {
    if (retryDisabled) return;
    onRetry?.();
  }

  onDestroy(() => {
    if (copyResetTimeout) {
      clearTimeout(copyResetTimeout);
    }
  });
</script>

<div
  class={cn("group flex flex-col gap-1", isOwn ? "items-end" : "items-start")}
>
  <div
    class="flex items-center gap-2 text-xs font-medium text-muted-foreground"
  >
    <span>{authorLabel}</span>
    {#if isQueued}
      <span
        class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide"
      >
        Queued
      </span>
    {/if}
    {#if content && !isStreaming}
      <Button
        variant="ghost"
        size="sm"
        class="h-6 px-2 opacity-0 transition-opacity group-hover:opacity-100"
        onclick={handleCopy}
      >
        {#if isCopied}
          <CheckIcon class="mr-1 h-3.5 w-3.5" />
          Copied
        {:else}
          <CopyIcon class="mr-1 h-3.5 w-3.5" />
          Copy
        {/if}
      </Button>
    {/if}
    {#if showRetry}
      <Button
        variant="ghost"
        size="sm"
        class="h-6 px-2 opacity-0 transition-opacity group-hover:opacity-100"
        disabled={retryDisabled}
        onclick={handleRetry}
      >
        {retryDisabled ? "Retrying..." : "Retry"}
      </Button>
    {/if}
  </div>
  <div
    class={cn(
      "max-w-2xl rounded-2xl border px-4 py-3 text-sm leading-relaxed",
      isOwn && "border-foreground bg-foreground text-background",
      !isOwn && highlight && "border-accent/40 bg-accent/10 text-foreground",
      !isOwn && !highlight && "border-border bg-card text-foreground",
    )}
  >
    {#if isStreaming && !content}
      <span class="text-xs text-muted-foreground">
        {activityLabel || "Thinking..."}
      </span>
    {:else if content}
      <div
        class={cn(
          "markdown-content prose prose-sm max-w-none",
          isOwn && "prose-invert",
        )}
      >
        {@html contentHtml}
      </div>
    {:else}
      No message content yet.
    {/if}
  </div>
</div>
