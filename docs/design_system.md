# Coworker Design System

> A comprehensive guide to building consistent, premium UI in the Coworker application.

This document serves as the authoritative reference for implementing UI components and patterns in the Coworker Electron app. It builds upon the [Visual Identity](./VISUAL_IDENTITY.md) and [Brand Guide](./BRAND_GUIDE.md) to provide actionable implementation guidance.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Theming with CSS Variables](#theming-with-css-variables)
3. [Typography](#typography)
4. [Color Usage](#color-usage)
5. [Spacing & Layout](#spacing--layout)
6. [Components](#components)
7. [Glass Effect & Vibrancy](#glass-effect--vibrancy)
8. [App Shell & Navigation](#app-shell--navigation)
9. [Forms & Inputs](#forms--inputs)
10. [Feedback & States](#feedback--states)
11. [Best Practices](#best-practices)

---

## Architecture Overview

The design system is built on these foundations:

| Layer | Technology | Purpose |
|-------|------------|---------|
| CSS Framework | Tailwind CSS 4 | Utility-first styling |
| Component Library | shadcn-svelte + bits-ui | Accessible primitives |
| Theming | CSS Custom Properties | Dynamic color system |
| Variants | tailwind-variants | Component variant management |
| Utilities | tailwind-merge + clsx | Class composition |

### File Structure

```
coworker-app/
├── src/
│   ├── app.css                          # Global styles & CSS variables
│   └── renderer/src/
│       ├── lib/
│       │   ├── components/ui/           # Reusable UI primitives
│       │   │   ├── button/
│       │   │   ├── alert-dialog/
│       │   │   └── ...
│       │   └── utils.ts                 # cn() helper
│       └── components/                  # App-specific components
│           ├── AppShell.svelte
│           └── ...
```

---

## Theming with CSS Variables

All colors are defined as CSS custom properties in `src/app.css` following the [shadcn-svelte theming conventions](https://www.shadcn-svelte.com/docs/theming).

### The Variable Naming Convention

We use a `background` and `foreground` convention:

```css
--primary: oklch(0.18 0.01 60);           /* Background color */
--primary-foreground: oklch(0.975 0.005 85); /* Text color on primary */
```

Usage in Tailwind:

```html
<button class="bg-primary text-primary-foreground">Click me</button>
```

### Core Variables

```css
:root {
  /* Surfaces */
  --background: oklch(0.975 0.005 85);    /* Main app background */
  --card: oklch(0.99 0.003 85);           /* Elevated surfaces */
  --popover: oklch(0.99 0.003 85);        /* Modals, dropdowns */

  /* Text */
  --foreground: oklch(0.18 0.01 60);      /* Primary text */
  --muted-foreground: oklch(0.45 0.01 60); /* Secondary text */

  /* Interactive */
  --primary: oklch(0.18 0.01 60);         /* Primary buttons */
  --accent: oklch(0.65 0.14 25);          /* Terracotta highlights */

  /* Borders & Focus */
  --border: oklch(0.88 0.01 85);
  --ring: oklch(0.65 0.14 25);            /* Focus ring (terracotta) */
}
```

### Adding New Colors

To add a new color, define it in `app.css` and register it with Tailwind:

```css
:root {
  --success: oklch(0.65 0.15 145);
  --success-foreground: oklch(0.98 0.01 145);
}

.dark {
  --success: oklch(0.70 0.15 145);
  --success-foreground: oklch(0.15 0.01 145);
}

@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
}
```

Now use it: `bg-success text-success-foreground`

---

## Typography

### Font Families

| Font | Variable | Usage | Tailwind |
|------|----------|-------|----------|
| Inter | `--font-sans` | Body text, UI elements | `font-sans` |
| Playfair Display | `--font-serif` | Headlines, display text | `font-serif` |
| Geist Mono | `--font-mono` | Code, technical content | `font-mono` |

### Type Scale

| Style | Classes | Usage |
|-------|---------|-------|
| Display | `font-serif text-7xl font-medium` | Hero headlines |
| H1 | `font-serif text-5xl font-medium` | Page titles |
| H2 | `font-serif text-4xl font-medium` | Section headers |
| H3 | `text-2xl font-semibold` | Subsection headers |
| H4 | `text-xl font-semibold` | Card titles |
| Body Large | `text-lg` | Lead paragraphs |
| Body | `text-base` | Default body text |
| Body Small | `text-sm` | Secondary text |
| Caption | `text-xs font-medium` | Labels, metadata |

### Typography Examples

```svelte
<!-- Page title with editorial feel -->
<h1 class="font-serif text-4xl font-medium tracking-tight text-foreground text-balance">
  Welcome to Coworker
</h1>

<!-- Descriptive paragraph -->
<p class="mt-4 max-w-2xl text-lg text-muted-foreground">
  Where AI feels like a team you already know how to work with.
</p>

<!-- Card title -->
<h3 class="text-lg font-semibold text-card-foreground">
  Your Co-workers
</h3>
```

### Text Wrapping

Use these utilities for better headline typography:

- `text-balance` - Balances line lengths (good for headlines)
- `text-pretty` - Prevents orphans (good for paragraphs)

---

## Color Usage

### When to Use Each Color

| Color | Token | Use For |
|-------|-------|---------|
| Warm Cream | `bg-background` | Page backgrounds |
| Soft Cream | `bg-card` | Cards, elevated surfaces |
| Warm Charcoal | `text-foreground` | Primary text, headings |
| Warm Gray | `text-muted-foreground` | Secondary text, captions |
| Terracotta | `text-accent`, `bg-accent` | CTAs, links, highlights |
| Terracotta | `ring-ring` | Focus states |

### Color Don'ts

- Never use pure white (`#FFFFFF`) as a background
- Never use pure black (`#000000`) for text
- Never use blue as an accent color
- Don't overuse terracotta—reserve it for emphasis

### Semantic Colors

```svelte
<!-- Success state -->
<div class="border border-accent/20 bg-accent/10 text-foreground">
  Success message here
</div>

<!-- Error state -->
<div class="border border-destructive/20 bg-destructive/10 text-destructive">
  Error message here
</div>

<!-- Muted/info state -->
<div class="border border-border bg-muted text-muted-foreground">
  Informational message
</div>
```

---

## Spacing & Layout

### Base Unit

All spacing derives from an **8px base unit**. Use Tailwind's spacing scale:

| Token | Value | Pixels | Common Use |
|-------|-------|--------|------------|
| `1` | 0.25rem | 4px | Tight gaps |
| `2` | 0.5rem | 8px | Inline spacing |
| `3` | 0.75rem | 12px | Button padding |
| `4` | 1rem | 16px | Component padding |
| `6` | 1.5rem | 24px | Card padding |
| `8` | 2rem | 32px | Section gaps |
| `12` | 3rem | 48px | Major sections |

### Layout Patterns

```svelte
<!-- Card with proper spacing -->
<div class="rounded-xl border border-border bg-card p-6">
  <h3 class="text-lg font-semibold">Title</h3>
  <p class="mt-2 text-muted-foreground">Description</p>
  <div class="mt-6 flex gap-3">
    <!-- Actions -->
  </div>
</div>

<!-- Section with generous whitespace -->
<section class="py-12">
  <h2 class="font-serif text-4xl font-medium">Section Title</h2>
  <div class="mt-8 grid gap-6">
    <!-- Content -->
  </div>
</section>
```

### Spacing Rules

- Prefer `gap` over `margin` for layouts
- Use generous whitespace—more than you think
- Maintain consistent vertical rhythm
- Cards: `p-6` minimum
- Sections: `py-8` to `py-12`

---

## Components

### Using shadcn-svelte Components

Import components from the UI library:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js'
</script>

<Button variant="default" size="lg">
  Click me
</Button>
```

### Button Variants

| Variant | Usage |
|---------|-------|
| `default` | Primary actions (charcoal background) |
| `secondary` | Secondary actions |
| `outline` | Tertiary actions, less emphasis |
| `ghost` | Minimal actions, icon buttons |
| `destructive` | Dangerous actions |
| `link` | Inline text links |

### Button Sizes

| Size | Usage |
|------|-------|
| `sm` | Compact UI, tables |
| `default` | Standard buttons |
| `lg` | Primary CTAs, forms |
| `icon` | Icon-only buttons |

### Card Pattern

```svelte
<div class="rounded-xl border border-border bg-card p-6">
  <h3 class="text-lg font-semibold text-card-foreground">
    Card Title
  </h3>
  <p class="mt-1 text-sm text-muted-foreground">
    Card description goes here.
  </p>
  
  <div class="mt-6">
    <!-- Card content -->
  </div>
  
  <div class="mt-6 flex justify-end gap-3">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </div>
</div>
```

### Adding New shadcn Components

Use the CLI to add components:

```bash
pnpm dlx shadcn@latest add card --cwd coworker-app
```

Components are installed to `src/renderer/src/lib/components/ui/`.

---

## Glass Effect & Vibrancy

The app uses macOS vibrancy for a glass-like appearance. The design accounts for this with semi-transparent backgrounds.

### How It Works

1. Electron window has `vibrancy: 'under-window'` (macOS only)
2. App shell uses semi-transparent background: `oklch(... / 85%)`
3. Cards and surfaces are slightly opaque to remain readable

### Glass Utility Class

```svelte
<!-- Glass morphism card -->
<div class="glass rounded-xl border border-border/50 p-6">
  Content with blur effect
</div>
```

### Important Notes

- Vibrancy only works on macOS
- On other platforms, backgrounds are solid
- Test on both macOS and non-macOS to ensure readability

---

## App Shell & Navigation

### AppShell Component

The `AppShell.svelte` component provides the macOS-native app container:

```svelte
<script lang="ts">
  import AppShell from './components/AppShell.svelte'
</script>

<AppShell>
  <!-- Your page content -->
</AppShell>
```

### Features

- **Draggable title bar** - Uses `-webkit-app-region: drag`
- **Traffic light spacing** - Automatic padding on macOS for window controls
- **Consistent layout** - Max-width content area with proper padding

### Adding Interactive Elements to Title Bar

Wrap interactive elements in `titlebar-no-drag`:

```svelte
<header class="titlebar-drag-region">
  <h1>App Title</h1>
  <div class="titlebar-no-drag">
    <Button>Settings</Button>
  </div>
</header>
```

---

## Forms & Inputs

### Input Styling

```svelte
<input
  type="text"
  placeholder="Enter your name"
  class="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
/>
```

### Form Layout

```svelte
<form class="space-y-6">
  <div>
    <label class="text-sm font-medium text-foreground">
      Email
    </label>
    <input type="email" class="mt-2 ..." />
  </div>
  
  <div>
    <label class="text-sm font-medium text-foreground">
      Message
    </label>
    <textarea class="mt-2 ..." rows="4"></textarea>
  </div>
  
  <div class="flex justify-end gap-3">
    <Button variant="outline">Cancel</Button>
    <Button>Submit</Button>
  </div>
</form>
```

### Focus States

All focus states use the terracotta accent:

```css
focus:border-accent focus:ring-2 focus:ring-accent/20
```

---

## Feedback & States

### Loading States

```svelte
<Button disabled={loading}>
  {loading ? 'Loading...' : 'Submit'}
</Button>
```

### Error Messages

Use warm, human language (see Brand Guide):

```svelte
{#if error}
  <div class="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
    <p class="text-sm text-destructive">
      Something went wrong. Let's try that again.
    </p>
  </div>
{/if}
```

### Success Messages

```svelte
{#if success}
  <div class="rounded-lg border border-accent/20 bg-accent/10 p-4">
    <p class="font-medium text-foreground">
      {success.message}
    </p>
  </div>
{/if}
```

### Empty States

```svelte
<div class="flex flex-col items-center justify-center py-12 text-center">
  <p class="text-lg font-medium text-foreground">
    No co-workers yet
  </p>
  <p class="mt-2 text-muted-foreground">
    Create your first co-worker to get started.
  </p>
  <Button class="mt-6">Create Co-worker</Button>
</div>
```

---

## Best Practices

### Do

- Use semantic color tokens (`bg-card`, `text-foreground`)
- Use the `cn()` helper for conditional classes
- Use `font-serif` only for headlines
- Maintain generous whitespace
- Test on both light and dark modes
- Use `text-balance` for headlines

### Don't

- Don't use arbitrary color values (`bg-[#FAF8F5]`)
- Don't use raw Tailwind colors (`bg-blue-500`)
- Don't use Playfair Display for body text
- Don't crowd elements together
- Don't disable user interactions without feedback

### The cn() Helper

Use `cn()` for composing classes:

```svelte
<script lang="ts">
  import { cn } from '$lib/utils'
  
  let { class: className, active }: Props = $props()
</script>

<div class={cn(
  "rounded-lg border p-4",
  active && "border-accent bg-accent/5",
  className
)}>
  Content
</div>
```

### Component Props Pattern

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte'
  
  interface Props {
    title: string
    description?: string
    children: Snippet
    class?: string
  }
  
  let { title, description, children, class: className }: Props = $props()
</script>
```

---

## Quick Reference

### Color Tokens

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `bg-background` | Warm Cream | Warm Dark |
| `bg-card` | Soft Cream | Elevated Dark |
| `text-foreground` | Warm Charcoal | Light Cream |
| `text-muted-foreground` | Warm Gray | Muted Light |
| `bg-accent` / `text-accent` | Terracotta | Bright Terracotta |
| `border-border` | Light Warm | Dark Warm |

### Common Patterns

```
Card:           rounded-xl border border-border bg-card p-6
Button:         Use <Button> component
Input:          rounded-lg border border-input bg-background px-4 py-3
Section:        py-8 or py-12
Gap:            gap-3 (tight), gap-4 (normal), gap-6 (loose)
Max Width:      max-w-2xl (text), max-w-6xl (content)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-01 | Initial design system documentation |

---

*This document is the implementation guide for the Coworker design system. For brand philosophy and visual identity specifications, see [VISUAL_IDENTITY.md](./VISUAL_IDENTITY.md) and [BRAND_GUIDE.md](./BRAND_GUIDE.md).*
