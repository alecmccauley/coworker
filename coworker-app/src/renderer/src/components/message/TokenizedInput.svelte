<script lang="ts">
  import UserIcon from '@lucide/svelte/icons/user'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import FileStackIcon from '@lucide/svelte/icons/file-stack'
  import { cn } from '$lib/utils.js'
  import type { Coworker, KnowledgeSource, WorkspaceDocument } from '$lib/types'
  import { parseDocumentData } from '$lib/types/document'

  interface Props {
    value: string
    coworkers: Coworker[]
    sources?: KnowledgeSource[]
    documents?: WorkspaceDocument[]
    disabled?: boolean
    placeholder?: string
    onChange: (value: string) => void
    onSubmit: () => void
    onMentionOpen?: () => void
  }

  type MentionType = 'coworker' | 'document' | 'source'
  type MentionToken = {
    type: 'mention'
    mentionType: MentionType
    id: string
    name: string
  }
  type TextToken = { type: 'text'; value: string }
  type Token = MentionToken | TextToken

  type MentionItem = {
    mentionType: MentionType
    id: string
    name: string
    subtitle?: string
  }

  const mentionPattern = /@\{(coworker|document|source):([^|}]+)\|([^}]+)\}/g

  let {
    value,
    coworkers,
    sources = [],
    documents = [],
    disabled = false,
    placeholder = '',
    onChange,
    onSubmit,
    onMentionOpen
  }: Props = $props()

  let editor: HTMLDivElement | null = $state(null)
  let isFocused = $state(false)
  let mentionOpen = $state(false)
  let mentionQuery = $state('')
  let activeIndex = $state(0)
  let mentionAnchor: { node: Text; startIndex: number } | null = $state(null)
  let mentionWasOpen = $state(false)

  const documentMentions = $derived.by(() => {
    return documents
      .map((doc) => {
        const parsed = parseDocumentData(doc.contentShort)
        if (!parsed) return null
        return {
          mentionType: 'document' as const,
          id: doc.messageId,
          name: parsed.title ?? 'Untitled document',
          subtitle: doc.threadTitle
            ? `${doc.channelName} · ${doc.threadTitle}`
            : doc.channelName
        }
      })
      .filter((item): item is MentionItem => Boolean(item))
  })

  const mentionItems = $derived.by(() => {
    const coworkerItems: MentionItem[] = coworkers.map((coworker) => ({
      mentionType: 'coworker',
      id: coworker.id,
      name: coworker.name,
      subtitle: coworker.shortDescription ?? undefined
    }))

    const sourceItems: MentionItem[] = sources.map((source) => ({
      mentionType: 'source',
      id: source.id,
      name: source.name?.trim() || `Source ${source.id.slice(0, 6)}`,
      subtitle: describeSource(source)
    }))

    return [...coworkerItems, ...documentMentions, ...sourceItems]
  })

  const filteredMentions = $derived.by(() => {
    const query = mentionQuery.trim().toLowerCase()
    if (!query) return mentionItems
    return mentionItems.filter((item) =>
      item.name.toLowerCase().includes(query)
    )
  })

  const isEmpty = $derived.by(() => {
    const current = editor ? serializeFromDom(editor) : value
    return current.trim().length === 0
  })

  $effect(() => {
    if (!editor) return
    const current = serializeFromDom(editor)
    if (current !== value) {
      renderFromValue(editor, value)
      placeCaretAtEnd(editor)
    }
  })

  function parseTokens(raw: string): Token[] {
    if (!raw) return [{ type: 'text', value: '' }]
    const tokens: Token[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = mentionPattern.exec(raw))) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'text', value: raw.slice(lastIndex, match.index) })
      }
      const mentionType = match[1] as MentionType
      tokens.push({ type: 'mention', mentionType, id: match[2], name: match[3] })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < raw.length) {
      tokens.push({ type: 'text', value: raw.slice(lastIndex) })
    }
    return tokens
  }

  function renderFromValue(container: HTMLDivElement, raw: string): void {
    const tokens = parseTokens(raw)
    container.innerHTML = ''
    for (const token of tokens) {
      if (token.type === 'mention') {
        container.appendChild(
          createMentionChip(token.mentionType, token.id, token.name)
        )
        continue
      }
      if (token.value.length === 0) {
        continue
      }
      const parts = token.value.split('\n')
      parts.forEach((part, index) => {
        if (part.length > 0) {
          container.appendChild(document.createTextNode(part))
        }
        if (index < parts.length - 1) {
          container.appendChild(document.createElement('br'))
        }
      })
    }
  }

  function createMentionChip(
    mentionType: MentionType,
    id: string,
    name: string
  ): HTMLSpanElement {
    const chip = document.createElement('span')
    chip.dataset.mentionId = id
    chip.dataset.mentionName = name
    chip.dataset.mentionType = mentionType
    chip.setAttribute('contenteditable', 'false')
    chip.className =
      'inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-sm font-medium text-foreground'
    if (mentionType === 'document') {
      chip.textContent = `@Doc: ${name}`
      return chip
    }
    if (mentionType === 'source') {
      chip.textContent = `@Source: ${name}`
      return chip
    }
    chip.textContent = `@${name}`
    return chip
  }

  function describeSource(source: KnowledgeSource): string {
    const scopeLabel =
      source.scopeType === 'workspace'
        ? 'Workspace source'
        : source.scopeType === 'channel'
          ? 'Channel source'
          : source.scopeType === 'thread'
            ? 'Thread source'
            : source.scopeType === 'coworker'
              ? 'Co-worker source'
              : 'Source'

    const kindLabel =
      source.kind === 'file'
        ? 'File'
        : source.kind === 'url'
          ? 'Link'
          : source.kind === 'text'
            ? 'Text'
            : 'Memory'

    return `${scopeLabel} · ${kindLabel}`
  }

  function serializeFromDom(container: HTMLDivElement): string {
    const parts: string[] = []

    const walk = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent ?? '')
        return
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        if (element.dataset.mentionId && element.dataset.mentionName) {
          const mentionType = element.dataset.mentionType ?? 'coworker'
          parts.push(
            `@{${mentionType}:${element.dataset.mentionId}|${element.dataset.mentionName}}`
          )
          return
        }
        if (element.tagName === 'BR') {
          parts.push('\n')
          return
        }
      }

      node.childNodes.forEach((child) => walk(child))
    }

    container.childNodes.forEach((child) => walk(child))
    return parts.join('')
  }

  function placeCaretAtEnd(container: HTMLDivElement): void {
    const selection = window.getSelection()
    if (!selection) return
    const range = document.createRange()
    range.selectNodeContents(container)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function getSelectionAnchor(): { node: Text; offset: number } | null {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    const anchorNode = range.startContainer
    if (anchorNode.nodeType === Node.TEXT_NODE) {
      return { node: anchorNode as Text, offset: range.startOffset }
    }
    return null
  }

  function updateMentionContext(): void {
    const anchor = getSelectionAnchor()
    if (!anchor) {
      closeMention()
      return
    }

    const text = anchor.node.textContent ?? ''
    const beforeCursor = text.slice(0, anchor.offset)
    const atIndex = beforeCursor.lastIndexOf('@')
    if (atIndex < 0) {
      closeMention()
      return
    }

    const charBefore = atIndex === 0 ? '' : beforeCursor[atIndex - 1]
    if (charBefore && !/\s/.test(charBefore)) {
      closeMention()
      return
    }

    const query = beforeCursor.slice(atIndex + 1)
    if (/\s/.test(query)) {
      closeMention()
      return
    }

    mentionOpen = true
    mentionQuery = query
    mentionAnchor = { node: anchor.node, startIndex: atIndex }
    activeIndex = 0

    if (!mentionWasOpen) {
      mentionWasOpen = true
      onMentionOpen?.()
    }
  }

  function closeMention(): void {
    mentionOpen = false
    mentionQuery = ''
    mentionAnchor = null
    activeIndex = 0
    mentionWasOpen = false
  }

  function insertMention(item: MentionItem): void {
    if (!editor || !mentionAnchor) return

    const { node, startIndex } = mentionAnchor
    const text = node.textContent ?? ''
    const before = text.slice(0, startIndex)
    const selection = window.getSelection()
    const offset = selection?.getRangeAt(0).startOffset ?? text.length
    const after = text.slice(offset)

    const parent = node.parentNode
    if (!parent) return

    const fragment = document.createDocumentFragment()
    if (before.length > 0) {
      fragment.appendChild(document.createTextNode(before))
    }
    fragment.appendChild(
      createMentionChip(item.mentionType, item.id, item.name)
    )
    fragment.appendChild(document.createTextNode(' '))
    if (after.length > 0) {
      fragment.appendChild(document.createTextNode(after))
    }

    parent.replaceChild(fragment, node)
    closeMention()
    syncValue()
    placeCaretAfterMention(parent, item.name)
  }

  function placeCaretAfterMention(parent: Node, name: string): void {
    if (!editor) return
    const selection = window.getSelection()
    if (!selection) return

    const range = document.createRange()
    const nodes = Array.from(parent.childNodes)
    const chipIndex = nodes.findIndex((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false
      const element = node as HTMLElement
      return element.dataset.mentionName === name
    })

    const afterNode = nodes[chipIndex + 1]
    if (afterNode && afterNode.nodeType === Node.TEXT_NODE) {
      range.setStart(afterNode, 1)
    } else {
      range.selectNodeContents(editor)
      range.collapse(false)
    }

    selection.removeAllRanges()
    selection.addRange(range)
  }

  function syncValue(): void {
    if (!editor) return
    const serialized = serializeFromDom(editor)
    onChange(serialized)
  }

  function handleInput(): void {
    syncValue()
    updateMentionContext()
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (disabled) return

    if (event.key === 'Backspace') {
      const anchor = getSelectionAnchor()
      if (anchor && anchor.offset === 0) {
        const parent = anchor.node.parentNode
        const siblings = parent ? Array.from(parent.childNodes) : []
        const index = siblings.indexOf(anchor.node)
        const previous = siblings[index - 1]
        if (previous && previous.nodeType === Node.ELEMENT_NODE) {
          const element = previous as HTMLElement
          if (element.dataset.mentionId) {
            event.preventDefault()
            parent?.removeChild(previous)
            syncValue()
            return
          }
        }
      }
    }

    if (mentionOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        activeIndex =
          filteredMentions.length === 0
            ? 0
            : (activeIndex + 1) % filteredMentions.length
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        activeIndex =
          filteredMentions.length === 0
            ? 0
            : (activeIndex - 1 + filteredMentions.length) % filteredMentions.length
        return
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        const selection = filteredMentions[activeIndex]
        if (selection) {
          insertMention(selection)
        } else {
          closeMention()
        }
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        closeMention()
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
      return
    }

    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault()
      document.execCommand('insertLineBreak')
      syncValue()
    }
  }

  function handleFocus(): void {
    isFocused = true
  }

  function handleBlur(): void {
    isFocused = false
    closeMention()
  }

  function handleMentionClick(item: MentionItem): void {
    insertMention(item)
  }

  function handleRootMousedown(event: MouseEvent): void {
    if (!editor || event.target === editor) return
    if (editor.contains(event.target as Node)) return
    event.preventDefault()
    editor.focus()
  }
</script>

<div class="relative" onmousedown={handleRootMousedown}>
  <div
    bind:this={editor}
    role="textbox"
    aria-multiline="true"
    contenteditable={!disabled}
    class={cn(
      'min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm',
      disabled && 'cursor-not-allowed opacity-50'
    )}
    oninput={handleInput}
    onkeydown={handleKeydown}
    onfocus={handleFocus}
    onblur={handleBlur}
  ></div>

  {#if isEmpty && !isFocused}
    <div class="pointer-events-none absolute left-3 top-2 text-base text-muted-foreground md:text-sm">
      {placeholder}
    </div>
  {/if}

  {#if mentionOpen}
    <div class="absolute bottom-full left-0 mb-2 w-full rounded-md border border-border bg-card p-1 shadow-sm">
      {#if filteredMentions.length === 0}
        <div class="px-3 py-2 text-sm text-muted-foreground">
          No matching mentions.
        </div>
      {:else}
        {#each filteredMentions as item, index (`${item.mentionType}:${item.id}`)}
          <button
            type="button"
            class={cn(
              'flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors',
              index === activeIndex
                ? 'bg-muted text-foreground'
                : 'text-foreground hover:bg-muted'
            )}
            onmousedown={(event) => event.preventDefault()}
            onclick={() => handleMentionClick(item)}
          >
            <div class="flex items-center gap-2">
              {#if item.mentionType === 'document'}
                <FileTextIcon class="h-4 w-4 text-muted-foreground" />
              {:else if item.mentionType === 'source'}
                <FileStackIcon class="h-4 w-4 text-muted-foreground" />
              {:else}
                <UserIcon class="h-4 w-4 text-muted-foreground" />
              {/if}
              <span class="text-sm font-medium">{item.name}</span>
            </div>
            {#if item.subtitle}
              <span class="text-xs text-muted-foreground">{item.subtitle}</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
