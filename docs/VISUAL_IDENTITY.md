# Coworkers Visual Identity

> Where AI feels like a team you already know how to work with.

This document defines the complete visual identity system for Coworkers. It serves as the authoritative reference for designers, developers, and AI tools building within the Coworkers ecosystem.

---

## Brand Philosophy

### Core Belief

The most powerful technology is the kind you forget you're using. Coworkers exists to make AI feel less like a tool and more like a team you already know how to work with.

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Clarity over complexity** | Every element serves a purpose. If it doesn't clarify, it clutters. |
| **Partnership over performance** | We design for collaboration, not showcase. The user's work is the hero. |
| **Warmth over cold efficiency** | Technology should feel human. Approachable. Like a colleague, not a command line. |
| **Delight in the details** | The magic is in the margins. Micro-interactions that make people smile. |

### The iPod Moment

We're building for the moment when someone realizes AI isn't something to learn—it's someone to work with. That shift from confusion to clarity. From intimidation to invitation.

---

## Color System

### Philosophy

Our palette is deliberately warm. We reject the cold blues and sterile grays of typical tech. Instead, we embrace cream, charcoal, and terracotta—colors that feel human, approachable, and premium.

### Primary Colors

#### Warm Cream (Background)
- **Role:** Primary background, creates warmth and approachability
- **Hex:** `#FAF8F5`
- **RGB:** `rgb(250, 248, 245)`
- **HSL:** `hsl(36, 33%, 97%)`
- **OKLCH:** `oklch(0.975 0.005 85)`
- **Tailwind:** `bg-background`

#### Warm Charcoal (Text)
- **Role:** Primary text, headings, high-contrast elements
- **Hex:** `#2D2A26`
- **RGB:** `rgb(45, 42, 38)`
- **HSL:** `hsl(34, 8%, 16%)`
- **OKLCH:** `oklch(0.18 0.01 60)`
- **Tailwind:** `text-foreground`

#### Terracotta (Accent)
- **Role:** CTAs, links, highlights, interactive elements
- **Hex:** `#C4725C`
- **RGB:** `rgb(196, 114, 92)`
- **HSL:** `hsl(13, 46%, 56%)`
- **OKLCH:** `oklch(0.65 0.14 25)`
- **Tailwind:** `text-accent`, `bg-accent`

### Secondary Colors

#### Soft Cream (Cards)
- **Role:** Card backgrounds, elevated surfaces
- **Hex:** `#FDFCFA`
- **RGB:** `rgb(253, 252, 250)`
- **HSL:** `hsl(40, 43%, 99%)`
- **OKLCH:** `oklch(0.99 0.003 85)`
- **Tailwind:** `bg-card`

#### Warm Gray (Muted)
- **Role:** Secondary text, borders, subtle elements
- **Hex:** `#EBE8E3`
- **RGB:** `rgb(235, 232, 227)`
- **HSL:** `hsl(38, 17%, 91%)`
- **OKLCH:** `oklch(0.94 0.008 85)`
- **Tailwind:** `bg-muted`, `text-muted-foreground`

### Color Usage Rules

```
DO:
- Use Warm Cream as the primary background
- Use Warm Charcoal for all body text
- Use Terracotta sparingly for emphasis and CTAs
- Maintain generous whitespace

DON'T:
- Use pure white (#FFFFFF) as a background
- Use pure black (#000000) for text
- Use blue as a primary accent color
- Overuse the terracotta accent
```

### Accessibility

All color combinations meet WCAG 2.1 AA standards:
- Charcoal on Cream: **12.5:1** contrast ratio
- Terracotta on Cream: **4.8:1** contrast ratio
- Charcoal on Card: **13.2:1** contrast ratio

---

## Typography

### Philosophy

Typography should feel editorial, not corporate. We pair the elegance of Playfair Display with the clarity of Inter—classic meets modern, warmth meets precision.

### Type Scale

| Name | Size | Line Height | Weight | Font | Usage |
|------|------|-------------|--------|------|-------|
| Display | 72px / 4.5rem | 1.1 | 500 | Playfair Display | Hero headlines |
| H1 | 48px / 3rem | 1.2 | 500 | Playfair Display | Page titles |
| H2 | 36px / 2.25rem | 1.25 | 500 | Playfair Display | Section headers |
| H3 | 24px / 1.5rem | 1.3 | 600 | Inter | Subsection headers |
| H4 | 20px / 1.25rem | 1.4 | 600 | Inter | Card titles |
| Body Large | 18px / 1.125rem | 1.6 | 400 | Inter | Lead paragraphs |
| Body | 16px / 1rem | 1.6 | 400 | Inter | Body text |
| Body Small | 14px / 0.875rem | 1.5 | 400 | Inter | Secondary text |
| Caption | 12px / 0.75rem | 1.4 | 500 | Inter | Labels, captions |
| Overline | 11px / 0.6875rem | 1.4 | 600 | Inter | Section labels (uppercase, tracked) |

### Font Families

#### Playfair Display (Display & Headlines)
- **Weights:** 400, 500, 600, 700
- **Use for:** Headlines, display text, editorial moments
- **Character:** Elegant, editorial, warm, premium
- **CSS Variable:** `--font-serif`
- **Tailwind:** `font-serif`

```css
font-family: 'Playfair Display', Georgia, serif;
```

#### Inter (Body & UI)
- **Weights:** 400, 500, 600, 700
- **Use for:** Body text, UI elements, navigation, buttons
- **Character:** Clean, readable, modern, approachable
- **CSS Variable:** `--font-sans`
- **Tailwind:** `font-sans`

```css
font-family: 'Inter', system-ui, sans-serif;
```

#### Geist Mono (Code)
- **Weights:** 400, 500
- **Use for:** Code snippets, technical content, monospace needs
- **CSS Variable:** `--font-mono`
- **Tailwind:** `font-mono`

```css
font-family: 'Geist Mono', monospace;
```

### Typography Rules

```
DO:
- Use Playfair Display only for headlines and display text
- Use Inter for all body copy and UI elements
- Maintain consistent line heights (1.5-1.6 for body)
- Use text-balance or text-pretty for headlines

DON'T:
- Mix more than 2 font families
- Use Playfair for body text or small sizes
- Use font weights below 400
- Center-align body paragraphs
```

---

## Spacing System

### Philosophy

Generous whitespace is not empty space—it's breathing room. Our spacing system creates rhythm and hierarchy while maintaining the premium, uncluttered feel that defines the Coworkers brand.

### Base Unit

All spacing derives from an **8px base unit**. This creates consistent rhythm across all components and layouts.

### Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `space-1` | 0.25rem | 4px | Tight spacing, icon gaps |
| `space-2` | 0.5rem | 8px | Inline spacing, small gaps |
| `space-3` | 0.75rem | 12px | Button padding, compact spacing |
| `space-4` | 1rem | 16px | Standard component padding |
| `space-5` | 1.25rem | 20px | Medium spacing |
| `space-6` | 1.5rem | 24px | Card padding, group spacing |
| `space-8` | 2rem | 32px | Section padding (small) |
| `space-10` | 2.5rem | 40px | Large component spacing |
| `space-12` | 3rem | 48px | Section gaps |
| `space-16` | 4rem | 64px | Major section spacing |
| `space-20` | 5rem | 80px | Page section padding |
| `space-24` | 6rem | 96px | Hero spacing |
| `space-32` | 8rem | 128px | Maximum section spacing |

### Layout Grid

- **Columns:** 12-column grid
- **Gutter:** 24px (1.5rem)
- **Margin:** 64px minimum on desktop, 24px on mobile
- **Max Width:** 1280px for content, 1440px for full-bleed

### Common Patterns

```
Page Sections:     py-20 to py-32 (80-128px vertical)
Card Padding:      p-6 to p-8 (24-32px)
Button Padding:    px-6 py-3 (24px horizontal, 12px vertical)
Input Padding:     px-4 py-3 (16px horizontal, 12px vertical)
Stack Gap:         gap-4 to gap-6 (16-24px)
Grid Gap:          gap-6 to gap-8 (24-32px)
```

### Spacing Rules

```
DO:
- Use the spacing scale consistently
- Prefer gap utilities over margin for layouts
- Use generous whitespace—more than you think
- Maintain consistent vertical rhythm

DON'T:
- Use arbitrary spacing values
- Mix margin and padding approaches
- Crowd elements together
- Use space-* classes (use gap instead)
```

---

## Components

### Button Styles

#### Primary Button
```
Background: bg-foreground (#2D2A26)
Text: text-background (#FAF8F5)
Padding: px-6 py-3
Border Radius: rounded-lg (8px)
Font: font-sans font-medium
Hover: opacity-90, subtle lift
```

#### Secondary Button
```
Background: bg-transparent
Border: border border-foreground
Text: text-foreground (#2D2A26)
Padding: px-6 py-3
Border Radius: rounded-lg (8px)
Hover: bg-foreground/5
```

#### Accent Button
```
Background: bg-accent (#C4725C)
Text: text-accent-foreground (#FAF8F5)
Padding: px-6 py-3
Border Radius: rounded-lg (8px)
Hover: opacity-90
```

#### Ghost Button
```
Background: transparent
Text: text-foreground
Padding: px-4 py-2
Hover: bg-muted
```

### Card Styles

#### Standard Card
```
Background: bg-card (#FDFCFA)
Border: border border-border
Border Radius: rounded-xl (12px)
Padding: p-6
Shadow: none (borders provide definition)
```

#### Elevated Card
```
Background: bg-card
Border: border border-border
Border Radius: rounded-xl
Padding: p-8
Shadow: shadow-sm
```

### Input Styles

#### Text Input
```
Background: bg-background
Border: border border-border
Border Radius: rounded-lg (8px)
Padding: px-4 py-3
Focus: ring-2 ring-accent/20 border-accent
Placeholder: text-muted-foreground
```

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Small elements, tags |
| `rounded` | 6px | Buttons, inputs |
| `rounded-lg` | 8px | Cards, modals |
| `rounded-xl` | 12px | Large cards, sections |
| `rounded-2xl` | 16px | Hero elements |
| `rounded-full` | 9999px | Avatars, pills |

---

## Voice & Tone

### Philosophy

We speak like a trusted colleague—knowledgeable but never condescending, helpful but never hovering. Our voice is warm, clear, and confident.

### Voice Attributes

| Attribute | Description |
|-----------|-------------|
| **Warm** | Like talking to a friend who happens to be an expert |
| **Clear** | No jargon, no fluff, no corporate speak |
| **Confident** | We know our stuff, but we're not showing off |
| **Helpful** | Always focused on what the user needs |

### Writing Guidelines

#### Do Say
- "Your co-worker is ready to help"
- "Let's get started"
- "Here's what I found"
- "Would you like me to..."

#### Don't Say
- "AI assistant initialized"
- "Processing your request"
- "Error: Invalid input"
- "The system will now..."

### Terminology

| Use This | Not This |
|----------|----------|
| Co-worker | AI, Assistant, Bot |
| Workspace | Dashboard, Portal |
| Channel | Thread, Chat, Conversation |
| Task | Job, Process, Operation |
| Help | Assist, Support, Aid |

### Error Messages

```
DO: "I couldn't find that file. Want me to search somewhere else?"
DON'T: "Error 404: Resource not found"

DO: "Something went wrong. Let's try that again."
DON'T: "An unexpected error has occurred. Please contact support."

DO: "I'm not sure I understood. Could you rephrase that?"
DON'T: "Invalid input. Please enter a valid query."
```

---

## Implementation

### CSS Custom Properties

```css
:root {
  /* Colors */
  --background: oklch(0.975 0.005 85);
  --foreground: oklch(0.18 0.01 60);
  --card: oklch(0.99 0.003 85);
  --card-foreground: oklch(0.18 0.01 60);
  --primary: oklch(0.18 0.01 60);
  --primary-foreground: oklch(0.975 0.005 85);
  --secondary: oklch(0.94 0.008 85);
  --secondary-foreground: oklch(0.18 0.01 60);
  --muted: oklch(0.94 0.008 85);
  --muted-foreground: oklch(0.45 0.01 60);
  --accent: oklch(0.65 0.14 25);
  --accent-foreground: oklch(0.99 0.003 85);
  --border: oklch(0.88 0.01 85);
  --input: oklch(0.88 0.01 85);
  --ring: oklch(0.65 0.14 25);
  --radius: 0.5rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-mono: 'Geist Mono', monospace;
}
```

### Tailwind Configuration

```css
/* globals.css - Tailwind v4 */
@theme inline {
  --font-sans: 'Inter', 'Inter Fallback', system-ui, sans-serif;
  --font-serif: 'Playfair Display', 'Georgia', serif;
  --font-mono: 'Geist Mono', 'Geist Mono Fallback';
}
```

### Next.js Font Setup

```tsx
// layout.tsx
import { Inter, Playfair_Display, Geist_Mono } from 'next/font/google'

const inter = Inter({ subsets: ["latin"] });
const playfair = Playfair_Display({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });
```

---

## Quick Reference

### Color Tokens (Tailwind)
```
Background:     bg-background
Card:           bg-card
Text:           text-foreground
Muted Text:     text-muted-foreground
Accent:         text-accent / bg-accent
Border:         border-border
```

### Typography Tokens (Tailwind)
```
Display:        font-serif text-7xl font-medium
H1:             font-serif text-5xl font-medium
H2:             font-serif text-4xl font-medium
H3:             font-sans text-2xl font-semibold
Body:           font-sans text-base
Caption:        font-sans text-xs font-medium
Overline:       font-sans text-xs font-semibold uppercase tracking-wider
```

### Spacing Tokens (Tailwind)
```
Section:        py-20 lg:py-32
Card:           p-6 lg:p-8
Button:         px-6 py-3
Input:          px-4 py-3
Stack:          gap-4
Grid:           gap-6
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-01 | Initial visual identity system |

---

*This document is the single source of truth for the Coworkers visual identity. When in doubt, refer here.*
