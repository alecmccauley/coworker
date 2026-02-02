# Working with @coworker/shared-services

This guide explains how to use the shared-services package for type-safe API integration between the coworker-pilot and coworker-app.

## Overview

The `@coworker/shared-services` package provides:

- **Types**: Shared TypeScript types for API responses and domain entities
- **Schemas**: Zod validation schemas for request/response validation
- **SDK**: A type-safe client for making API requests
- **Database**: Prisma client for database access

## Package Structure

```
shared-services/
├── src/
│   ├── index.ts                    # Main entry (re-exports all)
│   ├── db/                          # Prisma client
│   │   ├── client.ts               # Prisma setup with pg adapter
│   │   └── index.ts
│   ├── types/
│   │   ├── index.ts                # Type exports
│   │   ├── api.ts                  # ApiResponse<T>, ApiError, etc.
│   │   └── crud.ts                 # BaseEntity, BaseCreateInput, etc.
│   │   └── domain/
│   │       ├── index.ts
│   │       ├── user.ts             # User, CreateUserInput, etc.
│   │       └── hello.ts            # HelloQuery, HelloData
│   ├── schemas/
│   │   ├── index.ts                # Schema exports
│   │   ├── hello.ts                # helloQuerySchema
│   │   └── user.ts                 # createUserSchema, etc.
│   └── sdk/
│       ├── index.ts                # SDK entry + CoworkerSdk class
│       ├── client.ts               # ApiClient (fetch wrapper)
│       ├── errors.ts               # SdkError, ValidationSdkError, etc.
│       └── endpoints/
│           ├── index.ts
│           ├── hello.ts            # HelloEndpoint
│           └── users.ts            # UsersEndpoint
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Migration files
├── prisma.config.ts                # Prisma 7 configuration
└── dist/                           # Compiled output
```

## Prisma (Shared Database Package)

`shared-services` owns Prisma configuration, schema, and migrations:

```
shared-services/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── prisma.config.ts
```

### Using Prisma in another package

- Add `@coworker/shared-services` as a dependency.
- Ensure `DATABASE_URL` is set in the consuming package's `.env` (or process env).
- Import the shared Prisma client:

```typescript
import { prisma } from "@coworker/shared-services/db";
```

### Prisma CLI usage

Run Prisma commands from the root:

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio
pnpm db:seed        # Seed the database
```

## Installation

The package is already linked in the monorepo. After cloning:

```bash
# Install all dependencies
pnpm install

# Build shared-services (required before using in other packages)
pnpm build:shared
```

## Usage in coworker-pilot (Next.js API)

### Importing Types

```typescript
import type { HelloData, HelloQuery, User, CreateUserInput } from '@coworker/shared-services';
```

### Using Schemas for Validation

```typescript
import { NextRequest } from "next/server";
import { createUserSchema } from "@coworker/shared-services";
import { successResponse, validationErrorResponse } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }
  
  // Use validated data
  const user = await prisma.user.create({ data: result.data });
  return successResponse(user, 201);
}
```

### Using Prisma

```typescript
import { prisma } from "@coworker/shared-services/db";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return successResponse(users);
}
```

## Usage in coworker-app (Electron)

**Strict rule:** all network access (SDK calls) happens in the **main process**.
The renderer only talks to the main process through IPC, and uses shared types
end-to-end for a clean, typed developer experience.

### 1) Main process owns the SDK

Create the SDK in the main process and register IPC handlers. This keeps network
access and secrets out of the renderer.

```typescript
// src/main/index.ts
import { ipcMain } from 'electron'
import type { CoworkerSdk } from '@coworker/shared-services'

let sdk: CoworkerSdk | null = null

const getSdk = async () => {
  if (sdk) return sdk
  const { createDevSdk } = await import('@coworker/shared-services')
  sdk = createDevSdk()
  return sdk
}

ipcMain.handle('api:hello:sayHello', async (_event, name?: string) =>
  (await getSdk()).hello.sayHello(name ? { name } : undefined)
)

ipcMain.handle(
  'api:users:create',
  async (_event, data: Parameters<CoworkerSdk['users']['create']>[0]) =>
    (await getSdk()).users.create(data)
)
```

### 2) Preload exposes a typed IPC facade

The preload script maps IPC channels to a typed `window.api` surface.

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { CoworkerSdk } from '@coworker/shared-services'

const api = {
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
  contextBridge.exposeInMainWorld('api', api)
}
```

### 3) Preload types wire `window.api`

```typescript
// src/preload/index.d.ts
import type { Api } from './index'

declare global {
  interface Window {
    api: Api
  }
}
```

### 4) Renderer uses typed wrappers (no SDK in renderer)

Keep renderer code clean and type-safe by calling `window.api` (or a tiny wrapper).
Use **type-only imports** from shared-services when you need shared types.

```typescript
// src/renderer/src/lib/api.ts
export const helloApi = {
  sayHello: (name?: string) => window.api.hello.sayHello(name)
}
```

```svelte
<script lang="ts">
  import { helloApi } from '$lib/api'
  import type { HelloData } from '@coworker/shared-services'

  let greeting = $state<HelloData | null>(null)

  async function sayHello() {
    greeting = await helloApi.sayHello('Alice')
  }
</script>

<button onclick={sayHello}>Say Hello</button>
{#if greeting}
  <p>{greeting.message}</p>
{/if}
```

### IPC Pattern Rules (enforced)

- **Main owns the SDK** and performs all HTTP calls.
- **Renderer never calls the API directly** and never imports the SDK at runtime.
- **IPC channels follow** `api:<domain>:<action>` and use `ipcMain.handle` + `ipcRenderer.invoke`.
- **Types flow from shared-services** using `CoworkerSdk` method signatures or shared domain types.

## SDK Reference

### Creating an SDK Instance

```typescript
import { createSdk, createDevSdk } from '@coworker/shared-services';

// Production: specify your API URL
const sdk = createSdk({ baseUrl: 'https://api.example.com' });

// Development: defaults to http://localhost:3000
const devSdk = createDevSdk();
```

### Endpoints

#### Hello Endpoint

```typescript
// Say hello
const result = await sdk.hello.sayHello(); // { message: "Hello World!", timestamp: "..." }
const result = await sdk.hello.sayHello({ name: 'Alice' }); // { message: "Hello Alice!", timestamp: "..." }
```

#### Users Endpoint

```typescript
// List all users
const users = await sdk.users.list();

// Get user by ID
const user = await sdk.users.getById('user-id');

// Create user
const newUser = await sdk.users.create({ email: 'alice@example.com', name: 'Alice' });

// Update user
const updated = await sdk.users.update('user-id', { name: 'Alice Smith' });

// Delete user
await sdk.users.delete('user-id');
```

### Error Handling

The SDK provides typed errors for different scenarios:

```typescript
import { SdkError, ValidationSdkError, NotFoundSdkError, NetworkSdkError } from '@coworker/shared-services';

try {
  const user = await sdk.users.getById('invalid-id');
} catch (error) {
  if (error instanceof NotFoundSdkError) {
    console.log('User not found');
  } else if (error instanceof ValidationSdkError) {
    console.log('Validation errors:', error.errors);
  } else if (error instanceof NetworkSdkError) {
    console.log('Network error - check your connection');
  } else if (error instanceof SdkError) {
    console.log('API error:', error.message, error.statusCode);
  }
}
```

### Client-side Validation in the SDK

The SDK validates inputs using the same Zod schemas before sending requests.
Validation failures throw `ValidationSdkError` with field-level details.

```typescript
try {
  await sdk.users.create({ email: 'not-an-email' });
} catch (error) {
  if (error instanceof ValidationSdkError) {
    console.log(error.errors);
  }
}
```

### Query Parameter Serialization

The API validates query params and route params as strings. The SDK sends:
- primitives (`string`, `number`, `boolean`, `bigint`) as strings
- `Date` values as ISO strings
- objects/arrays as JSON strings

If you add new query params, keep schemas aligned with these string inputs.

## API Response Format

All API responses follow this format:

```typescript
// Success
{
  status: "success",
  data: T // The response data
}

// Error
{
  status: "error",
  message: "Error description",
  errors?: [{ field: "email", message: "Invalid email" }] // Validation errors
}
```

### Type Guards

```typescript
import { isApiSuccess, isApiError, type ApiResponse } from '@coworker/shared-services';

const response: ApiResponse<User> = await fetch('/api/v1/users/1').then(r => r.json());

if (isApiSuccess(response)) {
  console.log(response.data); // User
} else {
  console.log(response.message); // Error message
}
```

## Adding New Endpoints

### 1. Define Types (`types/domain/your-entity.ts`)

```typescript
import type { BaseEntity, BaseCreateInput, BaseUpdateInput } from '../crud.js';

export interface YourEntity extends BaseEntity {
  // Your fields
}

export type CreateYourEntityInput = BaseCreateInput<YourEntity>;
export type UpdateYourEntityInput = BaseUpdateInput<YourEntity>;
```

### 2. Define Schemas (`schemas/your-entity.ts`)

```typescript
import { z } from 'zod';

export const createYourEntitySchema = z.object({
  // Your validation
});
```

### 3. Create SDK Endpoint (`sdk/endpoints/your-entity.ts`)

```typescript
import type { ApiClient } from '../client.js';
import type { YourEntity, CreateYourEntityInput } from '../../types/domain/your-entity.js';

export class YourEntityEndpoint {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<YourEntity[]> {
    return this.client.get<YourEntity[]>('/api/v1/your-entities');
  }

  async create(data: CreateYourEntityInput): Promise<YourEntity> {
    return this.client.post<YourEntity>('/api/v1/your-entities', data);
  }
}
```

### 4. Register in SDK (`sdk/index.ts`)

```typescript
import { YourEntityEndpoint } from './endpoints/your-entity.js';

export class CoworkerSdk {
  public readonly yourEntities: YourEntityEndpoint;

  constructor(config: CoworkerSdkConfig) {
    // ...
    this.yourEntities = new YourEntityEndpoint(this.client);
  }
}
```

### 5. Create API Route (`coworker-pilot/app/api/v1/your-entities/route.ts`)

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { createYourEntitySchema } from "@coworker/shared-services";
import { successResponse, validationErrorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.yourEntity.findMany();
  return successResponse(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = createYourEntitySchema.safeParse(body);
  
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }
  
  const item = await prisma.yourEntity.create({ data: result.data });
  return successResponse(item, 201);
}
```

### 6. Update Exports

Add exports to the relevant `index.ts` files.

## Development Workflow

```bash
# After making changes to shared-services:
pnpm build:shared

# Lint shared-services:
pnpm lint:shared

# Start the API (pilot):
pnpm dev:pilot

# Start the app (in another terminal):
pnpm dev:app
```

## Testing the Integration

```bash
# Test hello endpoint directly
curl "http://localhost:3000/api/v1/hello?name=World"
# Expected: {"status":"success","data":{"message":"Hello World!","timestamp":"..."}}

# In the Electron app:
# 1. Enter a name in the input field
# 2. Click "Say Hello"
# 3. Should display the greeting from the API
```
