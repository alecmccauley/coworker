<script lang="ts">
  import type { AuthUser, CreateFeedbackInput, FeedbackType } from '@coworker/shared-services'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label'
  import { cn } from '$lib/utils'

  interface Props {
    open: boolean
    user: AuthUser | null
    onClose?: () => void
  }

  let { open = $bindable(false), user, onClose }: Props = $props()

  let type = $state<FeedbackType>('bug')
  let message = $state('')
  let includeScreenshot = $state(true)
  let canContact = $state(true)
  let isSubmitting = $state(false)
  let errorMessage = $state<string | null>(null)
  let successMessage = $state<string | null>(null)

  $effect(() => {
    if (!open) {
      type = 'bug'
      message = ''
      includeScreenshot = true
      canContact = Boolean(user)
      isSubmitting = false
      errorMessage = null
      successMessage = null
      onClose?.()
    }
  })

  $effect(() => {
    if (!user) {
      canContact = false
    }
  })

  const typeOptions: { value: FeedbackType; title: string; description: string }[] = [
    {
      value: 'bug',
      title: 'Error / Bug',
      description: 'Something isn’t working the way it should.',
    },
    {
      value: 'improvement',
      title: 'Could Be Improved',
      description: 'A workflow or detail that could be better.',
    },
    {
      value: 'like',
      title: 'Something I Liked',
      description: 'A moment worth celebrating.',
    },
  ]

  async function handleSubmit(): Promise<void> {
    errorMessage = null
    successMessage = null

    if (!message.trim()) {
      errorMessage = 'Please add a short description before sending.'
      return
    }

    const payload: CreateFeedbackInput = {
      type,
      message: message.trim(),
      includeScreenshot,
      canContact,
    }

    isSubmitting = true
    try {
      await window.api.feedback.submit(payload)
      successMessage = 'Sent. Thank you for helping us improve Coworker.'
      open = false
    } catch (error) {
      console.error('[Feedback] Failed to submit:', error)
      errorMessage =
        error instanceof Error
          ? error.message
          : 'We could not send your feedback. Please try again.'
    } finally {
      isSubmitting = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title class="font-serif text-2xl">Send feedback</Dialog.Title>
      <Dialog.Description class="text-pretty">
        Share what you’re seeing, what you want, or what you loved. We read every note.
      </Dialog.Description>
    </Dialog.Header>

    <div class="mt-6 space-y-6">
      <div class="space-y-3">
        <Label class="text-sm font-medium">What kind of feedback is this?</Label>
        <div class="grid gap-3 md:grid-cols-3">
          {#each typeOptions as option}
            <button
              type="button"
              class={cn(
                'flex h-full flex-col items-start gap-2 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                type === option.value
                  ? 'border-accent/60 bg-accent/10'
                  : 'border-border bg-card hover:border-accent/40',
              )}
              aria-pressed={type === option.value}
              onclick={() => (type = option.value)}
            >
              <span class="text-sm font-semibold text-foreground">{option.title}</span>
              <span class="text-xs text-muted-foreground">{option.description}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <Label for="feedback-message" class="text-sm font-medium">Your feedback</Label>
        <Textarea
          id="feedback-message"
          rows={6}
          placeholder="Tell us what happened, what you expected, or what you’d love to see next."
          bind:value={message}
        />
      </div>

      <div class="rounded-xl border border-border bg-muted/40 p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-foreground">Include a screenshot</p>
            <p class="mt-1 text-xs text-muted-foreground">
              We’ll capture what’s visible in this window to help us understand the context.
            </p>
          </div>
          <button
            type="button"
            class={cn(
              'h-6 w-11 rounded-full border transition',
              includeScreenshot
                ? 'border-accent/70 bg-accent/70'
                : 'border-border bg-muted',
            )}
            aria-pressed={includeScreenshot}
            onclick={() => (includeScreenshot = !includeScreenshot)}
          >
            <span
              class={cn(
                'block h-5 w-5 rounded-full bg-background shadow transition',
                includeScreenshot ? 'translate-x-5' : 'translate-x-0.5',
              )}
            ></span>
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-muted/40 p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-foreground">You can contact me</p>
            <p class="mt-1 text-xs text-muted-foreground">
              Let us follow up if we have questions about your feedback.
            </p>
          </div>
          <button
            type="button"
            class={cn(
              'h-6 w-11 rounded-full border transition',
              canContact ? 'border-accent/70 bg-accent/70' : 'border-border bg-muted',
            )}
            aria-pressed={canContact}
            disabled={!user}
            onclick={() => (canContact = !canContact)}
          >
            <span
              class={cn(
                'block h-5 w-5 rounded-full bg-background shadow transition',
                canContact ? 'translate-x-5' : 'translate-x-0.5',
              )}
            ></span>
          </button>
        </div>
      </div>

      {#if !user}
        <p class="text-xs text-muted-foreground">
          You’re not signed in. This feedback will be submitted anonymously.
        </p>
      {/if}

      {#if errorMessage}
        <p class="text-sm text-destructive">{errorMessage}</p>
      {/if}
      {#if successMessage}
        <p class="text-sm text-accent">{successMessage}</p>
      {/if}

      <div class="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onclick={() => (open = false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onclick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
