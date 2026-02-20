<script lang="ts">
  import { onDestroy } from "svelte";
  import CheckIcon from "@lucide/svelte/icons/check";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import ReplyIcon from "@lucide/svelte/icons/reply";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";
  import { copyPlainText, copyRichContent, htmlToPlainText } from "$lib/clipboard";
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
    canReply?: boolean;
    onRequestReply?: (messageId: string) => void;
    replyReference?: {
      authorLabel: string;
      content: string;
    } | null;
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
    canReply = false,
    onRequestReply,
    replyReference = null,
  }: Props = $props();

  const content = $derived(
    message.contentShort ??
      (message.contentRef ? "Content stored in attachments." : ""),
  );

  const contentHtml = $derived(renderMarkdown(content));

  const isStreaming = $derived(message.status === "streaming");
  let isCopied = $state(false);
  let isMarkdownCopied = $state(false);
  let copyResetTimeout: ReturnType<typeof setTimeout> | null = null;
  let markdownCopyResetTimeout: ReturnType<typeof setTimeout> | null = null;
  let contextMenuOpen = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);

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

  async function handleCopyMarkdown(): Promise<void> {
    if (!content) return;
    const copied = await copyPlainText(content);
    if (!copied) return;

    isMarkdownCopied = true;
    if (markdownCopyResetTimeout) {
      clearTimeout(markdownCopyResetTimeout);
    }
    markdownCopyResetTimeout = setTimeout(() => {
      isMarkdownCopied = false;
    }, 1800);
  }

  function openContextMenu(event: MouseEvent): void {
    event.preventDefault();
    if (!content && !canReply) return;
    contextMenuX = event.clientX;
    contextMenuY = event.clientY;
    contextMenuOpen = true;
  }

  function closeContextMenu(): void {
    contextMenuOpen = false;
  }

  function handleReply(): void {
    closeContextMenu();
    onRequestReply?.(message.id);
  }

  function handleRetry(): void {
    if (retryDisabled) return;
    onRetry?.();
  }

  function handleGlobalPointerDown(event: MouseEvent): void {
    if (!contextMenuOpen) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      contextMenuOpen = false;
      return;
    }
    if (target.closest(`[data-message-context-menu="${message.id}"]`)) {
      return;
    }
    contextMenuOpen = false;
  }

  $effect(() => {
    if (!contextMenuOpen) return;

    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        contextMenuOpen = false;
      }
    };

    window.addEventListener("keydown", onEscape);
    window.addEventListener("pointerdown", handleGlobalPointerDown);
    window.addEventListener("scroll", closeContextMenu, true);
    window.addEventListener("blur", closeContextMenu);

    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
      window.removeEventListener("scroll", closeContextMenu, true);
      window.removeEventListener("blur", closeContextMenu);
    };
  });

  onDestroy(() => {
    if (copyResetTimeout) {
      clearTimeout(copyResetTimeout);
    }
    if (markdownCopyResetTimeout) {
      clearTimeout(markdownCopyResetTimeout);
    }
  });
</script>

<div
  class={cn("group flex flex-col gap-1", isOwn ? "items-end" : "items-start")}
  oncontextmenu={openContextMenu}
>
  {#if replyReference}
    <div
      class={cn(
        "max-w-2xl rounded-lg border px-3 py-2 text-xs",
        isOwn
          ? "border-background/35 bg-background/10 text-background/90"
          : "border-border bg-muted/60 text-muted-foreground",
      )}
    >
      <p class="font-medium">{replyReference.authorLabel}</p>
      <p class="mt-0.5 line-clamp-2">{replyReference.content}</p>
    </div>
  {/if}
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

{#if contextMenuOpen}
  <div
    data-message-context-menu={message.id}
    class="fixed z-[70] min-w-44 rounded-lg border border-border bg-card p-1 shadow-xl"
    style={`left: ${contextMenuX}px; top: ${contextMenuY}px;`}
  >
    {#if canReply}
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
        onclick={handleReply}
      >
        <ReplyIcon class="h-4 w-4" />
        Reply...
      </button>
    {/if}
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
      onclick={async () => {
        closeContextMenu();
        await handleCopy();
      }}
    >
      <CopyIcon class="h-4 w-4" />
      {isCopied ? "Copied" : "Copy"}
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
      onclick={async () => {
        closeContextMenu();
        await handleCopyMarkdown();
      }}
    >
      <CopyIcon class="h-4 w-4" />
      {isMarkdownCopied ? "Copied markdown" : "Copy as Markdown"}
    </button>
  </div>
{/if}
