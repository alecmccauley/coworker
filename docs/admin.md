# Admin Dashboard and Authorization

## Overview

The Coworker Pilot application includes an admin dashboard and server-side admin authorization. Only users whose email is listed in the `ADMIN_USERS` environment variable can access the `/admin` route and any admin-protected API endpoints. This document covers the architecture, configuration, and developer guide for the admin implementation.

## Architecture

```mermaid
flowchart TD
    subgraph client [Client Side]
        LoginPage["/login"]
        AdminLayout["/admin layout"]
        AdminDashboard["/admin page"]
        AuthProvider[AuthProvider]
    end

    subgraph api [API]
        RequestCode["POST /auth/request-code"]
        VerifyCode["POST /auth/verify-code"]
        Me["GET /auth/me"]
        AdminCheck["GET /auth/admin-check"]
    end

    subgraph auth [Authorization]
        WithAuth[withAuth]
        WithAdmin[withAdmin]
        ADMIN_USERS[ADMIN_USERS env]
    end

    LoginPage --> AuthProvider
    AdminLayout --> AuthProvider
    AuthProvider --> RequestCode
    AuthProvider --> VerifyCode
    AuthProvider --> Me
    AuthProvider --> AdminCheck
    AdminCheck --> WithAuth
    WithAdmin --> WithAuth
    WithAdmin --> ADMIN_USERS
```

### Key Concepts

| Concept | Description |
|--------|-------------|
| **Admin users** | Emails listed in `ADMIN_USERS` (comma-separated). Only these users can access admin UI and admin API endpoints. |
| **Client-side check** | Auth context calls `/api/v1/auth/admin-check` to set `isAdmin` for UX (show/hide admin UI, redirect non-admins). |
| **Server-side enforcement** | Every admin API endpoint uses `withAdmin()` middleware; authorization is never trusted from the client alone. |

## Environment Configuration

### ADMIN_USERS

Admin access is controlled by a single environment variable in `coworker-pilot/.env`:

```bash
# Comma-separated list of admin email addresses (case-insensitive)
ADMIN_USERS=admin@example.com,alec.mccauley@me.com
```

- **Format:** Comma-separated email addresses.
- **Matching:** Case-insensitive; leading/trailing whitespace is trimmed.
- **Security:** Stored only on the server; never exposed to the client.
- **Empty list:** If `ADMIN_USERS` is empty or unset, no user is considered an admin.

### Example .env

```bash
# coworker-pilot/.env
DATABASE_URL="postgresql://..."
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Admin users who can access /admin and admin API endpoints
ADMIN_USERS=alec.mccauley@me.com,ops@coworker.ai
```

## Web Admin Flow

### 1. Login (`/login`)

- User enters email; API validates that a user exists and sends a 6-digit code (see [Authentication](./authentication.md)).
- User enters code; API returns access and refresh tokens.
- Tokens are stored in the browser (localStorage) and the SDK is configured with token callbacks.

### 2. Admin Check

- After successful login, the client calls `GET /api/v1/auth/admin-check` with the access token.
- The API (using `withAuth()`) verifies the JWT and checks whether the user’s email is in `ADMIN_USERS`.
- Response: `{ status: "success", data: { isAdmin: true | false } }`.
- Auth context sets `isAdmin` from this response for client-side routing and UI.

### 3. Admin Route Protection (`/admin`)

- **Not authenticated:** Redirect to `/login`.
- **Authenticated but not admin:** Show “Access Denied” with options to go home or sign out.
- **Authenticated and admin:** Render the admin dashboard.

### 4. Admin Dashboard (`/admin`)

- Displays “Welcome back, {name}” (from `/auth/me`).
- Shows current user info and a logout button.
- Placeholder cards for future admin features (users, database, settings).

## Models Administration

Coworker maintains a centralized catalog of AI models in Pilot.

### Admin UI (`/admin/models`)

Admins can:

- Create and edit models (title + gateway value).
- Activate/deactivate models (inactive models are hidden from the app).
- Set the default model (required for chat requests).
- Delete models (blocked if it would remove the only default).

### Default Model Rules

- Only one model can be the default at a time.
- Setting a model as default automatically marks it active.
- Attempting to deactivate or delete the only default model returns a `409` response.

## Insider Codes Administration

Coworker uses insider access codes to manage sign-ups for the insider preview. Admins can create, edit, activate/deactivate, and delete codes from the admin dashboard.

### Admin UI (`/admin/insider-codes`)

Admins can:

- Create insider codes (lowercase alphanumeric, 6-25 characters) with a title and optional notes.
- Activate/deactivate codes (inactive codes cannot be used for sign-up).
- View activation counts (how many users signed up with each code).
- Search codes by code value, title, or notes.
- Delete codes (cascade deletes associated activations).

### Admin API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/insider-codes` | Admin | List all insider codes with activation counts. |
| `POST` | `/api/v1/admin/insider-codes` | Admin | Create a new insider code. |
| `GET` | `/api/v1/admin/insider-codes/:id` | Admin | Get a single insider code with activation count. |
| `PATCH` | `/api/v1/admin/insider-codes/:id` | Admin | Update an insider code. |
| `DELETE` | `/api/v1/admin/insider-codes/:id` | Admin | Delete an insider code (cascades to activations). |

### Public Insider Endpoints

These endpoints do not require authentication and are used by the public sign-up page at `/insider-sign-up`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/insider/validate-code` | None | Validate that an insider code exists and is active. |
| `POST` | `/api/v1/insider/sign-up` | None | Create a new user account via insider preview sign-up. |

## Feedback Administration

The admin dashboard includes a Feedback page at `/admin/feedback` where admins can review user-submitted feedback and view screenshots when provided.

### Admin UI (`/admin/feedback`)

Admins can:

- View recent feedback submissions
- See feedback type, user identity (or anonymous), and contact permission
- Open a detail view with the full message
- Preview screenshots when provided

### Admin API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/feedback` | Admin | List feedback submissions |
| `GET` | `/api/v1/admin/feedback/:id/screenshot` | Admin | Fetch a feedback screenshot |

### Database Models

- **InsiderCode** — Stores access codes with title, notes, and active status.
- **InsiderActivation** — Links a user to the insider code they used to sign up (one-to-many from InsiderCode, one-to-many from User).

### Shared Services

- **Types:** `InsiderCode`, `InsiderCodeWithCount`, `InsiderActivation`, `CreateInsiderCodeInput`, `UpdateInsiderCodeInput`, `InsiderSignUpInput` in `shared-services/src/types/domain/insider-code.ts`.
- **Schemas:** `createInsiderCodeSchema`, `updateInsiderCodeSchema`, `validateInsiderCodeSchema`, `insiderSignUpSchema` in `shared-services/src/schemas/insider-code.ts`.

## File Structure

```
coworker-pilot/
├── app/
│   ├── login/
│   │   └── page.tsx              # Login page (email + code)
│   ├── insider-sign-up/
│   │   ├── page.tsx               # Server component (fetches download URL)
│   │   └── insider-sign-up-flow.tsx # Client component (multi-step form)
│   ├── admin/
│   │   ├── layout.tsx             # Protected layout (auth + admin check)
│   │   ├── page.tsx               # Admin dashboard
│   │   └── insider-codes/
│   │       ├── page.tsx           # Insider codes management page
│   │       └── components/
│   │           ├── InsiderCodeTable.tsx
│   │           ├── InsiderCodeFormDialog.tsx
│   │           └── DeleteInsiderCodeDialog.tsx
│   └── api/v1/
│       ├── auth/
│       │   └── admin-check/
│       │       └── route.ts       # GET admin-check (withAuth)
│       ├── admin/insider-codes/
│       │   ├── route.ts           # GET + POST (withAdmin)
│       │   └── [id]/route.ts      # GET + PATCH + DELETE (withAdmin)
│       └── insider/
│           ├── validate-code/
│           │   └── route.ts       # POST validate code (public)
│           └── sign-up/
│               └── route.ts       # POST sign up (public)
├── lib/
│   ├── admin-middleware.ts        # withAdmin(), getAdminEmails(), isAdminEmail()
│   ├── auth-context.tsx           # AuthProvider, useAuth (isAdmin)
│   └── sdk.ts                     # Browser SDK + token storage
└── components/
    └── auth/
        └── login-form.tsx         # Email/code form component
```

## API Reference

### Admin Check Endpoint

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/auth/admin-check` | Required (Bearer) | Returns `{ isAdmin: boolean }` based on `ADMIN_USERS`. |

**Response (success):**

```json
{
  "status": "success",
  "data": { "isAdmin": true }
}
```

Used by the web app to set `isAdmin` in auth context after login.

## Creating Admin-Only API Endpoints

Admin-only endpoints must use `withAdmin()` so that only users in `ADMIN_USERS` can call them.

### 1. Use withAdmin() Middleware

`withAdmin()` wraps `withAuth()` and adds a check that the authenticated user’s email is in `ADMIN_USERS`. If not, the handler returns `403 Forbidden`.

```typescript
// coworker-pilot/app/api/v1/admin/some-action/route.ts
import { NextResponse } from "next/server";
import { withAdmin, AuthenticatedRequest } from "@/lib/admin-middleware";
import { successResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function handlePost(request: AuthenticatedRequest): Promise<NextResponse> {
  // request.auth is guaranteed: userId, email
  // User is guaranteed to be in ADMIN_USERS
  const { userId, email } = request.auth;

  // Admin-only logic here
  return successResponse({ done: true });
}

export const POST = withAdmin(handlePost);
```

### 2. Helper Functions

From `lib/admin-middleware.ts`:

| Function | Description |
|----------|-------------|
| `getAdminEmails()` | Returns the list of admin emails from `ADMIN_USERS`. |
| `isAdminEmail(email)` | Returns whether the given email is in the admin list. |
| `withAdmin(handler)` | Wraps a route handler to require auth + admin; returns 403 if not admin. |

Use `isAdminEmail()` when you need to check admin status inside a handler that is already protected by `withAuth()` (e.g. conditional behavior within a non-admin endpoint).

## Security Model

### Authorization vs Authentication

- **Authentication** (who you are): Handled by JWT and `withAuth()`; same as for any protected endpoint.
- **Authorization** (what you can do): For admin, handled by `withAdmin()` and `ADMIN_USERS`.

### Enforcement

- **Server:** All admin-sensitive operations must be behind routes that use `withAdmin()`. The client cannot grant itself admin access.
- **Client:** The `isAdmin` flag from `/auth/admin-check` is used only for UX (redirects, showing “Access Denied”, showing/hiding admin UI). It is not used for access control.
- **ADMIN_USERS:** Kept in server environment only; never sent to the client.

### Bootstrap First Admin User

When the database is empty, use the machine-key protected `/api/v1/promote` endpoint to create the initial admin user record. This endpoint:

- Reads the email from `PROMOTE_USER`
- Requires the `X-Machine-Key` header to match `MACHINE_KEY`
- Creates the user if missing (idempotent)
- Returns `{ created, user }` so automation can detect if it was a new insert

**Important:** Admin privileges still come from `ADMIN_USERS`. Ensure the same email listed in `PROMOTE_USER` is also present in `ADMIN_USERS` so the user can access `/admin` and admin-protected endpoints.

### Adding and Removing Admins

1. **Add admin:** Add the user’s email to `ADMIN_USERS` in `coworker-pilot/.env`, then restart the app (or rely on your deployment’s env reload).
2. **Remove admin:** Remove the email from `ADMIN_USERS` and restart. The user remains a valid authenticated user but will receive 403 on admin endpoints and “Access Denied” on `/admin`.

## Related Documentation

- [Authentication](./authentication.md) — Auth flow, JWT, tokens, and protected endpoints.
- [API Project](./api_project.md) — API structure, env vars, and adding endpoints.
