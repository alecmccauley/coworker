<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { cn } from '$lib/utils.js'
  import type { Channel, Coworker, KnowledgeItem, Thread } from '$lib/types'

  interface Props {
    coworker: Coworker
    channels: Channel[]
    onEdit: (coworker: Coworker) => void
    onArchive: (coworker: Coworker) => void
  }

  let { coworker, channels, onEdit, onArchive }: Props = $props()

  type TabId = 'about' | 'knowledge' | 'tools' | 'history'
  const tabs: { id: TabId; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'tools', label: 'Tools' },
    { id: 'history', label: 'History' }
  ]

  let activeTab = $state<TabId>('about')
  let knowledgeItems = $state<KnowledgeItem[]>([])
  let isLoadingKnowledge = $state(false)
  let knowledgeTitle = $state('')
  let knowledgeSummary = $state('')
  let isAddingKnowledge = $state(false)

  let historyThreads = $state<{ thread: Thread; channelName: string }[]>([])
  let isLoadingHistory = $state(false)

  $effect(() => {
    if (activeTab === 'knowledge') {
      void loadKnowledge()
    }
  })

  $effect(() => {
    if (activeTab === 'history') {
      void loadHistory()
    }
  })

  async function loadKnowledge(): Promise<void> {
    isLoadingKnowledge = true
    try {
      knowledgeItems = await window.api.knowledge.list('coworker', coworker.id)
    } catch (error) {
      console.error('Failed to load coworker knowledge:', error)
    } finally {
      isLoadingKnowledge = false
    }
  }

  async function handleAddKnowledge(): Promise<void> {
    if (!knowledgeSummary.trim()) return
    isAddingKnowledge = true
    try {
      await window.api.knowledge.add({
        scopeType: 'coworker',
        scopeId: coworker.id,
        title: knowledgeTitle.trim() || 'Co-worker note',
        summary: knowledgeSummary.trim()
      })
      knowledgeTitle = ''
      knowledgeSummary = ''
      await loadKnowledge()
    } catch (error) {
      console.error('Failed to add coworker knowledge:', error)
    } finally {
      isAddingKnowledge = false
    }
  }

  async function loadHistory(): Promise<void> {
    isLoadingHistory = true
    historyThreads = []
    try {
      const results: { thread: Thread; channelName: string }[] = []
      for (const channel of channels) {
        const threads = await window.api.thread.list(channel.id)
        for (const thread of threads) {
          const messages = await window.api.message.list(thread.id)
          const hasCoworkerMessage = messages.some(
            (message) =>
              message.authorType === 'coworker' && message.authorId === coworker.id
          )
          if (hasCoworkerMessage) {
            results.push({ thread, channelName: channel.name })
          }
        }
      }
      historyThreads = results
    } catch (error) {
      console.error('Failed to load coworker history:', error)
    } finally {
      isLoadingHistory = false
    }
  }

  function formatDate(value: Date | string): string {
    const date = typeof value === 'string' ? new Date(value) : value
    return date.toLocaleDateString()
  }

  function formatDefaultsJson(value: string | null): string {
    if (!value) return 'No defaults configured yet.'
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
</script>

<div class="flex flex-1 flex-col px-8 py-6">
  <div class="mb-8 flex items-center justify-between">
    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Co-worker</p>
      <h1 class="font-serif text-3xl font-medium text-foreground">{coworker.name}</h1>
      {#if coworker.description}
        <p class="mt-2 text-muted-foreground">{coworker.description}</p>
      {/if}
    </div>
    <div class="flex gap-2">
      <Button variant="outline" onclick={() => onEdit(coworker)}>Edit</Button>
      <Button variant="destructive" onclick={() => onArchive(coworker)}>Archive</Button>
    </div>
  </div>

  <div class="flex items-center gap-2 border-b border-border">
    {#each tabs as tab (tab.id)}
      <button
        class={cn(
          'px-4 py-3 text-sm font-medium transition-colors',
          activeTab === tab.id
            ? 'border-b-2 border-accent text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="flex-1 py-6">
    {#if activeTab === 'about'}
      <div class="space-y-6">
        <div class="rounded-xl border border-border bg-card p-6">
          <h3 class="text-lg font-semibold text-foreground">Role prompt</h3>
          <p class="mt-2 text-sm text-muted-foreground">
            {coworker.rolePrompt || 'Add a role prompt to guide this co-worker.'}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-card p-6">
          <h3 class="text-lg font-semibold text-foreground">Defaults</h3>
          <pre class="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
{formatDefaultsJson(coworker.defaultsJson)}
          </pre>
        </div>
      </div>
    {:else if activeTab === 'knowledge'}
      <div class="space-y-6">
        <div class="rounded-xl border border-border bg-card p-6">
          <h3 class="text-lg font-semibold text-foreground">Pinned knowledge</h3>
          {#if isLoadingKnowledge}
            <p class="mt-3 text-sm text-muted-foreground">Loading co-worker notes...</p>
          {:else if knowledgeItems.length === 0}
            <p class="mt-3 text-sm text-muted-foreground">
              No notes yet. Add guidance that should always stay with this co-worker.
            </p>
          {:else}
            <div class="mt-4 space-y-3">
              {#each knowledgeItems as item (item.id)}
                <div class="rounded-lg border border-border/70 bg-card/70 p-4">
                  <p class="text-sm font-medium text-foreground">{item.title}</p>
                  {#if item.summary}
                    <p class="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="rounded-xl border border-border bg-card p-6">
          <h3 class="text-lg font-semibold text-foreground">Add new note</h3>
          <div class="mt-4 space-y-3">
            <Input
              bind:value={knowledgeTitle}
              placeholder="Note title (optional)"
              disabled={isAddingKnowledge}
            />
            <Textarea
              bind:value={knowledgeSummary}
              rows={3}
              placeholder="What should this co-worker always know?"
              disabled={isAddingKnowledge}
            />
            <Button
              onclick={handleAddKnowledge}
              disabled={!knowledgeSummary.trim() || isAddingKnowledge}
            >
              {isAddingKnowledge ? 'Saving...' : 'Save note'}
            </Button>
          </div>
        </div>
      </div>
    {:else if activeTab === 'tools'}
      <div class="rounded-xl border border-border bg-card p-6">
        <h3 class="text-lg font-semibold text-foreground">Tools access</h3>
        <p class="mt-2 text-sm text-muted-foreground">
          Tools policy will appear here once tool access is configured for this co-worker.
        </p>
      </div>
    {:else if activeTab === 'history'}
      <div class="rounded-xl border border-border bg-card p-6">
        <h3 class="text-lg font-semibold text-foreground">Conversation history</h3>
        {#if isLoadingHistory}
          <p class="mt-3 text-sm text-muted-foreground">Loading recent activity...</p>
        {:else if historyThreads.length === 0}
          <p class="mt-3 text-sm text-muted-foreground">
            No conversations yet. Start a thread and invite this co-worker.
          </p>
        {:else}
          <div class="mt-4 space-y-3">
            {#each historyThreads as entry (entry.thread.id)}
              <div class="rounded-lg border border-border/70 bg-card/70 p-4">
                <p class="text-sm font-medium text-foreground">
                  {entry.thread.title || 'Untitled conversation'}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {entry.channelName} · {formatDate(entry.thread.updatedAt)}
                </p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
