# Coworker App Documentation

## Overview

The Coworker App is a desktop application built with Electron and Svelte 5. This document outlines the project structure, frameworks, patterns, and best practices for developers working on this codebase.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Electron | 39.x | Desktop runtime |
| Svelte | 5.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 7.x | Build tool |
| electron-vite | 5.x | Electron + Vite integration |
| Tailwind CSS | 4.x | Styling |
| bits-ui | 2.x | Headless UI primitives |
| tailwind-variants | 3.x | Component variants |

## Project Structure

```
coworker-app/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry point + IPC handlers
│   │   └── auth-storage.ts      # Secure token storage (safeStorage)
│   ├── preload/                 # Preload scripts (bridge)
│   │   ├── index.ts             # API exposure (incl. auth)
│   │   └── index.d.ts           # Type definitions
│   └── renderer/                # Svelte application
│       ├── index.html           # Entry HTML
│       └── src/
│           ├── main.ts          # Svelte mount
│           ├── app.css          # Global styles + Tailwind
│           ├── App.svelte       # Root component + navigation
│           ├── env.d.ts         # Vite type definitions
│           ├── components/      # Application components
│           │   ├── AuthFlow.svelte    # Sign-in UI
│           │   ├── Dashboard.svelte   # Post-auth landing
│           │   └── WelcomeSplash.svelte
│           └── lib/
│               ├── utils.ts     # Shared utilities
│               ├── api.ts       # API wrappers
│               ├── components/  # UI component library
│               │   └── ui/      # shadcn/bits-ui components
│               └── hooks/       # Custom Svelte hooks
├── build/                       # Electron-builder assets
│   ├── icon.png/icns/ico        # App icons
│   └── entitlements.mac.plist   # macOS permissions
├── electron.vite.config.ts      # electron-vite config
├── electron-builder.yml         # Build/packaging config
├── svelte.config.mjs            # Svelte preprocessor
├── tsconfig.json                # Root TypeScript config
├── tsconfig.node.json           # Main/preload types
├── tsconfig.web.json            # Renderer types
├── components.json              # shadcn-svelte config
└── eslint.config.mjs            # ESLint config
```

## Architecture

### Process Model

Electron apps run in multiple processes. Understanding this separation is critical:

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                           │
│  - Node.js environment                                      │
│  - System access (filesystem, native APIs)                  │
│  - Window management                                        │
│  - IPC message handling                                     │
│  File: src/main/index.ts                                    │
├─────────────────────────────────────────────────────────────┤
│                     Preload Script                          │
│  - Runs before renderer loads                               │
│  - Bridge between main and renderer                         │
│  - Exposes safe APIs via contextBridge                      │
│  File: src/preload/index.ts                                 │
├─────────────────────────────────────────────────────────────┤
│                    Renderer Process                         │
│  - Browser environment (Chromium)                           │
│  - Svelte application                                       │
│  - UI rendering                                             │
│  - Accesses main via window.electron/window.api             │
│  File: src/renderer/src/                                    │
└─────────────────────────────────────────────────────────────┘
```

### Security Model

The app uses Electron's context isolation for security:

1. **Context Isolation**: Renderer cannot directly access Node.js APIs
2. **Preload Bridge**: Safe APIs exposed via `contextBridge`
3. **Sandbox**: Disabled to allow preload functionality (use carefully)
4. **Secure Token Storage**: Uses Electron's `safeStorage` API (OS keychain)
5. **JWT Authentication**: All API calls authenticated via Bearer tokens

See [Authentication Documentation](./authentication.md) for complete auth details.

## Main Process

### Entry Point (`src/main/index.ts`)

The main process handles:
- Window creation and management
- Native system integration
- IPC message handling

```typescript
// Window creation pattern
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,  // Show when ready to prevent flash
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,  // Required for preload APIs
    },
  })

  // Show when ready
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Load content based on environment
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
```

### Main Process Guidelines

**DO:**
- ✅ Handle all filesystem operations
- ✅ Manage native dialogs (file open, save, etc.)
- ✅ Control window lifecycle
- ✅ Handle system tray, notifications
- ✅ Implement IPC handlers for renderer requests
- ✅ Own all SDK/API calls (network access stays in main)
- ✅ Store tokens securely using `safeStorage` API
- ✅ Handle token refresh automatically via SDK callbacks

**DON'T:**
- ❌ Import renderer/UI code
- ❌ Perform heavy computation (blocks the app)
- ❌ Store sensitive data without encryption
- ❌ Expose dangerous Node APIs to renderer
- ❌ Call backend APIs directly from the renderer
- ❌ Expose raw tokens to the renderer process

## Preload Script

### Bridge Pattern (`src/preload/index.ts`)

The preload script exposes a **typed IPC facade** to the renderer. It must not
perform network requests or import runtime SDKs directly.

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { CoworkerSdk, AuthUser, AuthStatusResponse } from '@coworker/shared-services'

const api = {
  auth: {
    requestCode: (email: string) =>
      ipcRenderer.invoke('auth:requestCode', email),
    verifyCode: (email: string, code: string) =>
      ipcRenderer.invoke('auth:verifyCode', email, code),
    logout: () => ipcRenderer.invoke('auth:logout'),
    me: () => ipcRenderer.invoke('auth:me'),
    isAuthenticated: () => ipcRenderer.invoke('auth:isAuthenticated'),
  },
  hello: {
    sayHello: async (name?: string) => ipcRenderer.invoke('api:hello:sayHello', name)
  },
  users: {
    list: async () => ipcRenderer.invoke('api:users:list'),
    create: async (data: Parameters<CoworkerSdk['users']['create']>[0]) =>
      ipcRenderer.invoke('api:users:create', data)
  }
}

export type Api = typeof api

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
```

**Note:** Auth handlers return user data only—tokens are never exposed to the renderer.
They are stored securely in the main process using `safeStorage`.

### Type Definitions (`src/preload/index.d.ts`)

Always bind the preload `Api` type to `window.api`:

```typescript
import { ElectronAPI } from '@electron-toolkit/preload'
import type { Api } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
```

### Adding Custom IPC APIs

When adding new IPC functionality (especially API calls), follow the **main → preload → renderer** chain.

1. **Define the handler in main process (SDK or native work lives here):**
```typescript
// src/main/index.ts
import { ipcMain } from 'electron'
import type { CoworkerSdk } from '@coworker/shared-services'

ipcMain.handle(
  'api:users:create',
  async (_event, data: Parameters<CoworkerSdk['users']['create']>[0]) =>
    (await getSdk()).users.create(data)
)
```

2. **Expose in preload via `invoke` (typed IPC facade):**
```typescript
// src/preload/index.ts
import { ipcRenderer } from 'electron'
import type { CoworkerSdk } from '@coworker/shared-services'

const api = {
  users: {
    create: (data: Parameters<CoworkerSdk['users']['create']>[0]) =>
      ipcRenderer.invoke('api:users:create', data)
  }
}
```

3. **Bind `Api` to window in preload types:**
```typescript
// src/preload/index.d.ts
import type { Api } from './index'

declare global {
  interface Window {
    api: Api
  }
}
```

4. **Use via renderer wrapper (no SDK imports in renderer):**
```typescript
// src/renderer/src/lib/api.ts
export const usersApi = {
  create: (data: Parameters<typeof window.api.users.create>[0]) =>
    window.api.users.create(data)
}
```

## SDK + IPC Pattern (Required)

To keep the app secure, consistent, and strongly typed, all API access follows
this fixed chain:

1. **Main process** owns the SDK and performs all network calls.
2. **Preload** exposes a typed IPC facade (`window.api`) using `ipcRenderer.invoke`.
3. **Renderer** uses `$lib/api` wrappers and **type-only imports** from shared-services.

If you need a new endpoint, add it to shared-services first, then wire main →
preload → renderer. Never call the API directly from the renderer.

**IPC conventions (required):**
- Channel names follow `api:<domain>:<action>` (example: `api:users:create`).
- Use `ipcMain.handle` + `ipcRenderer.invoke` for request/response.
- Payload types come from `CoworkerSdk` method signatures or shared domain types.

## Renderer (Svelte Application)

### Svelte 5 Patterns

The app uses Svelte 5 with runes. Key patterns:

#### Component Props with `$props()`

```svelte
<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    variant?: 'default' | 'destructive' | 'outline'
    size?: 'default' | 'sm' | 'lg'
  }

  let {
    class: className,
    variant = 'default',
    size = 'default',
    children,
    ...restProps
  }: Props = $props()
</script>

<button class={cn(buttonVariants({ variant, size }), className)} {...restProps}>
  {@render children?.()}
</button>
```

#### Two-Way Binding with `$bindable()`

```svelte
<script lang="ts">
  interface Props {
    open?: boolean
    value?: string
  }

  let { open = $bindable(false), value = $bindable('') }: Props = $props()
</script>

<!-- Parent can bind: <MyComponent bind:open bind:value /> -->
```

#### Reactive State with `$state()` and `$derived()`

```svelte
<script lang="ts">
  let count = $state(0)
  let doubled = $derived(count * 2)

  function increment() {
    count++  // Automatically triggers updates
  }
</script>

<p>Count: {count}, Doubled: {doubled}</p>
<button onclick={increment}>Increment</button>
```

#### Render Snippets (Replacing Slots)

```svelte
<!-- Parent -->
<Dialog>
  {#snippet trigger()}
    <Button>Open</Button>
  {/snippet}
  {#snippet content()}
    <p>Dialog content here</p>
  {/snippet}
</Dialog>

<!-- Child component -->
<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    trigger?: Snippet
    content?: Snippet
  }

  let { trigger, content }: Props = $props()
</script>

<div class="trigger">
  {@render trigger?.()}
</div>
<div class="content">
  {@render content?.()}
</div>
```

### Module Scripts for Type Exports

Use module scripts for exports that should be available at import time:

```svelte
<script lang="ts" module>
  // Exports available when importing the component
  export const buttonVariants = tv({
    base: 'inline-flex items-center justify-center rounded-md',
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  })
</script>

<script lang="ts">
  // Runtime props and logic
  let { variant, size, ...props } = $props()
</script>
```

## UI Components

### Component Library Architecture

The app uses a layered component architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  Your app components that compose UI primitives             │
│  Location: src/renderer/src/components/                     │
├─────────────────────────────────────────────────────────────┤
│                     shadcn Layer                            │
│  Styled wrappers with variants and consistent design        │
│  Location: src/renderer/src/lib/components/ui/              │
├─────────────────────────────────────────────────────────────┤
│                     bits-ui Layer                           │
│  Headless, accessible component primitives                  │
│  Imported from: bits-ui                                     │
└─────────────────────────────────────────────────────────────┘
```

### Creating UI Components

Follow the established pattern for UI components:

#### 1. Create the Component File

```svelte
<!-- src/lib/components/ui/card/card.svelte -->
<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils.js'

  interface Props extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null
  }

  let { ref = $bindable(null), class: className, children, ...restProps }: Props = $props()
</script>

<div
  bind:this={ref}
  class={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
  data-slot="card"
  {...restProps}
>
  {@render children?.()}
</div>
```

#### 2. Create Subcomponents

```svelte
<!-- src/lib/components/ui/card/card-header.svelte -->
<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils.js'

  interface Props extends HTMLAttributes<HTMLDivElement> {}

  let { class: className, children, ...restProps }: Props = $props()
</script>

<div
  class={cn('flex flex-col space-y-1.5 p-6', className)}
  data-slot="card-header"
  {...restProps}
>
  {@render children?.()}
</div>
```

#### 3. Create Index Barrel Export

```typescript
// src/lib/components/ui/card/index.ts
import Card from './card.svelte'
import CardHeader from './card-header.svelte'
import CardTitle from './card-title.svelte'
import CardDescription from './card-description.svelte'
import CardContent from './card-content.svelte'
import CardFooter from './card-footer.svelte'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  // Aliased exports for composition pattern
  Card as Root,
  CardHeader as Header,
  CardTitle as Title,
  CardDescription as Description,
  CardContent as Content,
  CardFooter as Footer,
}
```

#### 4. Usage

```svelte
<script lang="ts">
  import * as Card from '$lib/components/ui/card'
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Card Title</Card.Title>
    <Card.Description>Card description text</Card.Description>
  </Card.Header>
  <Card.Content>
    <p>Card content goes here</p>
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card.Root>
```

### Component Conventions

| Convention | Example | Purpose |
|------------|---------|---------|
| `data-slot` attribute | `data-slot="card"` | CSS targeting, debugging |
| `ref` prop with `$bindable()` | `ref = $bindable(null)` | Parent element access |
| `{...restProps}` spreading | `{...restProps}` | Extensibility |
| `cn()` for classes | `cn(base, className)` | Class merging |
| Barrel exports | `index.ts` | Clean imports |

### Using bits-ui Primitives

When wrapping bits-ui components:

```svelte
<!-- src/lib/components/ui/alert-dialog/alert-dialog-content.svelte -->
<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js'

  type Props = WithoutChildrenOrChild<AlertDialogPrimitive.ContentProps>

  let { ref = $bindable(null), class: className, children, ...restProps }: Props = $props()
</script>

<AlertDialogPrimitive.Portal>
  <AlertDialogPrimitive.Overlay
    class={cn(
      'fixed inset-0 z-50 bg-black/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out'
    )}
  />
  <AlertDialogPrimitive.Content
    bind:ref
    class={cn(
      'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
      'w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
```

## Shared Utilities

### `$lib/utils.ts`

Central utilities used across the application:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Class name composition with Tailwind deduplication
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Type utilities for component props
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null }
```

### Using `cn()` Correctly

```svelte
<script lang="ts">
  import { cn } from '$lib/utils.js'

  interface Props {
    class?: string
    disabled?: boolean
  }

  let { class: className, disabled }: Props = $props()
</script>

<!-- Merge base styles with conditional and custom classes -->
<div
  class={cn(
    'base-styles here',
    disabled && 'opacity-50 cursor-not-allowed',
    className  // Always last to allow overrides
  )}
>
  Content
</div>
```

## Styling

### Tailwind CSS v4 Setup

The app uses Tailwind CSS v4 with the Vite plugin:

```css
/* src/renderer/src/app.css */
@import 'tailwindcss';
@import 'tw-animate-css';

/* Custom theme using CSS variables */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  /* ... more variables */
  --radius: 0.625rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark mode variables */
}
```

### Color System

Colors use oklch color space for better blending:

| Variable | Purpose |
|----------|---------|
| `--background` | Page background |
| `--foreground` | Default text |
| `--card` | Card backgrounds |
| `--primary` | Primary actions |
| `--secondary` | Secondary actions |
| `--muted` | Muted elements |
| `--accent` | Accent highlights |
| `--destructive` | Destructive actions |
| `--border` | Borders |
| `--input` | Input borders |
| `--ring` | Focus rings |

### Using Design Tokens

```svelte
<!-- Use semantic color classes -->
<div class="bg-background text-foreground">
  <button class="bg-primary text-primary-foreground hover:bg-primary/90">
    Primary Action
  </button>
  <button class="bg-destructive text-destructive-foreground">
    Delete
  </button>
</div>

<!-- Use radius token -->
<div class="rounded-md">  <!-- Uses --radius -->
  Content
</div>
```

### Component Variants with tailwind-variants

```typescript
import { tv } from 'tailwind-variants'

export const buttonVariants = tv({
  base: 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

// Usage
const classes = buttonVariants({ variant: 'destructive', size: 'lg' })
```

## TypeScript Configuration

### Multiple tsconfig Files

The project uses separate TypeScript configs for each process:

| File | Scope | Purpose |
|------|-------|---------|
| `tsconfig.json` | Root | References all configs |
| `tsconfig.node.json` | Main + Preload | Node.js environment |
| `tsconfig.web.json` | Renderer | Browser environment |

### Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "$lib": ["./src/renderer/src/lib"],
      "$lib/*": ["./src/renderer/src/lib/*"]
    }
  }
}
```

Usage:
```typescript
import { cn } from '$lib/utils.js'
import { Button } from '$lib/components/ui/button'
```

### Sharing Types Between Processes

For types needed in both main and renderer, prefer shared-services types and use
**type-only imports** in the renderer to avoid bundling server-only code.

1. **Create shared types file:**
```typescript
// src/shared/types.ts (create this)
export interface FileInfo {
  path: string
  name: string
  size: number
}

export interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  // ...
}
```

2. **Import in both processes:**
```typescript
// In main process
import type { FileInfo } from '../shared/types'

// In preload types
import type { FileInfo } from '../shared/types'

// In renderer
import type { FileInfo } from '../../shared/types'
import type { User, CreateUserInput } from '@coworker/shared-services'
```

## State Management

### Component-Level State

Use Svelte 5 runes for component state:

```svelte
<script lang="ts">
  // Simple state
  let count = $state(0)

  // Derived state
  let doubled = $derived(count * 2)

  // Object state (deeply reactive)
  let user = $state({ name: '', email: '' })

  // Array state
  let items = $state<string[]>([])

  function addItem(item: string) {
    items.push(item)  // Mutations work!
  }
</script>
```

### Cross-Component State

For state shared across components, create stores:

```typescript
// src/renderer/src/lib/stores/theme.svelte.ts
class ThemeStore {
  theme = $state<'light' | 'dark' | 'system'>('system')

  get resolvedTheme() {
    if (this.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return this.theme
  }

  setTheme(theme: 'light' | 'dark' | 'system') {
    this.theme = theme
    // Persist to localStorage or electron store
  }
}

export const themeStore = new ThemeStore()
```

Usage:
```svelte
<script lang="ts">
  import { themeStore } from '$lib/stores/theme.svelte'
</script>

<button onclick={() => themeStore.setTheme('dark')}>
  Current: {themeStore.resolvedTheme}
</button>
```

### Context for Feature Scopes

Use Svelte context for feature-scoped state:

```svelte
<!-- Provider.svelte -->
<script lang="ts">
  import { setContext } from 'svelte'

  interface FeatureContext {
    // Define context shape
  }

  const context: FeatureContext = $state({
    // Initialize
  })

  setContext('feature-key', context)
</script>

{@render children?.()}

<!-- Consumer.svelte -->
<script lang="ts">
  import { getContext } from 'svelte'

  const context = getContext<FeatureContext>('feature-key')
</script>
```

## Avoiding Code Duplication

### Extract Shared Logic

```typescript
// ❌ Don't duplicate logic in components
// ComponentA.svelte
let isValid = email.includes('@') && email.length > 5

// ComponentB.svelte
let isValid = email.includes('@') && email.length > 5

// ✅ Extract to utility
// src/lib/utils/validation.ts
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Usage in components
import { isValidEmail } from '$lib/utils/validation'
let isValid = $derived(isValidEmail(email))
```

### Create Composition Components

```svelte
<!-- ❌ Don't repeat layout patterns -->
<div class="flex flex-col gap-4 p-6 border rounded-lg">
  <h2 class="text-lg font-semibold">Title A</h2>
  <p>Content A</p>
</div>

<div class="flex flex-col gap-4 p-6 border rounded-lg">
  <h2 class="text-lg font-semibold">Title B</h2>
  <p>Content B</p>
</div>

<!-- ✅ Create reusable component -->
<!-- Section.svelte -->
<script lang="ts">
  interface Props {
    title: string
    children?: Snippet
  }
  let { title, children }: Props = $props()
</script>

<div class="flex flex-col gap-4 p-6 border rounded-lg">
  <h2 class="text-lg font-semibold">{title}</h2>
  {@render children?.()}
</div>

<!-- Usage -->
<Section title="Title A"><p>Content A</p></Section>
<Section title="Title B"><p>Content B</p></Section>
```

### Use Action Functions for DOM Logic

```typescript
// src/lib/actions/clickOutside.ts
export function clickOutside(node: HTMLElement, callback: () => void) {
  function handleClick(event: MouseEvent) {
    if (!node.contains(event.target as Node)) {
      callback()
    }
  }

  document.addEventListener('click', handleClick, true)

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true)
    },
  }
}

// Usage
<div use:clickOutside={() => open = false}>
  Dropdown content
</div>
```

## Build & Development

### Development

```bash
# Start development with HMR
pnpm dev:app
# or
cd coworker-app && pnpm dev
```

### Building

```bash
# Type check and build
pnpm --filter coworker-app build

# Build for specific platforms
pnpm --filter coworker-app build:mac
pnpm --filter coworker-app build:win
pnpm --filter coworker-app build:linux
```

### Scripts Reference

| Script | Description |
|--------|-------------|
| `dev` | Start development server with HMR |
| `pm2:logs` | Follow app logs (pm2) |
| `pm2:restart` | Restart app process (pm2) |
| `pm2:stop` | Stop app process (pm2) |
| `pm2:delete` | Delete app process (pm2) |
| `build` | Type check and build for production |
| `start` | Preview built application |
| `lint` | Run ESLint |
| `format` | Format code with Prettier |
| `typecheck` | Run TypeScript checks |
| `build:mac` | Build macOS application |
| `build:win` | Build Windows application |
| `build:linux` | Build Linux application |

## Adding New Features

### Checklist for New Features

1. **Define types** in appropriate location (shared if cross-process)
2. **Create IPC handlers** if feature needs main process access
3. **Update preload** to expose new APIs
4. **Add type definitions** for preload APIs
5. **Use shared-services types** (type-only in renderer, runtime in main)
6. **Create UI components** following established patterns
7. **Add to appropriate module/feature directory**
8. **Write tests** for critical logic
9. **Update documentation** if significant

### Example: Adding a File Picker Feature

1. **Main process handler:**
```typescript
// src/main/index.ts
import { dialog, ipcMain } from 'electron'

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Text', extensions: ['txt', 'md'] }],
  })
  return result.filePaths[0] ?? null
})
```

2. **Preload exposure:**
```typescript
// src/preload/index.ts
contextBridge.exposeInMainWorld('api', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
})
```

3. **Type definitions:**
```typescript
// src/preload/index.d.ts
interface Window {
  api: {
    openFileDialog: () => Promise<string | null>
  }
}
```

4. **Svelte component:**
```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button'

  let selectedFile = $state<string | null>(null)

  async function selectFile() {
    selectedFile = await window.api.openFileDialog()
  }
</script>

<Button onclick={selectFile}>Select File</Button>
{#if selectedFile}
  <p>Selected: {selectedFile}</p>
{/if}
```

## Best Practices Summary

### Do

- ✅ Keep main process handlers minimal and focused
- ✅ Always type your IPC APIs in preload definitions
- ✅ Route all network calls through main + IPC
- ✅ Use `$props()` destructuring with TypeScript interfaces
- ✅ Compose UI from small, reusable components
- ✅ Use `cn()` for all dynamic class composition
- ✅ Follow the barrel export pattern for components
- ✅ Keep state as local as possible
- ✅ Extract repeated logic into utilities or components

### Don't

- ❌ Access Node APIs directly in renderer
- ❌ Import or call the SDK from the renderer at runtime
- ❌ Put business logic in UI components
- ❌ Duplicate styling—use design tokens and variants
- ❌ Inline complex class strings—use `tv()` variants
- ❌ Skip TypeScript types for component props
- ❌ Create deeply nested component hierarchies
- ❌ Store sensitive data in renderer process
