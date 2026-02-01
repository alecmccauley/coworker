# Coworker Coding Standards

> Production-grade code. Atomic design. Relentless reuse.

---

## Before You Begin

**Read all documentation in the `docs/` folder before making any changes.** This includes the product brief, API documentation, app documentation, shared services guide, brand guide, and visual identity. These documents define how we build, why we build it that way, and the experience we're creating.

---

## Project Structure

Coworker is a monorepo containing three interconnected packages:

- **`coworker-api`** — Express 5 REST API with Prisma 7, PostgreSQL, and Zod validation
- **`coworker-app`** — Electron desktop application with Svelte 5 and Tailwind CSS 4
- **`shared-services`** — Shared types, Zod schemas, and a type-safe API SDK

The architecture enforces strict separation: the API handles business logic and data persistence, the app handles user experience, and shared-services bridges them with contracts that guarantee type safety across the stack. The Electron app follows a three-process model (main → preload → renderer) where all network access happens in the main process via the SDK, never in the renderer.

When adding features, start with shared-services to define types and schemas, implement the API endpoint, then wire the app through IPC. This flow ensures type safety from database to UI.

---

## The 10 Pillars

### 1. Atomic Composition

Build at the smallest useful level and compose upward. Functions should do one thing. Components should render one concept. Services should own one domain. This isn't about file size—it's about testability and reuse. A function that does three things cannot be tested in isolation. A component that handles its own data fetching cannot be reused elsewhere.

```typescript
// Atomic: single responsibility, composable
const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const normalizeEmail = (email: string): string => email.toLowerCase().trim()
const prepareEmail = (email: string): string | null => 
  validateEmail(email) ? normalizeEmail(email) : null

// Not atomic: mixed concerns, untestable in isolation
const handleEmailInput = (email: string): void => {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    saveToDatabase(email.toLowerCase().trim())
    sendWelcomeEmail(email)
    updateUI()
  }
}
```

### 2. Type Everything

TypeScript is not optional decoration. Every function parameter, return type, and data structure must be explicitly typed. Use Zod schemas as the source of truth and infer types from them. Enable strict mode. Use `noUncheckedIndexedAccess`. Use type-only imports for types. The compiler is your first line of defense against bugs—let it do its job.

```typescript
// Schema is the source of truth
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
})

// Type is inferred, never manually defined
export type CreateUserInput = z.infer<typeof createUserSchema>
```

### 3. Shared Contracts

Types, schemas, and API contracts live in `@coworker/shared-services`. Period. Do not create local type definitions for shared concepts. Do not duplicate validation logic between API and app. Import from shared-services. When you need a new type, add it to shared-services first, then use it everywhere. Drift between packages is a bug waiting to happen.

### 4. Layer Separation

Each layer has one job. Controllers handle HTTP concerns—extracting data, calling services, formatting responses. Services contain business logic—validation, database operations, domain rules. Routes define endpoints and apply middleware. Do not access `req` or `res` in services. Do not put business logic in controllers. Do not call the database from routes.

```
Routes → Middleware → Controller → Service → Database
         (validation)   (HTTP)      (logic)   (data)
```

### 5. SDK-First Integration

The app never calls the API directly. All API access flows through the SDK in the main process, exposed to the renderer via typed IPC. This keeps network code out of the renderer, centralizes error handling, and maintains type safety end-to-end. Follow the pattern: main process owns the SDK, preload exposes IPC facade, renderer calls `window.api`.

```typescript
// Main: owns SDK, handles requests
ipcMain.handle('api:users:create', async (_event, data) =>
  (await getSdk()).users.create(data)
)

// Preload: typed facade
const api = {
  users: {
    create: (data) => ipcRenderer.invoke('api:users:create', data)
  }
}

// Renderer: clean calls via window.api
const user = await window.api.users.create({ email, name })
```

### 6. Component Reuse

UI components are investments. Build them once, use them everywhere. Use shadcn/bits-ui primitives as the foundation. Wrap them with project styling in `$lib/components/ui/`. Create application-specific components in `components/`. Never duplicate layout patterns—extract them. Use `tailwind-variants` for variant management. Use `cn()` for class composition.

```svelte
<!-- Build once in $lib/components/ui/ -->
<Card.Root>
  <Card.Header>
    <Card.Title>{title}</Card.Title>
  </Card.Header>
  <Card.Content>
    {@render children?.()}
  </Card.Content>
</Card.Root>

<!-- Reuse everywhere -->
<Card.Root>...</Card.Root>
<Card.Root>...</Card.Root>
```

### 7. Prisma Discipline

Prisma is the single interface to the database. Use `cuid()` for IDs. Use `@map` for snake_case columns. Use `@@map` for snake_case tables. Always include `createdAt` and `updatedAt`. Run migrations through `pnpm --filter coworker-api db:migrate`. Generate the client after schema changes with `pnpm --filter coworker-api db:generate`. Never modify the database outside of Prisma migrations.

```prisma
model Entity {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("entities")
}
```

### 8. Error Handling

Use `AppError` for all application errors in the API. Include appropriate HTTP status codes. Let the global error handler format responses. In the SDK, use typed error classes (`SdkError`, `ValidationSdkError`, `NotFoundSdkError`). Never swallow errors. Never expose stack traces to users. Always provide actionable error messages.

```typescript
// API: throw typed errors
throw new AppError("User not found", StatusCodes.NOT_FOUND)

// SDK: catch and handle appropriately  
if (error instanceof NotFoundSdkError) {
  // Handle missing resource
}
```

### 9. Svelte 5 Patterns

Use runes. `$state()` for reactive state. `$derived()` for computed values. `$props()` for component props with TypeScript interfaces. `$bindable()` for two-way binding. Use `{@render}` for snippets, not slots. Use module scripts (`<script lang="ts" module>`) for exports. Keep components focused—if it's doing too much, split it.

```svelte
<script lang="ts">
  interface Props {
    title: string
    open?: boolean
  }
  
  let { title, open = $bindable(false) }: Props = $props()
  let isActive = $derived(open && title.length > 0)
</script>
```

### 10. Visual Consistency

Follow the visual identity. Use the color system—warm cream backgrounds, warm charcoal text, terracotta accents. Use the type scale—Playfair Display for headlines, Inter for body and UI. Use the spacing scale—8px base unit, generous whitespace. Use semantic Tailwind classes (`bg-background`, `text-foreground`, `text-accent`). The design system exists so every screen feels like it belongs.

ALWAYS review docs/VISUAL_IDENTITY.md AND docs/design_system.md before doing ANY UI tasks, and re-use our design system whenever possible.

---

## Quick Reference

| Concern | Location | Pattern |
|---------|----------|---------|
| Types & Schemas | `shared-services/src/` | Zod schemas, inferred types |
| API Endpoints | `coworker-api/src/modules/` | Controller → Service → Prisma |
| UI Components | `coworker-app/src/renderer/src/lib/components/ui/` | shadcn/bits-ui wrappers |
| App Components | `coworker-app/src/renderer/src/components/` | Feature-specific |
| IPC Handlers | `coworker-app/src/main/index.ts` | `ipcMain.handle` |
| IPC Facade | `coworker-app/src/preload/index.ts` | `window.api` |

---

*Write code as if the next person to read it is a future version of yourself who has forgotten everything.*
