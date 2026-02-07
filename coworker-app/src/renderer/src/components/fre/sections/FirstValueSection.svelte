<script lang="ts">
  import { onMount } from 'svelte'
  import FRENavigation from '../FRENavigation.svelte'
  import FREProgress from '../FREProgress.svelte'
  import { Button } from '$lib/components/ui/button'
  import HashIcon from '@lucide/svelte/icons/hash'
  import UserIcon from '@lucide/svelte/icons/user'
  import MessageSquareIcon from '@lucide/svelte/icons/message-square'
  import CheckIcon from '@lucide/svelte/icons/check'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import type { Channel, Coworker, CreateCoworkerInput } from '$lib/types'

  interface Props {
    totalSections: number
    currentSection: number
    channels: Channel[]
    coworkers: Coworker[]
    onChannelCreated: (channel: Channel) => void
    onCoworkerCreated: (coworker: Coworker) => void
    onContinue: () => void
    onBack: () => void
    onSkip: () => void
  }

  let {
    totalSections,
    currentSection,
    channels,
    coworkers,
    onChannelCreated,
    onCoworkerCreated,
    onContinue,
    onBack,
    onSkip
  }: Props = $props()

  let showContent = $state(false)

  // Step tracking: 'channel' | 'coworker' | 'thread'
  let currentStep = $state<'channel' | 'coworker' | 'thread'>('channel')

  // Channel step
  let selectedChannel = $state<Channel | null>(null)
  let isCreatingChannel = $state(false)

  // Coworker step
  let selectedCoworker = $state<Coworker | null>(null)
  let isCreatingCoworker = $state(false)

  // Thread step
  let threadStarted = $state(false)

  // Derived: skip channel step if channels exist
  const hasExistingChannels = $derived(channels.length > 0)
  const hasExistingCoworkers = $derived(coworkers.length > 0)

  onMount(() => {
    setTimeout(() => (showContent = true), 100)

    // Auto-select first channel if exists
    if (hasExistingChannels) {
      selectedChannel = channels[0]
      currentStep = 'coworker'
    }

    // Auto-select first coworker if exists
    if (hasExistingCoworkers) {
      selectedCoworker = coworkers[0]
      if (hasExistingChannels) {
        currentStep = 'thread'
      }
    }
  })

  async function selectChannel(channel: Channel): Promise<void> {
    selectedChannel = channel
    currentStep = 'coworker'
  }

  async function createDefaultChannel(): Promise<void> {
    isCreatingChannel = true
    try {
      const channel = await window.api.channel.create({
        name: 'general',
        purpose: 'Announcements, updates, and shared context'
      })
      onChannelCreated(channel)
      selectedChannel = channel
      currentStep = 'coworker'
    } catch (error) {
      console.error('Failed to create channel:', error)
    } finally {
      isCreatingChannel = false
    }
  }

  async function selectCoworker(coworker: Coworker): Promise<void> {
    selectedCoworker = coworker
    currentStep = 'thread'
  }

  async function createDefaultCoworker(): Promise<void> {
    isCreatingCoworker = true
    try {
      const input: CreateCoworkerInput = {
        name: 'Assistant',
        description: 'A helpful general-purpose assistant'
      }
      const coworker = await window.api.coworker.create(input)
      onCoworkerCreated(coworker)
      selectedCoworker = coworker
      currentStep = 'thread'
    } catch (error) {
      console.error('Failed to create coworker:', error)
    } finally {
      isCreatingCoworker = false
    }
  }

  function acknowledgeThread(): void {
    threadStarted = true
  }

  // Check if we can continue
  const canContinue = $derived(
    (currentStep === 'channel' && selectedChannel) ||
    (currentStep === 'coworker' && selectedCoworker) ||
    (currentStep === 'thread' && threadStarted)
  )
</script>

<!--
  FirstValueSection: Interactive section to create first channel, coworker, and acknowledge thread

  Steps:
  1. Channel - Select existing or create "general"
  2. Co-worker - Select existing or create a default assistant
  3. Thread - Acknowledge understanding of conversations
-->
<div
  class="flex w-full max-w-2xl flex-col items-center justify-center text-center transition-all duration-700"
  class:opacity-100={showContent}
  class:opacity-0={!showContent}
  class:translate-y-0={showContent}
  class:translate-y-8={!showContent}
>
  <!-- Header -->
  <div class="mb-10">
    <p class="mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
      Getting started
    </p>
    <h2 class="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl text-balance">
      {#if currentStep === 'channel'}
        Pick a channel
      {:else if currentStep === 'coworker'}
        Meet your co-worker
      {:else}
        Start a conversation
      {/if}
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
      {#if currentStep === 'channel'}
        Channels organize your conversations by topic.
      {:else if currentStep === 'coworker'}
        Co-workers are AI teammates with different specialties.
      {:else}
        You're ready to start your first conversation.
      {/if}
    </p>
  </div>

  <!-- Step indicators -->
  <div class="mb-8 flex items-center gap-2">
    <!-- Channel step -->
    <div
      class={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
        currentStep === 'channel'
          ? 'bg-accent text-accent-foreground'
          : selectedChannel
            ? 'bg-accent/10 text-accent'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      {#if selectedChannel && currentStep !== 'channel'}
        <CheckIcon class="h-4 w-4" />
      {:else}
        <HashIcon class="h-4 w-4" />
      {/if}
      Channel
    </div>

    <div class="h-px w-6 bg-border"></div>

    <!-- Coworker step -->
    <div
      class={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
        currentStep === 'coworker'
          ? 'bg-accent text-accent-foreground'
          : selectedCoworker
            ? 'bg-accent/10 text-accent'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      {#if selectedCoworker && currentStep !== 'coworker'}
        <CheckIcon class="h-4 w-4" />
      {:else}
        <UserIcon class="h-4 w-4" />
      {/if}
      Co-worker
    </div>

    <div class="h-px w-6 bg-border"></div>

    <!-- Thread step -->
    <div
      class={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
        currentStep === 'thread'
          ? 'bg-accent text-accent-foreground'
          : threadStarted
            ? 'bg-accent/10 text-accent'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      {#if threadStarted && currentStep !== 'thread'}
        <CheckIcon class="h-4 w-4" />
      {:else}
        <MessageSquareIcon class="h-4 w-4" />
      {/if}
      Thread
    </div>
  </div>

  <!-- Step content -->
  <div class="mb-10 w-full max-w-md">
    {#if currentStep === 'channel'}
      <!-- Channel selection -->
      <div class="space-y-3">
        {#if channels.length > 0}
          {#each channels.slice(0, 3) as channel (channel.id)}
            <button
              onclick={() => selectChannel(channel)}
              class={`flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-accent hover:bg-card/80 ${
                selectedChannel?.id === channel.id ? 'border-accent bg-accent/5' : ''
              }`}
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <HashIcon class="h-5 w-5 text-accent" />
              </div>
              <div>
                <p class="font-medium text-foreground">{channel.name}</p>
                {#if channel.purpose}
                  <p class="text-sm text-muted-foreground">{channel.purpose}</p>
                {/if}
              </div>
            </button>
          {/each}
        {:else}
          <Button
            onclick={createDefaultChannel}
            disabled={isCreatingChannel}
            variant="outline"
            class="h-auto w-full justify-start gap-3 p-4"
          >
            {#if isCreatingChannel}
              <Loader2Icon class="h-5 w-5 animate-spin" />
              <span>Creating...</span>
            {:else}
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <HashIcon class="h-5 w-5 text-accent" />
              </div>
              <div class="text-left">
                <p class="font-medium">Create "general" channel</p>
                <p class="text-sm text-muted-foreground">
                  Announcements, updates, and shared context
                </p>
              </div>
            {/if}
          </Button>
        {/if}
      </div>
    {:else if currentStep === 'coworker'}
      <!-- Coworker selection -->
      <div class="space-y-3">
        {#if coworkers.length > 0}
          {#each coworkers.slice(0, 3) as coworker (coworker.id)}
            <button
              onclick={() => selectCoworker(coworker)}
              class={`flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-accent hover:bg-card/80 ${
                selectedCoworker?.id === coworker.id ? 'border-accent bg-accent/5' : ''
              }`}
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <UserIcon class="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p class="font-medium text-foreground">{coworker.name}</p>
                {#if coworker.description}
                  <p class="text-sm text-muted-foreground">{coworker.description}</p>
                {/if}
              </div>
            </button>
          {/each}
        {:else}
          <Button
            onclick={createDefaultCoworker}
            disabled={isCreatingCoworker}
            variant="outline"
            class="h-auto w-full justify-start gap-3 p-4"
          >
            {#if isCreatingCoworker}
              <Loader2Icon class="h-5 w-5 animate-spin" />
              <span>Creating...</span>
            {:else}
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <UserIcon class="h-5 w-5 text-muted-foreground" />
              </div>
              <div class="text-left">
                <p class="font-medium">Create your first co-worker</p>
                <p class="text-sm text-muted-foreground">A helpful general-purpose assistant</p>
              </div>
            {/if}
          </Button>
        {/if}
      </div>
    {:else}
      <!-- Thread acknowledgment -->
      <div class="space-y-4">
        <div class="rounded-xl border border-border bg-card p-6">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <MessageSquareIcon class="h-5 w-5 text-accent" />
            </div>
            <div class="text-left">
              <p class="font-medium text-foreground">Ready to chat</p>
              <p class="text-sm text-muted-foreground">
                In #{selectedChannel?.name ?? 'general'} with {selectedCoworker?.name ?? 'your co-worker'}
              </p>
            </div>
          </div>

          <p class="text-sm text-muted-foreground text-left">
            Threads are where conversations happen. Each one has a topic and your co-worker remembers the context throughout.
          </p>
        </div>

        {#if !threadStarted}
          <Button onclick={acknowledgeThread} class="w-full">
            Got it, let's continue
          </Button>
        {:else}
          <div class="flex items-center justify-center gap-2 text-accent">
            <CheckIcon class="h-5 w-5" />
            <span class="font-medium">You're all set!</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Progress and navigation -->
  <div class="mt-auto w-full max-w-md space-y-6">
    <div class="flex justify-center">
      <FREProgress {totalSections} {currentSection} />
    </div>
    <FRENavigation
      showBack={true}
      showSkip={true}
      showContinue={true}
      continueDisabled={!canContinue}
      onBack={onBack}
      onSkip={onSkip}
      onContinue={onContinue}
    />
  </div>
</div>
