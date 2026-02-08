# Coworker Authentication System

## Overview

Coworker uses a passwordless, email-based authentication system with JWT tokens. Users sign in by receiving a 6-digit code via email, which is then exchanged for access and refresh tokens. This document covers the architecture, flow, and developer guide for working with authenticated endpoints.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Electron App                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Renderer Process                              │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │    │
│  │  │  AuthFlow   │    │  Dashboard  │    │ Components  │              │    │
│  │  │  Component  │    │  Component  │    │   (UI)      │              │    │
│  │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘              │    │
│  │         │                  │                  │                      │    │
│  │         └──────────────────┴──────────────────┘                      │    │
│  │                            │                                         │    │
│  │                    window.api.auth.*                                 │    │
│  └────────────────────────────┼─────────────────────────────────────────┘    │
│                               │ IPC                                          │
│  ┌────────────────────────────┼─────────────────────────────────────────┐    │
│  │                     Preload Script                                    │    │
│  │              ipcRenderer.invoke('auth:*')                            │    │
│  └────────────────────────────┼─────────────────────────────────────────┘    │
│                               │ IPC                                          │
│  ┌────────────────────────────┼─────────────────────────────────────────┐    │
│  │                      Main Process                                     │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │    │
│  │  │   SDK       │    │ Auth        │    │ Token       │              │    │
│  │  │ (API calls) │    │ Storage     │    │ Refresh     │              │    │
│  │  └──────┬──────┘    └──────┬──────┘    └─────────────┘              │    │
│  │         │                  │                                         │    │
│  │         │           safeStorage API                                  │    │
│  │         │           (OS keychain)                                    │    │
│  └─────────┼──────────────────┼─────────────────────────────────────────┘    │
└────────────┼──────────────────┼─────────────────────────────────────────────┘
             │                  │
             │ HTTPS            │ Encrypted on disk
             ▼                  ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│    coworker-pilot API   │    │   OS Secure Storage     │
│    (Next.js + Prisma)   │    │   (Keychain/Credential) │
└─────────────────────────┘    └─────────────────────────┘
```

## Authentication Flow

### Sign In Flow

```mermaid
sequenceDiagram
    participant User
    participant Renderer
    participant Main as Main Process
    participant API as coworker-pilot
    participant DB as PostgreSQL

    User->>Renderer: Enter email
    Renderer->>Main: auth:requestCode(email)
    Main->>API: POST /api/v1/auth/request-code
    API->>DB: Check user exists
    API->>DB: Invalidate old codes
    API->>DB: Create AuthCode (hashed)
    API->>API: Send email via Resend
    API-->>Main: { success: true }
    Note over API: Email with 6-digit code sent
    Main-->>Renderer: Show code input

    User->>Renderer: Enter 6-digit code
    Renderer->>Main: auth:verifyCode(email, code)
    Main->>API: POST /api/v1/auth/verify-code
    API->>DB: Verify code (bcrypt compare)
    API->>DB: Mark code as used
    API->>DB: Create RefreshToken
    API-->>Main: { accessToken, refreshToken, user }
    Main->>Main: safeStorage.encryptString(tokens)
    Main-->>Renderer: { user }
    Renderer->>User: Show Dashboard
```

### Token Refresh Flow

```mermaid
sequenceDiagram
    participant Main as Main Process
    participant API as coworker-pilot
    participant DB as PostgreSQL

    Main->>API: GET /api/v1/users (with expired token)
    API-->>Main: 401 Unauthorized
    Main->>Main: Load refresh token from storage
    Main->>API: POST /api/v1/auth/refresh
    API->>DB: Validate refresh token
    API->>DB: Revoke old refresh token
    API->>DB: Create new refresh token
    API-->>Main: { accessToken, refreshToken (new), user }
    Main->>Main: Save new tokens
    Main->>API: GET /api/v1/users (retry with new token)
    API-->>Main: { data: [...] }
```

## Security Features

### Token Security

| Feature | Implementation |
|---------|---------------|
| **Access Token** | JWT (HS256), 15-minute expiry, contains user ID and email |
| **Refresh Token** | Random 256-bit value, 7-day expiry, hashed in database |
| **Token Rotation** | New refresh token issued on every refresh |
| **Theft Detection** | Reuse of revoked token revokes all user tokens |
| **Secure Storage** | Electron `safeStorage` API (OS keychain encryption) |

### Auth Code Security

| Feature | Implementation |
|---------|---------------|
| **Generation** | `crypto.randomInt(100000, 999999)` |
| **Storage** | bcrypt hashed in database |
| **Expiry** | 10 minutes |
| **Attempts** | Max 5 attempts per code |
| **Invalidation** | Previous codes invalidated on new request |

### Rate Limiting

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| `POST /auth/request-code` | 3 requests | 15 min | Per email |
| `POST /auth/verify-code` | 5 attempts | 15 min | Per email |
| `POST /auth/refresh` | 10 requests | 1 min | Per IP |

### JWT Claims

```typescript
{
  sub: string      // User ID
  email: string    // User email
  iss: 'coworker'  // Issuer (validated)
  aud: 'coworker-app'  // Audience (validated)
  iat: number      // Issued at
  exp: number      // Expiration
}
```

## API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/request-code` | Request verification code |
| `POST` | `/api/v1/auth/verify-code` | Verify code and get tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token |
| `GET` | `/api/v1/hello` | Health check / test endpoint |
| `GET` | `/api/health` | API health status |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/auth/me` | Get current user |
| `GET` | `/api/v1/auth/admin-check` | Check if current user is admin (web admin UX) |
| `GET` | `/api/v1/users` | List all users |
| `POST` | `/api/v1/users` | Create user |
| `GET` | `/api/v1/users/:id` | Get user by ID |
| `PATCH` | `/api/v1/users/:id` | Update user |
| `DELETE` | `/api/v1/users/:id` | Delete user |

### Machine-Key Protected Endpoints

Some endpoints are protected by a server-to-server machine key instead of user auth. These routes are **never** called by the client app directly and should only be invoked by trusted automation or ops tooling.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/promote` | Create the `PROMOTE_USER` if missing (machine key required) |

#### Machine Key Requirements

- **Header:** `X-Machine-Key`
- **Env:** `MACHINE_KEY`
- **Bootstrap Env:** `PROMOTE_USER` (used by `/api/v1/promote`)
- **Validation:** exact match using constant-time comparison
- **Failure:** `401 Unauthorized` if missing/invalid, `500` if not configured

Use the reusable middleware in `coworker-pilot/lib/machine-key-middleware.ts` to protect machine-key routes. This is the standard pattern for non-user, server-to-server operations.

### Web Admin Authentication

The Next.js app (coworker-pilot) uses the same auth endpoints for the admin dashboard. Users sign in at `/login` (email + 6-digit code); tokens are stored in localStorage and the SDK is configured with token callbacks. Only users listed in `ADMIN_USERS` can access `/admin` and admin-protected API endpoints. See [Admin Dashboard and Authorization](./admin.md) for full documentation.

## Developer Guide

### Creating a Protected Endpoint

#### 1. Define the Route Handler

Use `withAuth()` to protect your endpoint:

```typescript
// coworker-pilot/app/api/v1/your-resource/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { yourSchema } from "@coworker/shared-services";
import { successResponse, validationErrorResponse } from "@/lib/api-utils";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

// Handler receives AuthenticatedRequest with auth context
async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  // Access authenticated user info
  const { userId, email } = request.auth;

  const items = await prisma.yourModel.findMany({
    where: { userId }, // Scope to authenticated user
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
    data: {
      ...result.data,
      userId, // Associate with authenticated user
    },
  });

  return successResponse(item, 201);
}

// Export wrapped handlers
export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
```

#### 2. For Optional Authentication

Use `withOptionalAuth()` when auth is optional:

```typescript
import { withOptionalAuth } from "@/lib/auth-middleware";

async function handleGet(
  request: NextRequest & { auth?: AuthContext }
): Promise<NextResponse> {
  if (request.auth) {
    // User is authenticated
    const { userId } = request.auth;
    // Return personalized data
  } else {
    // Anonymous user
    // Return public data
  }
}

export const GET = withOptionalAuth(handleGet);
```

#### 3. Dynamic Routes with Auth

```typescript
// coworker-pilot/app/api/v1/your-resource/[id]/route.ts
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

interface RouteContext {
  params?: Promise<{ id: string }>;
}

async function handleGet(
  request: AuthenticatedRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params!;
  const { userId } = request.auth;

  const item = await prisma.yourModel.findUnique({
    where: { id, userId }, // Ensure user owns the resource
  });

  if (!item) {
    return notFoundResponse("Resource not found");
  }

  return successResponse(item);
}

export const GET = withAuth(handleGet);
```

### Adding SDK Endpoint Methods

#### 1. Update shared-services SDK

```typescript
// shared-services/src/sdk/endpoints/your-resource.ts
import type { ApiClient } from "../client.js";
import type { YourResource, CreateYourResourceInput } from "../../types/domain/your-resource.js";
import { createYourResourceSchema } from "../../schemas/your-resource.js";
import { parseWithSchema } from "../validation.js";

export class YourResourceEndpoint {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<YourResource[]> {
    // Authenticated requests use client.get() - token added automatically
    return this.client.get<YourResource[]>("/api/v1/your-resource");
  }

  async create(data: CreateYourResourceInput): Promise<YourResource> {
    const parsed = parseWithSchema(createYourResourceSchema, data);
    return this.client.post<YourResource>("/api/v1/your-resource", parsed);
  }

  async getById(id: string): Promise<YourResource> {
    return this.client.get<YourResource>(`/api/v1/your-resource/${id}`);
  }
}
```

#### 2. Register in SDK

```typescript
// shared-services/src/sdk/index.ts
import { YourResourceEndpoint } from "./endpoints/your-resource.js";

export class CoworkerSdk {
  // ... existing endpoints
  public readonly yourResource: YourResourceEndpoint;

  constructor(config: CoworkerSdkConfig) {
    this.client = new ApiClient(config);
    // ... existing
    this.yourResource = new YourResourceEndpoint(this.client);
  }
}
```

### Wiring IPC for New Endpoints

#### 1. Add IPC Handler in Main Process

```typescript
// coworker-app/src/main/index.ts
ipcMain.handle('api:yourResource:list', async () =>
  (await getSdk()).yourResource.list()
)

ipcMain.handle(
  'api:yourResource:create',
  async (_event, data: Parameters<CoworkerSdk['yourResource']['create']>[0]) =>
    (await getSdk()).yourResource.create(data)
)
```

#### 2. Expose in Preload

```typescript
// coworker-app/src/preload/index.ts
const api = {
  // ... existing
  yourResource: {
    list: async () => ipcRenderer.invoke('api:yourResource:list'),
    create: async (data: Parameters<CoworkerSdk['yourResource']['create']>[0]) =>
      ipcRenderer.invoke('api:yourResource:create', data),
  }
}
```

#### 3. Use in Renderer

```svelte
<script lang="ts">
  let items = $state<YourResource[]>([])

  async function loadItems() {
    items = await window.api.yourResource.list()
  }

  async function createItem(data: CreateYourResourceInput) {
    const item = await window.api.yourResource.create(data)
    items = [...items, item]
  }
</script>
```

### Handling Auth Errors in UI

The SDK throws specific error types for auth failures:

```typescript
import {
  AuthenticationSdkError,
  RateLimitSdkError,
  UserNotFoundSdkError,
  CodeExpiredSdkError,
  CodeInvalidSdkError,
} from '@coworker/shared-services'

try {
  await window.api.auth.requestCode(email)
} catch (error) {
  if (error instanceof UserNotFoundSdkError) {
    showError("We couldn't find an account with that email.")
  } else if (error instanceof RateLimitSdkError) {
    showError(`Too many attempts. Try again in ${error.retryAfter} seconds.`)
  } else {
    showError("Something went wrong. Please try again.")
  }
}
```

## Database Schema

### AuthCode Model

```prisma
model AuthCode {
  id        String    @id @default(cuid())
  code      String    // bcrypt hashed 6-digit code
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  attempts  Int       @default(0)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@index([userId, expiresAt])
  @@index([expiresAt])
  @@map("auth_codes")
}
```

### RefreshToken Model

```prisma
model RefreshToken {
  id        String    @id @default(cuid())
  token     String    @unique // bcrypt hashed
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

### Event Model (Audit Log)

```prisma
model Event {
  id        String   @id @default(cuid())
  type      String
  userId    String?  @map("user_id")
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  details   Json?    @default("{}")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([type])
  @@index([userId])
  @@index([createdAt])
  @@map("events")
}
```

- `userId` is nullable with `onDelete: SetNull` — events survive user deletion as audit records
- `details` is PostgreSQL JSONB for structured event-specific data

#### Event Types

| Type | Trigger | Details |
|------|---------|---------|
| `user.sign_in` | Successful code verification | `{ email, name, authCodeId, attempts }` |

Sign-in events are logged as fire-and-forget (non-blocking) after successful code verification in `verify-code`. The `email` and `name` fields are denormalized snapshots captured at sign-in time. The `attempts` field records how many failed code entries preceded the successful one.

## Environment Variables

### coworker-pilot/.env

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/coworker

# JWT Configuration (generate with: openssl rand -base64 32)
JWT_SECRET=your-256-bit-secret-key-here
JWT_REFRESH_SECRET=your-separate-refresh-secret-here

# Email Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=Coworker <auth@yourdomain.com>
SKIP_EMAIL_IN_DEV=false
```

### JWT Secrets

Both JWT secrets must be:
- Cryptographically random (use `openssl rand -base64 32`)
- At least 32 characters
- Different from each other (defense in depth)

### Email Configuration (Resend)

Coworker uses [Resend](https://resend.com) to send verification code emails.

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | Your Resend API key (starts with `re_`) |
| `EMAIL_FROM_ADDRESS` | Yes | Verified sender address (e.g., `Coworker <auth@yourdomain.com>`) |
| `SKIP_EMAIL_IN_DEV` | No | Set to `true` to skip email sending in development (codes logged to console) |

#### Getting a Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to [API Keys](https://resend.com/api-keys) in the dashboard
3. Create a new API key with "Sending access" permission
4. Copy the key (starts with `re_`) to your `.env` file

#### Domain Verification

For production, you must verify your sending domain:

1. Go to [Domains](https://resend.com/domains) in the Resend dashboard
2. Add your domain (e.g., `yourdomain.com`)
3. Add the DNS records Resend provides (SPF, DKIM, DMARC)
4. Wait for verification (usually a few minutes)
5. Update `EMAIL_FROM_ADDRESS` to use an address on your verified domain

For development/testing, you can use Resend's test address: `onboarding@resend.dev`

#### Development Mode

Set `SKIP_EMAIL_IN_DEV=true` to skip actual email sending during development. The verification code will be logged to the console instead:

```
[EMAIL] Skipped (dev mode) - Verification code for user@example.com: 123456
```

This allows testing the auth flow without needing a Resend account or verified domain

## File Reference

### API (coworker-pilot)

| File | Purpose |
|------|---------|
| `lib/jwt.ts` | JWT signing/verification with jose |
| `lib/email.ts` | Email sending with Resend |
| `lib/email-templates.ts` | HTML/text email templates |
| `lib/auth-middleware.ts` | `withAuth()` and `withOptionalAuth()` wrappers |
| `lib/rate-limiter.ts` | Rate limiting configuration |
| `lib/api-utils.ts` | Response helpers including `unauthorizedResponse()` |
| `app/api/v1/auth/request-code/route.ts` | Request verification code |
| `app/api/v1/auth/verify-code/route.ts` | Verify code, issue tokens |
| `app/api/v1/auth/refresh/route.ts` | Token refresh with rotation |
| `app/api/v1/auth/logout/route.ts` | Revoke refresh token |
| `app/api/v1/auth/me/route.ts` | Get current authenticated user |

### SDK (shared-services)

| File | Purpose |
|------|---------|
| `src/schemas/auth.ts` | Zod schemas for auth requests |
| `src/types/domain/auth.ts` | TypeScript interfaces for auth |
| `src/sdk/endpoints/auth.ts` | Auth endpoint methods |
| `src/sdk/errors.ts` | Auth-specific error classes |
| `src/sdk/client.ts` | Token management in API client |

### Electron App (coworker-app)

| File | Purpose |
|------|---------|
| `src/main/auth-storage.ts` | Secure token storage with safeStorage |
| `src/main/index.ts` | Auth IPC handlers |
| `src/preload/index.ts` | Auth API exposure to renderer |
| `src/renderer/src/components/AuthFlow.svelte` | Sign-in UI |
| `src/renderer/src/components/Dashboard.svelte` | Post-auth landing page |

## Testing Authentication

### Manual Testing

1. **Start the API:**
   ```bash
   cd coworker-pilot && pnpm dev
   ```

2. **Start the app:**
   ```bash
   cd coworker-app && pnpm dev
   ```

3. **Create a test user:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/users \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test User"}'
   ```

4. **Sign in via the app:**
   - Click "Sign in to get started"
   - Enter the test user's email
   - Check the API console for the 6-digit code
   - Enter the code

5. **Verify authenticated access:**
   - You should see "Hello, Test User" on the dashboard
   - Token is stored securely (check with Keychain Access on macOS)

### API Testing with curl

```bash
# Request code
curl -X POST http://localhost:3000/api/v1/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify code (get from console logs)
curl -X POST http://localhost:3000/api/v1/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# Use access token
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"

# Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "JWT_SECRET not set" | Missing env variable | Add JWT_SECRET to `.env` |
| "User not found" | Email not in database | Create user first |
| "Code expired" | Code older than 10 min | Request new code |
| "Too many attempts" | 5+ failed code entries | Request new code |
| "Token has expired" | Access token > 15 min old | SDK auto-refreshes; check refresh token |
| Tokens not persisting | Linux without secret store | Check `safeStorage.isEncryptionAvailable()` |

### Debugging Token Storage

On macOS, tokens are stored in the Keychain. You can verify:

1. Open Keychain Access
2. Search for "Coworker" or "electron"
3. Tokens appear as encrypted entries

On Linux without a secret store, `safeStorage` may fall back to plaintext or refuse to store. The app handles this by requiring re-authentication each session.
