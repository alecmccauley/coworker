<script lang="ts">
  interface Props {
    totalSections: number
    currentSection: number
  }

  let { totalSections, currentSection }: Props = $props()
</script>

<!--
  FREProgress: Dot-based progress indicator for the FRE

  Shows which section the user is on with animated transitions.
-->
<div class="flex items-center gap-3" role="progressbar" aria-valuenow={currentSection + 1} aria-valuemin={1} aria-valuemax={totalSections}>
  {#each { length: totalSections } as _, i}
    <div
      class={`h-2 w-2 rounded-full transition-all duration-500 ${
        currentSection === i
          ? 'bg-accent scale-125'
          : i < currentSection
            ? 'bg-accent/60'
            : 'bg-border'
      }`}
      aria-hidden="true"
    ></div>
  {/each}
</div>
