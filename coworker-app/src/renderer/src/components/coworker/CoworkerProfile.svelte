<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { cn } from '$lib/utils.js'
  import { renderMarkdown } from '$lib/markdown.js'
  import ScopedSources from '../knowledge/ScopedSources.svelte'
  import type { Channel, Coworker, KnowledgeItem, MemoryItem, Thread } from '$lib/types'

  interface Props {
    coworker: Coworker
    channels: Channel[]
    onEdit: (coworker: Coworker) => void
    onArchive: (coworker: Coworker) => void
  }

  let { coworker, channels, onEdit, onArchive }: Props = $props()

  type TabId = 'about' | 'knowledge' | 'memories' | 'history'
  const tabs: { id: TabId; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'memories', label: 'Memories' },
    { id: 'history', label: 'History' }
  ]

  let activeTab = $state<TabId>('about')
  let knowledgeItems = $state<KnowledgeItem[]>([])
  let isLoadingKnowledge = $state(false)
  let knowledgeTitle = $state('')
  let knowledgeSummary = $state('')
  let isAddingKnowledge = $state(false)

  let memories = $state<MemoryItem[]>([])
  let isLoadingMemories = $state(false)

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

  $effect(() => {
    if (activeTab === 'memories') {
      void loadMemories()
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

  async function loadMemories(): Promise<void> {
    isLoadingMemories = true
    try {
      memories = await window.api.memory.list(coworker.id)
    } catch (error) {
      console.error('Failed to load coworker memories:', error)
    } finally {
      isLoadingMemories = false
    }
  }

  async function handleForgetMemory(memoryId: string): Promise<void> {
    const confirmed = window.confirm('Forget this memory for this co-worker?')
    if (!confirmed) return
    try {
      await window.api.memory.forget(memoryId, coworker.id)
      await loadMemories()
    } catch (error) {
      console.error('Failed to forget memory:', error)
    }
  }

  function formatDate(value: Date | string): string {
    const date = typeof value === 'string' ? new Date(value) : value
    return date.toLocaleDateString()
  }

  // Parse defaults JSON to extract personality traits
  interface DefaultBehaviors {
    tone?: string
    formatting?: string
    guardrails?: string[]
  }

  function parseDefaults(value: string | null): DefaultBehaviors | null {
    if (!value) return null
    try {
      return JSON.parse(value) as DefaultBehaviors
    } catch {
      return null
    }
  }

  const defaults = $derived(parseDefaults(coworker.defaultsJson))

  // Get the description to show - prefer templateDescription, fall back to description
  const aboutDescription = $derived(
    coworker.templateDescription || coworker.description || null
  )

  const aboutDescriptionHtml = $derived(aboutDescription ? renderMarkdown(aboutDescription) : '')
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
        <!-- About this co-worker -->
        <div class="rounded-xl border border-border bg-card p-6">
          <h3 class="font-serif text-lg font-medium text-foreground">About this co-worker</h3>
          {#if aboutDescription}
            <div class="markdown-content prose prose-sm max-w-none mt-3 text-muted-foreground">
              {@html aboutDescriptionHtml}
            </div>
          {:else}
            <p class="mt-3 text-muted-foreground/70 italic">
              No description yet. Edit this co-worker to add one.
            </p>
          {/if}
        </div>

        <!-- Personality section - only show if defaults exist with tone or formatting -->
        {#if defaults && (defaults.tone || defaults.formatting)}
          <div class="rounded-xl border border-border bg-card p-6">
            <h3 class="font-serif text-lg font-medium text-foreground">Personality</h3>
            <div class="mt-4 space-y-3">
              {#if defaults.tone}
                <div class="flex items-start gap-3">
                  <span class="text-sm font-medium text-foreground/80 min-w-[80px]">Tone</span>
                  <span class="text-sm text-muted-foreground capitalize">{defaults.tone}</span>
                </div>
              {/if}
              {#if defaults.formatting}
                <div class="flex items-start gap-3">
                  <span class="text-sm font-medium text-foreground/80 min-w-[80px]">Style</span>
                  <span class="text-sm text-muted-foreground capitalize">{defaults.formatting}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
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
          <ScopedSources
            scopeType="coworker"
            scopeId={coworker.id}
            title="Co-worker Sources"
            description="References and files that should always stay with this co-worker"
          />
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
    {:else if activeTab === 'memories'}
      <div class="rounded-xl border border-border bg-card p-6">
        <h3 class="text-lg font-semibold text-foreground">Memories</h3>
        {#if isLoadingMemories}
          <p class="mt-3 text-sm text-muted-foreground">Loading memories...</p>
        {:else if memories.length === 0}
          <p class="mt-3 text-sm text-muted-foreground">
            No memories yet. We'll save key facts and preferences here.
          </p>
        {:else}
          <div class="mt-4 space-y-3">
            {#each memories as memory (memory.id)}
              <div class="rounded-lg border border-border/70 bg-card/70 p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-foreground">{memory.content}</p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Added {formatDate(memory.addedAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onclick={() => handleForgetMemory(memory.id)}
                  >
                    Forget
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
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
