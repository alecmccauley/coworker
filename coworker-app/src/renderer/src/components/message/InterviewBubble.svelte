<script lang="ts">
  import { cn } from '$lib/utils.js'
  import { Button } from '$lib/components/ui/button'
  import MentionComposerInput from './MentionComposerInput.svelte'
  import type { Coworker, InterviewData } from '$lib/types'
  import { formatInterviewAnswerForDisplay, formatInterviewAnswersAsText } from '$lib/types'

  interface Props {
    interviewData: InterviewData
    authorLabel: string
    messageId: string
    channelId: string
    threadId: string
    channelCoworkers: Coworker[]
    onAnswered: (messageId: string, updatedContentShort: string) => void
  }

  let {
    interviewData,
    authorLabel,
    messageId,
    channelId,
    threadId,
    channelCoworkers,
    onAnswered
  }: Props = $props()

  const isAnswered = $derived(interviewData.answers !== null)

  let selections = $state<Record<string, string>>({})
  let otherToggles = $state<Record<string, boolean>>({})
  let otherTexts = $state<Record<string, string>>({})
  let isSubmitting = $state(false)

  const allAnswered = $derived(
    interviewData.questions.every((q) => {
      const sel = selections[q.id]
      if (!sel) return false
      if (sel === '__other__') return (otherTexts[q.id]?.trim().length ?? 0) > 0
      return true
    })
  )

  function selectOption(questionId: string, label: string): void {
    selections = { ...selections, [questionId]: label }
    otherToggles = { ...otherToggles, [questionId]: false }
  }

  function toggleOther(questionId: string): void {
    const isNowOther = !otherToggles[questionId]
    otherToggles = { ...otherToggles, [questionId]: isNowOther }
    if (isNowOther) {
      selections = { ...selections, [questionId]: '__other__' }
    } else {
      const { [questionId]: _, ...rest } = selections
      selections = rest
    }
  }

  function setOtherText(questionId: string, text: string): void {
    otherTexts = { ...otherTexts, [questionId]: text }
  }

  async function handleSubmit(): Promise<void> {
    if (!allAnswered || isSubmitting) return
    isSubmitting = true

    const answers: Record<string, string> = {}
    for (const q of interviewData.questions) {
      const sel = selections[q.id]
      if (sel === '__other__') {
        answers[q.id] = `other:${otherTexts[q.id]?.trim() ?? ''}`
      } else {
        answers[q.id] = sel ?? ''
      }
    }

    const updatedData: InterviewData = { ...interviewData, answers }
    const updatedContentShort = JSON.stringify(updatedData)

    try {
      await window.api.message.update(messageId, { contentShort: updatedContentShort })
      onAnswered(messageId, updatedContentShort)

      const answersText = formatInterviewAnswersAsText(updatedData)
      await window.api.chat.sendMessage(threadId, answersText)
    } catch (err) {
      console.error('Failed to submit interview answers:', err)
    } finally {
      isSubmitting = false
    }
  }
</script>

<div class="flex flex-col gap-1 items-start">
  <span class="text-xs font-medium text-muted-foreground">{authorLabel}</span>
  <div class="max-w-2xl w-full rounded-2xl border border-accent/40 bg-accent/5 px-5 py-4">
    {#if isAnswered}
      <div class="flex flex-col gap-3">
        {#each interviewData.questions as q (q.id)}
          <div>
            <p class="text-sm font-medium text-foreground">{q.question}</p>
            <span class="mt-1 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-foreground">
              {#if interviewData.answers?.[q.id]?.startsWith('other:')}
                {formatInterviewAnswerForDisplay(interviewData.answers[q.id])}
              {:else}
                {formatInterviewAnswerForDisplay(interviewData.answers?.[q.id] ?? '')}
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-4">
        {#each interviewData.questions as q, qi (q.id)}
          <div>
            <p class="mb-2 text-sm font-medium text-foreground">
              {qi + 1}. {q.question}
            </p>
            <div class="flex flex-wrap gap-2">
              {#each q.options as opt (opt.label)}
                <button
                  type="button"
                  class={cn(
                    'rounded-xl border px-3 py-1.5 text-sm transition-colors',
                    selections[q.id] === opt.label
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-card text-foreground hover:border-accent/60 hover:bg-accent/10'
                  )}
                  onclick={() => selectOption(q.id, opt.label)}
                >
                  {opt.label}
                </button>
              {/each}
              <button
                type="button"
                class={cn(
                  'rounded-xl border px-3 py-1.5 text-sm transition-colors',
                  otherToggles[q.id]
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:bg-accent/10'
                )}
                onclick={() => toggleOther(q.id)}
              >
                Other
              </button>
            </div>
            {#if otherToggles[q.id]}
              <div class="mt-2">
                <MentionComposerInput
                  value={otherTexts[q.id] ?? ''}
                  {channelId}
                  {threadId}
                  coworkers={channelCoworkers}
                  disabled={isSubmitting}
                  placeholder="Type your answer..."
                  onChange={(next) => setOtherText(q.id, next)}
                  onSubmit={() => void handleSubmit()}
                />
              </div>
            {/if}
          </div>
        {/each}
        <div class="flex justify-end pt-1">
          <Button
            size="sm"
            disabled={!allAnswered || isSubmitting}
            onclick={handleSubmit}
          >
            {isSubmitting ? 'Submitting...' : 'Submit answers'}
          </Button>
        </div>
      </div>
    {/if}
  </div>
</div>
