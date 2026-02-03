<script lang="ts">
  import { onMount } from 'svelte'
  import { z } from 'zod'
  import { cn } from '$lib/utils'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import * as InputOTP from '$lib/components/ui/input-otp'
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
  import Loader2Icon from '@lucide/svelte/icons/loader-2'
  import type { AuthUser } from '@coworker/shared-services'

  interface Props {
    onSuccess: (user: AuthUser) => void
    onBack: () => void
  }

  let { onSuccess, onBack }: Props = $props()

  // Step state
  type Step = 'email' | 'code'
  let currentStep = $state<Step>('email')

  // Form state
  let email = $state('')
  let code = $state('')
  let isLoading = $state(false)
  let error = $state<string | null>(null)

  // Animation states
  let mounted = $state(false)
  let showContent = $state(false)

  // Zod schemas
  const emailSchema = z.string().email('Please enter a valid email address')
  const codeSchema = z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must only contain numbers')

  // Validation state
  let emailError = $state<string | null>(null)
  let codeError = $state<string | null>(null)

  // Detect macOS for traffic light spacing
  const isMacOS = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')

  onMount(() => {
    mounted = true
    setTimeout(() => (showContent = true), 100)
  })

  function validateEmail(): boolean {
    const result = emailSchema.safeParse(email)
    if (!result.success) {
      emailError = result.error.errors[0]?.message || 'Invalid email'
      return false
    }
    emailError = null
    return true
  }

  function validateCode(): boolean {
    const result = codeSchema.safeParse(code)
    if (!result.success) {
      codeError = result.error.errors[0]?.message || 'Invalid code'
      return false
    }
    codeError = null
    return true
  }

  async function handleRequestCode(): Promise<void> {
    if (!validateEmail()) return

    isLoading = true
    error = null

    try {
      await window.api.auth.requestCode(email)
      currentStep = 'code'
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        const errorObj = err as { message: string }
        if (errorObj.message.includes("couldn't find")) {
          error = "We couldn't find an account with that email. Please check and try again."
        } else if (errorObj.message.includes('Too many')) {
          error = "Slow down! Please wait a moment before trying again."
        } else {
          error = errorObj.message
        }
      } else {
        error = "Couldn't reach the server. Please check your connection."
      }
    } finally {
      isLoading = false
    }
  }

  async function handleVerifyCode(): Promise<void> {
    if (!validateCode()) return

    isLoading = true
    error = null

    try {
      const result = await window.api.auth.verifyCode(email, code)
      onSuccess(result.user)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        const errorObj = err as { message: string }
        if (errorObj.message.includes('expired')) {
          error = "That code has expired. Let's send you a fresh one."
        } else if (errorObj.message.includes("doesn't look right")) {
          error = errorObj.message
        } else if (errorObj.message.includes('Too many attempts')) {
          error = "Too many attempts. Please request a new code."
        } else if (errorObj.message.includes('Too many')) {
          error = "Slow down! Please wait a moment before trying again."
        } else {
          error = errorObj.message
        }
      } else {
        error = "Couldn't reach the server. Please check your connection."
      }
    } finally {
      isLoading = false
    }
  }

  function handleBackToEmail(): void {
    currentStep = 'email'
    code = ''
    error = null
    codeError = null
  }

  function handleCodeComplete(value: string): void {
    code = value
    if (value.length === 6) {
      handleVerifyCode()
    }
  }
</script>

<div class="auth-container flex min-h-screen flex-col">
  <!-- Invisible draggable title bar -->
  <header
    class="titlebar-drag-region fixed left-0 right-0 top-0 z-50 h-12"
    class:pl-24={isMacOS}
  ></header>

  <!-- Back button -->
  <button
    onclick={currentStep === 'email' ? onBack : handleBackToEmail}
    class="titlebar-no-drag fixed left-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-foreground"
    class:left-24={isMacOS}
    style="-webkit-app-region: no-drag;"
    aria-label="Go back"
  >
    <ChevronLeftIcon class="h-5 w-5" />
  </button>

  <!-- Main content -->
  <main class="flex flex-1 flex-col items-center justify-center px-8">
    <div
      class="w-full max-w-md transition-all duration-700 ease-out"
      class:opacity-100={showContent}
      class:opacity-0={!showContent}
      class:translate-y-0={showContent}
      class:translate-y-4={!showContent}
    >
      <!-- Decorative accent line -->
      <div
        class="mx-auto mb-8 h-px w-16 transition-all duration-1000 ease-out"
        class:opacity-100={mounted}
        class:opacity-0={!mounted}
        style="background: linear-gradient(90deg, transparent, oklch(0.65 0.14 25), transparent);"
      ></div>

      <!-- Title -->
      <h1 class="mb-2 text-center font-serif text-4xl font-medium tracking-tight text-foreground">
        {currentStep === 'email' ? 'Welcome back' : 'Check your email'}
      </h1>

      <!-- Subtitle -->
      <p class="mb-8 text-center text-lg text-muted-foreground">
        {#if currentStep === 'email'}
          Enter your email to sign in to your account.
        {:else}
          We sent a 6-digit code to <span class="font-medium text-foreground">{email}</span>
        {/if}
      </p>

      <!-- Error message -->
      {#if error}
        <div class="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p class="text-sm text-destructive">{error}</p>
        </div>
      {/if}

      <!-- Email step -->
      {#if currentStep === 'email'}
        <form onsubmit={(e) => { e.preventDefault(); handleRequestCode(); }} class="space-y-6">
          <div class="space-y-2">
            <Label for="email" class="text-sm font-medium text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              bind:value={email}
              oninput={() => emailError = null}
              class={cn(
                "h-12 px-4 text-base transition-all duration-200 focus:ring-2 focus:ring-accent/20",
                emailError && "border-destructive"
              )}
              disabled={isLoading}
              autocomplete="email"
              autofocus
            />
            {#if emailError}
              <p class="text-sm text-destructive">{emailError}</p>
            {/if}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !email}
            class="h-12 w-full text-base font-medium"
          >
            {#if isLoading}
              <Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            {:else}
              Continue
            {/if}
          </Button>
        </form>
      {/if}

      <!-- Code step -->
      {#if currentStep === 'code'}
        <form onsubmit={(e) => { e.preventDefault(); handleVerifyCode(); }} class="space-y-6">
          <div class="flex flex-col items-center space-y-4">
            <Label for="code" class="sr-only">
              Verification code
            </Label>
            <InputOTP.Root
              maxlength={6}
              bind:value={code}
              onValueChange={handleCodeComplete}
              disabled={isLoading}
              class="gap-2"
            >
              {#snippet children({ cells })}
                <InputOTP.Group class="flex gap-2">
                  {#each cells as cell, i (i)}
                    <InputOTP.Slot
                      {cell}
                      class="h-14 w-12 rounded-lg border-2 border-input bg-background text-center text-2xl font-medium transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  {/each}
                </InputOTP.Group>
              {/snippet}
            </InputOTP.Root>
            {#if codeError}
              <p class="text-sm text-destructive">{codeError}</p>
            {/if}
          </div>

          <Button
            type="submit"
            disabled={isLoading || code.length !== 6}
            class="h-12 w-full text-base font-medium"
          >
            {#if isLoading}
              <Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            {:else}
              Verify code
            {/if}
          </Button>

          <p class="text-center text-sm text-muted-foreground">
            Didn't receive the code?
            <button
              type="button"
              onclick={handleRequestCode}
              disabled={isLoading}
              class="font-medium text-accent underline-offset-4 hover:underline disabled:opacity-50"
            >
              Send again
            </button>
          </p>
        </form>
      {/if}
    </div>
  </main>

  <!-- Subtle ambient decoration -->
  <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
    <div
      class="absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-0 blur-3xl transition-opacity duration-[3000ms]"
      class:opacity-30={mounted}
      style="background: radial-gradient(circle, oklch(0.65 0.14 25 / 15%), transparent 70%);"
    ></div>
    <div
      class="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full opacity-0 blur-3xl transition-opacity duration-[3000ms] delay-1000"
      class:opacity-20={mounted}
      style="background: radial-gradient(circle, oklch(0.65 0.14 25 / 10%), transparent 70%);"
    ></div>
  </div>
</div>

<style>
  .auth-container {
    background-color: oklch(0.975 0.005 85);
  }

  :global(.dark) .auth-container {
    background-color: oklch(0.16 0.01 60);
  }

  .titlebar-no-drag {
    -webkit-app-region: no-drag;
  }
</style>
