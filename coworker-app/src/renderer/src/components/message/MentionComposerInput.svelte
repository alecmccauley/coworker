<script lang="ts">
  import TokenizedInput from './TokenizedInput.svelte'
  import type { Coworker, KnowledgeSource, WorkspaceDocument } from '$lib/types'

  interface Props {
    value: string
    channelId: string
    threadId: string
    coworkers?: Coworker[]
    disabled?: boolean
    placeholder?: string
    onChange: (value: string) => void
    onSubmit: () => void
  }

  let {
    value,
    channelId,
    threadId,
    coworkers = [],
    disabled = false,
    placeholder = '',
    onChange,
    onSubmit
  }: Props = $props()

  let availableCoworkers = $state<Coworker[]>([])
  let availableDocuments = $state<WorkspaceDocument[]>([])
  let availableSources = $state<KnowledgeSource[]>([])

  $effect(() => {
    if (coworkers.length > 0) {
      availableCoworkers = coworkers
      return
    }

    if (!channelId) {
      availableCoworkers = []
      return
    }

    void loadCoworkersFromChannel()
  })

  async function loadCoworkersFromChannel(): Promise<void> {
    try {
      availableCoworkers = await window.api.channel.listCoworkers(channelId)
    } catch (error) {
      console.error('Failed to load channel coworkers:', error)
      availableCoworkers = []
    }
  }

  async function loadDocumentsFromWorkspace(): Promise<void> {
    try {
      availableDocuments = await window.api.message.listDocumentsByWorkspace()
    } catch (error) {
      console.error('Failed to load workspace documents:', error)
      availableDocuments = []
    }
  }

  async function loadMentionableSources(): Promise<void> {
    try {
      const [workspaceSources, channelSources, threadSources] = await Promise.all([
        window.api.knowledge.listSources('workspace'),
        channelId ? window.api.knowledge.listSources('channel', channelId) : Promise.resolve([]),
        threadId ? window.api.knowledge.listSources('thread', threadId) : Promise.resolve([])
      ])

      const deduped = new Map<string, KnowledgeSource>()
      for (const source of [...workspaceSources, ...channelSources, ...threadSources]) {
        if (source.kind === 'memory') continue
        deduped.set(source.id, source)
      }

      availableSources = Array.from(deduped.values()).sort((a, b) => {
        return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
      })
    } catch (error) {
      console.error('Failed to load mentionable sources:', error)
      availableSources = []
    }
  }

  function handleMentionOpen(): void {
    void loadDocumentsFromWorkspace()
    void loadMentionableSources()
  }
</script>

<TokenizedInput
  {value}
  coworkers={availableCoworkers}
  sources={availableSources}
  documents={availableDocuments}
  {disabled}
  {placeholder}
  {onChange}
  {onSubmit}
  onMentionOpen={handleMentionOpen}
/>
