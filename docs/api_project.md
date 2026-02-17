# Coworker Pilot API Documentation

## Overview

The Coworker Pilot is a Next.js 16 application that serves both the brand guide web interface and the REST API. The API is built using Next.js App Router API routes, providing a modern, serverless-ready architecture. The name "pilot" comes from the concept of piloting—to drive, guide, or navigate.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥22.0.0 | Runtime |
| TypeScript | 5.x | Type safety |
| Next.js | 16.x | Framework (App Router) |
| Prisma | 7.x | Database ORM |
| PostgreSQL | 17 | Database |
| Zod | 4.x | Schema validation |
| React | 19.x | UI framework |
| Tailwind CSS | 4.x | Styling |

## Project Structure

```
coworker-pilot/
├── app/
│   ├── api/                    # API routes
│   │   ├── health/             # Health check endpoint
│   │   │   └── route.ts
│   │   └── v1/                 # Versioned API endpoints
│   │       ├── auth/           # Authentication endpoints
│   │       │   ├── request-code/
│   │       │   │   └── route.ts
│   │       │   ├── verify-code/
│   │       │   │   └── route.ts
│   │       │   ├── refresh/
│   │       │   │   └── route.ts
│   │       │   ├── logout/
│   │       │   │   └── route.ts
│   │       │   ├── me/
│   │       │   │   └── route.ts
│   │       │   └── admin-check/
│   │       │       └── route.ts   # Admin status check (protected)
│   │       ├── admin/
│   │       │   └── insider-codes/
│   │       │       ├── route.ts    # List + create (admin only)
│   │       │       └── [id]/
│   │       │           └── route.ts # Get + update + delete (admin only)
│   │       ├── insider/
│   │       │   ├── validate-code/
│   │       │   │   └── route.ts    # Validate insider code (public)
│   │       │   └── sign-up/
│   │       │       └── route.ts    # Insider sign-up (public)
│   │       ├── promote/
│   │       │   └── route.ts    # Machine-key protected bootstrap endpoint
│   │       ├── hello/
│   │       │   └── route.ts    # Hello world endpoint
│   │       └── users/
│   │           ├── route.ts    # List/create users (protected)
│   │           └── [id]/
│   │               └── route.ts # Get/update/delete user (protected)
│   ├── terms/                 # Terms of Service page
│   │   └── page.tsx
│   ├── privacy/               # Privacy Policy page
│   │   └── page.tsx
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page (brand guide)
├── components/                 # React components
│   ├── brand-guide/            # Brand guide sections
│   ├── landing/                # Landing page sections + footer
│   ├── legal/                  # Legal page layout (shared by /terms and /privacy)
│   ├── theme-provider.tsx
│   └── ui/                     # shadcn/ui components
├── hooks/                      # Custom React hooks
├── lib/
│   ├── api-utils.ts            # API response helpers
│   ├── auth-middleware.ts      # withAuth() wrapper
│   ├── admin-middleware.ts     # withAdmin() wrapper (ADMIN_USERS)
│   ├── machine-key-middleware.ts # withMachineKey() wrapper (MACHINE_KEY)
│   ├── auth-context.tsx        # AuthProvider, useAuth (web admin)
│   ├── sdk.ts                  # Browser SDK (token storage)
│   ├── jwt.ts                  # JWT signing/verification
│   ├── rate-limiter.ts         # Rate limiting
│   └── utils.ts                # General utilities
├── public/                     # Static assets
├── styles/
│   └── globals.css
├── .env.example                # Environment template
├── next.config.mjs             # Next.js configuration
├── package.json
└── tsconfig.json               # TypeScript configuration
```

## Architecture

### Next.js App Router API Routes

API routes are defined in the `app/api/` directory using the App Router convention. Each route file exports HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`, etc.).

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Layer                           │
│  Route Handler (route.ts) → Validation → Response           │
├─────────────────────────────────────────────────────────────┤
│                      Business Layer                         │
│  Prisma operations (inline or via service functions)        │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                            │
│  Prisma Client → PostgreSQL                                 │
└─────────────────────────────────────────────────────────────┘
```

### Route File Structure

Each route file follows this pattern:

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { someSchema } from "@coworker/shared-services";
import { successResponse, validationErrorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Handle GET request
}

export async function POST(request: NextRequest) {
  // Handle POST request
}
```

## Validation & Type Safety

### Zod Schemas

All request validation uses Zod schemas from `@coworker/shared-services`:

```typescript
import { createUserSchema } from "@coworker/shared-services";
import type { CreateUserInput } from "@coworker/shared-services";

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }
  
  const data = result.data as CreateUserInput;
  // Use validated data
}
```

### Type Safety Guidelines

1. **Use shared schemas** from `@coworker/shared-services` for all API contracts
2. **Always validate input** using Zod's `safeParse` method
3. **Use type-only imports** for TypeScript types: `import type { ... }`
4. **Enable strict TypeScript** - the project uses `strict: true`

## API Response Format

All API responses follow a consistent envelope format:

### Success Response

```json
{
  "status": "success",
  "data": { ... }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description"
}
```

### Validation Error Response

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

## Response Helpers

Use the helper functions in `lib/api-utils.ts` for consistent responses:

```typescript
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
  noContentResponse,
} from "@/lib/api-utils";

// Success with data
return successResponse(user);

// Success with custom status
return successResponse(user, 201);

// Error
return errorResponse("Something went wrong", 500);

// Validation error
return validationErrorResponse(zodResult.error.issues);

// Not found
return notFoundResponse("User not found");

// Conflict (e.g., duplicate email)
return conflictResponse("Email already exists");

// No content (204)
return noContentResponse();
```

## Models API

Coworker supports multiple AI models via a centralized catalog managed in Pilot.

### Public Endpoint

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/models` | None | List active models available to the app. |

Response includes `id`, `title`, `value`, `isDefault`.

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/models` | Admin | List all models. |
| `POST` | `/api/v1/admin/models` | Admin | Create a model. |
| `GET` | `/api/v1/admin/models/:id` | Admin | Get a model by ID. |
| `PATCH` | `/api/v1/admin/models/:id` | Admin | Update a model. |
| `DELETE` | `/api/v1/admin/models/:id` | Admin | Delete a model. |

### Default Model Behavior

- Exactly one model should be marked as default.
- Chat requests use the default model when no model is provided.
- If no default model is configured, the chat endpoint returns an error.

## Machine-Key Authorization

Some endpoints are designed for server-to-server automation and must be protected by a machine key instead of user auth. This pattern is enforced by `withMachineKey()` in `lib/machine-key-middleware.ts`.

### Environment Variables

- `MACHINE_KEY` — shared secret required for machine-key protected routes
- `PROMOTE_USER` — email address used by `/api/v1/promote` to bootstrap the first admin user
- `AI_GATEWAY_API_KEY` — Vercel AI Gateway API key used by `/api/v1/chat` (AI streaming)
- `AI_MODEL` — optional override for the default chat model (e.g. `openai/gpt-4.1`)

### Header Contract

All machine-key routes require the `X-Machine-Key` header with an exact match to `MACHINE_KEY`.

### Example Route

```typescript
import { NextResponse } from "next/server";
import { withMachineKey } from "@/lib/machine-key-middleware";
import { successResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function handlePost(): Promise<NextResponse> {
  return successResponse({ ok: true });
}

export const POST = withMachineKey(handlePost);
```

## Forms with React Hook Form

All forms in coworker-pilot use React Hook Form with Zod validation via `@hookform/resolvers`. This ensures type-safe forms that share validation logic with the API.

### Required Packages

Both packages are already installed:
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod integration

### Form Pattern

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserSchemaInput } from "@coworker/shared-services";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function UserForm({ onSubmit }: { onSubmit: (data: CreateUserSchemaInput) => Promise<void> }) {
  const form = useForm<CreateUserSchemaInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
}
```

### Key Principles

1. **Use shared schemas** - Import Zod schemas from `@coworker/shared-services`
2. **Use zodResolver** - Connect Zod schemas to react-hook-form
3. **Use Form components** - Use the shadcn/ui Form primitives for consistent styling
4. **Handle loading states** - Disable submit button during submission
5. **Reset on success** - Call `form.reset()` after successful submission

## Event Logging

The `events` table provides an audit log for user activity. Events are written as fire-and-forget (non-blocking) so they never slow down the request path.

### Event Types

| Type | Trigger | Details |
|------|---------|---------|
| `user.sign_in` | Successful code verification in `verify-code` (server-side) | `{ email, name, authCodeId, attempts }` |
| `workspace.created` | User creates a new workspace (client-side via SDK) | `{ workspaceName }` |

When `workspace.created` is the user's **first** workspace event, a welcome email is sent asynchronously (fire-and-forget) with onboarding guidance on setting up co-workers, adding knowledge sources, and starting conversations. This does not affect API response time.

New event types can be added by extending the `eventTypeEnum` in `shared-services/src/schemas/event.ts`.

### Client-Side Event Tracking

The desktop app tracks events via `POST /api/v1/events` (protected, requires auth). The request body uses `trackEventSchema` — only `type` and optional `details`; the server injects `userId` from the auth token.

The app uses a fire-and-forget utility (`coworker-app/src/renderer/src/lib/track-event.ts`) that catches all errors silently so event tracking never disrupts the user experience.

### Shared Contracts

- **Type:** `Event`, `WorkspaceCreatedEventDetails` in `shared-services/src/types/domain/event.ts`
- **Schema:** `createEventSchema`, `trackEventSchema`, `eventTypeEnum` in `shared-services/src/schemas/event.ts`
- **SDK:** `EventsEndpoint` in `shared-services/src/sdk/endpoints/events.ts`
- **Prisma model:** `Event` in `shared-services/prisma/schema.prisma`

## Database

### Prisma Client

The Prisma client is imported from `@coworker/shared-services`:

```typescript
import { prisma } from "@coworker/shared-services/db";
```

### Prisma Configuration

Prisma is configured in `shared-services/`:

```
shared-services/
├── prisma/
│   ├── schema.prisma     # Schema definition
│   └── migrations/       # Migration files
└── prisma.config.ts      # Prisma 7 configuration
```

### Running Migrations

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

## Public Pages

### Legal Pages

The pilot serves Terms of Service and Privacy Policy pages rendered from markdown files in the repository's `content/` directory:

```
GET /terms     # Terms of Service
GET /privacy   # Privacy Policy
```

Both pages use `LegalPageLayout` (`components/legal/legal-page-layout.tsx`), which renders markdown via `react-markdown` with `@tailwindcss/typography` prose styling. The markdown is read from `../content/TERMS_OF_SERVICE.md` and `../content/PRIVACY_POLICY.md` at build time via `fs`.

The landing page footer links to both legal pages, and the insider sign-up flow includes a legal consent checkbox that links to them.

## Available Endpoints

### Health Check

```
GET /api/health
```

Returns API health status and user count.

### Hello World

```
GET /api/v1/hello
GET /api/v1/hello?name=Alice
```

Returns a greeting message with timestamp.

### Authentication

See [Authentication Documentation](./authentication.md) for complete details.

```
POST   /api/v1/auth/request-code   # Request verification code (public)
POST   /api/v1/auth/verify-code    # Verify code and get tokens (public)
POST   /api/v1/auth/refresh        # Refresh access token (public)
POST   /api/v1/auth/logout         # Revoke refresh token (public)
GET    /api/v1/auth/me             # Get current user (protected)
GET    /api/v1/auth/admin-check    # Check if user is admin (protected)
```

### Admin Dashboard and Authorization

See [Admin Dashboard and Authorization](./admin.md) for configuration and creating admin-only endpoints. Admin access is controlled by the `ADMIN_USERS` environment variable (comma-separated emails). Use `withAdmin()` from `lib/admin-middleware.ts` for admin-only API routes.

### Users (Protected)

All user endpoints require authentication via Bearer token.

```
GET    /api/v1/users          # List all users
POST   /api/v1/users          # Create user
GET    /api/v1/users/:id      # Get user by ID
PATCH  /api/v1/users/:id      # Update user
DELETE /api/v1/users/:id      # Delete user
```

### Feedback (Optional Auth)

Authentication is optional. If a valid Bearer token is provided, the feedback is attached to the user.

```
POST /api/v1/feedback  # Submit feedback
```

Signed-in submissions trigger a confirmation email to the submitting user with a summary of their feedback (no screenshot included).

### Feedback (Admin)

```
GET /api/v1/admin/feedback                   # List feedback submissions
GET /api/v1/admin/feedback/:id/screenshot    # Fetch feedback screenshot
```

### Insider Codes (Admin)

```
GET    /api/v1/admin/insider-codes          # List all insider codes with activation counts
POST   /api/v1/admin/insider-codes          # Create insider code
GET    /api/v1/admin/insider-codes/:id      # Get insider code by ID
PATCH  /api/v1/admin/insider-codes/:id      # Update insider code
DELETE /api/v1/admin/insider-codes/:id      # Delete insider code
```

### Insider Preview (Public)

```
POST /api/v1/insider/validate-code   # Validate an insider code exists and is active
POST /api/v1/insider/sign-up         # Create user account via insider preview
```

### Events (Protected)

```
POST /api/v1/events  # Track a client-side event
```

Body: `{ type: EventType, details?: Record<string, unknown> }`. The server injects `userId` from the auth token.

### Chat (Protected)

```
POST /api/v1/chat  # Stream AI responses for thread conversations
```

Chat streaming supports model tool calls. Current tools:

- `report_status` — Emits short activity labels during streaming.
- `set_conversation_title` — Emits a concise conversation title for first-message auto-naming.
- `list_channel_coworkers` — Returns channel coworker context, mention hints, and coworker summaries (id, name, description) for orchestration.
- `list_thread_documents` — Returns summaries for documents in the current thread.
- `list_workspace_documents` — Returns summaries for documents across the workspace.
- `find_document` — Finds line matches in a document (executed in main process against live blob content).
- `read_document_range` — Reads a line range from a document with line numbers (executed in main process against live blob content, max 400 lines).
- `edit_document` — Edits a document via search-and-replace. Accepts an array of `{search, replace}` edits applied in order. Includes validation for unique matches and content-loss protection.
- `create_document_copy` — Creates a copy of a document in the current thread.
- `generate_coworker_response` — Runs a subordinate model to generate a coworker-specific reply.
- `emit_coworker_message` — Emits a coworker reply payload for the client to render.
- `save_memory` — Stores durable preferences/facts as memories linked to one or more coworkers.
- `request_interview` — Asks the user 1-5 clarifying multiple-choice questions before generating coworker responses. Triggers a `stopWhen` halt so the client can render the interview UI and collect answers.
- `emit_document` — Emits a document artifact (brief, report, plan, etc.) as a separate `.md` file stored via blob storage. The client renders a clickable document bar in the thread with a dialog for viewing the rendered markdown.

Chat request payload includes orchestration context:

- `threadContext` — Thread/channel/workspace metadata used for coworker system prompts.
- `channelCoworkers` — Coworker details available to the orchestrator.
- `mentionedCoworkerIds` — Explicit coworker mentions extracted from the user message.
- `maxCoworkerResponses` — Upper bound on coworker replies per user message.
- `threadDocuments` — Document summaries available for the current thread.
- `mentionedDocuments` — Document summaries for any @mentioned documents.
- `workspaceDocuments` — Document summaries across the workspace for discovery.
- `documentContents` — Document content map keyed by messageId (used for RAG context; document tools read live blob content from the main process).

Tool responses include `ok`/`error` when relevant. The orchestrator must retry on
`ok: false` or any `error` by re-reading the document and using exact text for
search strings.

Document edit tools require commit messages:

- `edit_document` includes `commitMessage` and an array of `edits` with `search`/`replace` pairs
- `create_document_copy` accepts optional `commitMessage`

## Adding a New API Endpoint

### 1. Create the route file (Protected)

For protected endpoints that require authentication, use `withAuth()`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { yourSchema } from "@coworker/shared-services";
import { successResponse, validationErrorResponse } from "@/lib/api-utils";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  const { userId } = request.auth; // Access authenticated user
  const items = await prisma.yourModel.findMany({
    where: { userId }, // Scope to user
  });
  return successResponse(items);
}

async function handlePost(request: AuthenticatedRequest): Promise<NextResponse> {
  const { userId } = request.auth;
  const body = await request.json();
  
  const result = yourSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }
  
  const item = await prisma.yourModel.create({
    data: { ...result.data, userId },
  });
  
  return successResponse(item, 201);
}

// Export wrapped handlers
export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
```

### 1a-2. Create the route file (Admin-only)

For endpoints that require the caller to be in `ADMIN_USERS`, use `withAdmin()` from `lib/admin-middleware.ts`. See [Admin Dashboard and Authorization](./admin.md) for full details.

```typescript
import { NextResponse } from "next/server";
import { withAdmin, AuthenticatedRequest } from "@/lib/admin-middleware";
import { successResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  const { userId, email } = request.auth; // User is authenticated and in ADMIN_USERS
  // Admin-only logic
  return successResponse({ ok: true });
}

export const GET = withAdmin(handleGet);
```

### 1b. Create the route file (Public)

For public endpoints that don't require authentication:

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { yourSchema } from "@coworker/shared-services";
import { successResponse, validationErrorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.yourModel.findMany();
  return successResponse(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = yourSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }
  
  const item = await prisma.yourModel.create({
    data: result.data,
  });
  
  return successResponse(item, 201);
}
```

### 2. For dynamic routes, create `[id]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { successResponse, notFoundResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  
  const item = await prisma.yourModel.findUnique({
    where: { id },
  });
  
  if (!item) {
    return notFoundResponse("Item not found");
  }
  
  return successResponse(item);
}
```

### 3. Add types and schemas to shared-services

If your endpoint needs new types or schemas, add them to `shared-services/src/`:

```typescript
// shared-services/src/schemas/your-resource.ts
import { z } from "zod";

export const createYourResourceSchema = z.object({
  name: z.string().min(1),
  // ...
});

export type CreateYourResourceInput = z.infer<typeof createYourResourceSchema>;
```

## Development

### Starting the Dev Server

```bash
# Start via pm2 (recommended)
pnpm dev:pilot

# Or start directly
pnpm --filter coworker-pilot dev:raw
```

### Environment Variables

Create a `.env` file in `coworker-pilot/` (see `.env.example`):

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coworker?schema=public"

# JWT Configuration (required for authentication)
# Generate secrets with: openssl rand -base64 32
JWT_SECRET=your-256-bit-secret-key-here
JWT_REFRESH_SECRET=your-separate-refresh-secret-here

# Admin Users (comma-separated email addresses)
# Only these users can access /admin and admin-protected API endpoints
ADMIN_USERS=admin@example.com
```

**Security Note:** Both JWT secrets must be cryptographically random, at least 32 characters, and different from each other. See [Admin Dashboard and Authorization](./admin.md) for `ADMIN_USERS` usage.

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev:pilot` | Start development server via pm2 |
| `pnpm --filter coworker-pilot dev:raw` | Start dev server directly |
| `pnpm --filter coworker-pilot build` | Production build |
| `pnpm --filter coworker-pilot start` | Run production server |
| `pnpm --filter coworker-pilot lint` | Run ESLint |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Generate Prisma client
pnpm db:generate

# 3. Run migrations
pnpm db:migrate

# 4. Start development server
pnpm dev:pilot

# 5. Test the API
curl http://localhost:3000/api/health
curl http://localhost:3000/api/v1/hello?name=World
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```
