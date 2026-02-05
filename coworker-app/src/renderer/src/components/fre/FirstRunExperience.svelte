<script lang="ts">
  import type { WorkspaceInfo, Channel, Coworker } from '$lib/types'
  import FREOverlay from './FREOverlay.svelte'
  import {
    HelloSection,
    MentalModelSection,
    UIOrientationSection,
    FirstValueSection,
    KnowledgeGuideSection,
    HowItWorksSection,
    PrivacySection,
    CompletionSection
  } from './sections'

  interface Props {
    workspace: WorkspaceInfo
    channels: Channel[]
    coworkers: Coworker[]
    onComplete: (dontShowAgain: boolean) => void
    onSkip: () => void
    onChannelCreated: (channel: Channel) => void
    onCoworkerCreated: (coworker: Coworker) => void
  }

  let {
    workspace,
    channels,
    coworkers,
    onComplete,
    onSkip,
    onChannelCreated,
    onCoworkerCreated
  }: Props = $props()

  // Section navigation state
  // Sections: 0=Hello, 1=MentalModel, 2=UIOrientation, 3=FirstValue, 4=Knowledge, 5=HowItWorks, 6=Privacy, 7=Completion
  const TOTAL_SECTIONS = 8
  let currentSection = $state(0)

  // Track interactive completions
  let selectedChannel = $state<Channel | null>(null)
  let selectedCoworker = $state<Coworker | null>(null)
  let isTourActive = $state(false)

  // Derived: auto-select if content exists
  $effect(() => {
    if (channels.length > 0 && !selectedChannel) {
      selectedChannel = channels[0]
    }
  })

  $effect(() => {
    if (coworkers.length > 0 && !selectedCoworker) {
      selectedCoworker = coworkers[0]
    }
  })

  function goToSection(section: number): void {
    if (section >= 0 && section < TOTAL_SECTIONS) {
      currentSection = section
    }
  }

  function goNext(): void {
    if (currentSection < TOTAL_SECTIONS - 1) {
      currentSection++
    }
  }

  function goBack(): void {
    if (currentSection > 0) {
      currentSection--
    }
  }

  function handleChannelCreated(channel: Channel): void {
    selectedChannel = channel
    onChannelCreated(channel)
  }

  function handleCoworkerCreated(coworker: Coworker): void {
    selectedCoworker = coworker
    onCoworkerCreated(coworker)
  }

  function handleComplete(dontShowAgain: boolean): void {
    onComplete(dontShowAgain)
  }
</script>

<!--
  FirstRunExperience: Root orchestrator for the FRE

  Manages navigation between sections and tracks state.
  Sections flow:
  1. Hello (welcome animation)
  2. Mental Model (hierarchy explanation)
  3. UI Orientation (spotlight tour)
  4. First Value (create channel/coworker)
  5. Knowledge Guide (scope explanation)
  6. How It Works (AI explanation)
  7. Privacy (local-first security)
  8. Completion (checklist + finish)
-->
<FREOverlay transparentBackdrop={currentSection === 2 && isTourActive}>
  {#if currentSection === 0}
    <HelloSection
      workspaceName={workspace.manifest.name}
      onContinue={goNext}
    />
  {:else if currentSection === 1}
    <MentalModelSection
      totalSections={TOTAL_SECTIONS}
      {currentSection}
      onContinue={goNext}
      onBack={goBack}
      onSkip={onSkip}
    />
  {:else if currentSection === 2}
    <UIOrientationSection
      totalSections={TOTAL_SECTIONS}
      {currentSection}
      onContinue={goNext}
      onBack={goBack}
      onSkip={onSkip}
      onTourStateChange={(isActive) => (isTourActive = isActive)}
    />
  {:else if currentSection === 3}
    <FirstValueSection
      totalSections={TOTAL_SECTIONS}
      {currentSection}
      {channels}
      {coworkers}
      onChannelCreated={handleChannelCreated}
      onCoworkerCreated={handleCoworkerCreated}
      onContinue={goNext}
      onBack={goBack}
      onSkip={onSkip}
    />
  {:else if currentSection === 4}
    <KnowledgeGuideSection
      totalSections={TOTAL_SECTIONS}
      {currentSection}
      onContinue={goNext}
      onBack={goBack}
      onSkip={onSkip}
    />
  {:else if currentSection === 5}
    <HowItWorksSection
      totalSections={TOTAL_SECTIONS}
      {currentSection}
      onContinue={goNext}
      onBack={goBack}
      onSkip={onSkip}
    />
  {:else if currentSection === 6}
    <PrivacySection
      totalSections={TOTAL_SECTIONS}
      {currentSection}
      onContinue={goNext}
      onBack={goBack}
      onSkip={onSkip}
    />
  {:else if currentSection === 7}
    <CompletionSection
      hasSelectedChannel={selectedChannel !== null}
      hasSelectedCoworker={selectedCoworker !== null}
      onComplete={handleComplete}
    />
  {/if}
</FREOverlay>
