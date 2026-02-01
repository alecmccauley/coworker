# Coworker API Documentation

## Overview

The Coworker API is a production-grade REST API built with modern TypeScript practices. This document outlines the project structure, frameworks, patterns, and best practices for developers working on this codebase.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥22.0.0 | Runtime |
| TypeScript | 5.x | Type safety |
| Express | 5.x | HTTP framework |
| Prisma | 7.x | Database ORM |
| PostgreSQL | 17 | Database |
| Zod | 4.x | Schema validation |
| Pino | 10.x | Logging |
| Vitest | 4.x | Testing |

## Project Structure

```
coworker-api/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── config/             # Application configuration
│   │   ├── db.ts           # Prisma client singleton
│   │   ├── env.ts          # Environment validation
│   │   ├── logger.ts       # Pino logger setup
│   │   └── index.ts        # Re-exports
│   ├── modules/            # Feature modules
│   │   └── users/          # User module
│   │       ├── user.schema.ts      # Re-exports shared Zod schemas
│   │       ├── user.service.ts     # Business logic
│   │       ├── user.controller.ts  # HTTP handlers
│   │       ├── user.routes.ts      # Route definitions
│   │       ├── user.test.ts        # Tests
│   │       └── index.ts            # Module exports
│   ├── shared/             # Shared utilities
│   │   ├── middlewares/    # Express middlewares
│   │   │   ├── errorHandler.ts
│   │   │   ├── validateRequest.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── AppError.ts # Custom error class
│   │   └── index.ts
│   ├── test/
│   │   └── setup.ts        # Test configuration
│   ├── app.ts              # Express app setup
│   └── server.ts           # Entry point
├── docker-compose.yml      # PostgreSQL container
├── prisma.config.ts        # Prisma 7 configuration
├── tsconfig.json           # TypeScript config
├── eslint.config.mjs       # ESLint flat config
└── vitest.config.ts        # Test config
```

## Architecture

### Feature-Sliced Design

The API follows a **feature-sliced architecture** where each feature/domain is contained in its own module under `src/modules/`. Each module is self-contained with its own:

- **Schema** - Zod validation schemas and TypeScript types
- **Service** - Business logic (database operations, domain rules)
- **Controller** - HTTP request/response handling
- **Routes** - Express route definitions
- **Tests** - Unit and integration tests

### Layer Separation

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Layer                           │
│  Routes → Middleware (validation) → Controller              │
├─────────────────────────────────────────────────────────────┤
│                      Business Layer                         │
│  Service (domain logic, database operations)                │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                            │
│  Prisma Client → PostgreSQL                                 │
└─────────────────────────────────────────────────────────────┘
```

## Validation & Type Safety

### Zod Schemas

All request validation is done using Zod schemas. For API contracts shared with
the app, schemas live in `@coworker/shared-services` and are re-exported from
`*.schema.ts` files in the API for convenience:

```typescript
// user.schema.ts
export {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from "@coworker/shared-services";

export type { CreateUserInput } from "@coworker/shared-services";
```

### Validation Middleware

Use the `validateRequest` middleware to validate incoming requests:

```typescript
// user.routes.ts
import { validateRequest } from "../../shared/index.js";
import { createUserSchema, userIdParamSchema } from "./user.schema.js";

userRouter.post(
  "/",
  validateRequest({ body: createUserSchema }),
  userController.create
);

userRouter.get(
  "/:id",
  validateRequest({ params: userIdParamSchema }),
  userController.getById
);
```

The middleware supports validating:
- `body` - Request body
- `query` - Query parameters
- `params` - URL parameters

### Type Safety Guidelines

1. **Prefer shared schemas** from `@coworker/shared-services` for public API contracts
2. **Always define Zod schemas first**, then infer TypeScript types from them
3. **Use `.js` extensions** in all imports (NodeNext module resolution)
4. **Enable strict TypeScript** - the project uses `strict: true` and `noUncheckedIndexedAccess: true`
5. **Use type imports** for types-only imports: `import type { ... } from "..."`

## Business Logic vs HTTP Handling

### Controllers (HTTP Layer)

Controllers handle HTTP concerns only:
- Extract data from requests
- Call service methods
- Format and send responses
- Set HTTP status codes

```typescript
// user.controller.ts
export const userController = {
  create: (async (req, res) => {
    // Extract validated data from request
    const user = await userService.create(req.body as CreateUserInput);

    // Send response with appropriate status
    res.status(StatusCodes.CREATED).json({
      status: "success",
      data: user
    });
  }) as RequestHandler,
};
```

**Controller Rules:**
- ✅ Extract data from `req.body`, `req.params`, `req.query`
- ✅ Call service methods
- ✅ Set HTTP status codes
- ✅ Format JSON responses
- ❌ Do NOT contain business logic
- ❌ Do NOT access the database directly
- ❌ Do NOT throw domain-specific errors (let services do that)

### Services (Business Layer)

Services contain all business logic:
- Database operations via Prisma
- Domain validation rules
- Business error handling

```typescript
// user.service.ts
export const userService = {
  async create(data: CreateUserInput) {
    // Business rule: check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Email already exists", StatusCodes.CONFLICT);
    }

    // Database operation
    return prisma.user.create({ data });
  },
};
```

**Service Rules:**
- ✅ Contain all business logic
- ✅ Perform database operations
- ✅ Throw `AppError` for business rule violations
- ✅ Accept typed inputs (from Zod schemas)
- ❌ Do NOT access `req` or `res` objects
- ❌ Do NOT set HTTP status codes directly
- ❌ Do NOT format HTTP responses

## Error Handling

### Custom Error Class

Use `AppError` for all application errors:

```typescript
import { AppError } from "../../shared/index.js";
import { StatusCodes } from "http-status-codes";

// In services
throw new AppError("User not found", StatusCodes.NOT_FOUND);
throw new AppError("Email already exists", StatusCodes.CONFLICT);
throw new AppError("Invalid operation", StatusCodes.BAD_REQUEST);
```

### Error Handler Middleware

The global error handler (`errorHandler.ts`) automatically handles:
- `ZodError` → 400 Bad Request with validation details
- `AppError` → Appropriate status code with message
- Unknown errors → 500 Internal Server Error (logged)

### Express 5 Async Error Handling

Express 5 natively handles async errors - no need for `express-async-errors`:

```typescript
// This works - errors are automatically caught
export const userController = {
  getById: (async (req, res) => {
    const user = await userService.findById(id); // Throws AppError if not found
    res.json({ status: "success", data: user });
  }) as RequestHandler,
};
```

## Environment Configuration

### Validation

Environment variables are validated at startup using Zod:

```typescript
// config/env.ts
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});
```

The application will fail to start if required environment variables are missing or invalid.

### Usage

```typescript
import { env } from "./config/index.js";

console.log(env.PORT);      // number (validated)
console.log(env.NODE_ENV);  // "development" | "production" | "test"
```

## Database

### Prisma 7 Configuration

Prisma 7 uses a separate config file (`prisma.config.ts`) for the database URL:

```typescript
// prisma.config.ts
export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  migrate: {
    url() {
      return process.env.DATABASE_URL ?? "postgresql://...";
    },
  },
});
```

### Prisma Client with Driver Adapter

The project uses Prisma's pg adapter for direct database connections:

```typescript
// config/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
```

### Schema Definition

```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")  // Table name in database
}
```

**Conventions:**
- Use `cuid()` for IDs (faster than UUID, shorter)
- Use `@map` for snake_case column names
- Use `@@map` for snake_case table names
- Always include `createdAt` and `updatedAt`

## Testing

### Test Structure

Tests are colocated with the code they test:

```
modules/users/
├── user.service.ts
├── user.controller.ts
└── user.test.ts      # Tests for this module
```

### Mocking Prisma

Mock the Prisma client for isolated tests:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../../config/index.js";

vi.mock("../../config/db.js", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("User API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all users", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([...]);
    // test implementation
  });
});
```

### Running Tests

```bash
pnpm --filter coworker-api test        # Run once
pnpm --filter coworker-api test:watch  # Watch mode
```

## API Response Format

All API responses follow a consistent format:

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
  "errors": { ... }
}
```

## Adding a New Module

1. **Create the module directory:**
   ```
   src/modules/posts/
   ```

2. **Create the schema file** (`post.schema.ts`):
   ```typescript
   import { z } from "zod";

   export const createPostSchema = z.object({
     title: z.string().min(1),
     content: z.string(),
   });

   export type CreatePostInput = z.infer<typeof createPostSchema>;
   ```

3. **Create the service** (`post.service.ts`):
   ```typescript
   import { prisma } from "../../config/index.js";
   import type { CreatePostInput } from "./post.schema.js";

   export const postService = {
     async create(data: CreatePostInput) {
       return prisma.post.create({ data });
     },
   };
   ```

4. **Create the controller** (`post.controller.ts`):
   ```typescript
   import type { RequestHandler } from "express";
   import { StatusCodes } from "http-status-codes";
   import { postService } from "./post.service.js";

   export const postController = {
     create: (async (req, res) => {
       const post = await postService.create(req.body);
       res.status(StatusCodes.CREATED).json({ status: "success", data: post });
     }) as RequestHandler,
   };
   ```

5. **Create the routes** (`post.routes.ts`):
   ```typescript
   import { Router, type IRouter } from "express";
   import { postController } from "./post.controller.js";
   import { validateRequest } from "../../shared/index.js";
   import { createPostSchema } from "./post.schema.js";

   export const postRouter: IRouter = Router();

   postRouter.post(
     "/",
     validateRequest({ body: createPostSchema }),
     postController.create
   );
   ```

6. **Create the index** (`index.ts`):
   ```typescript
   export { postRouter } from "./post.routes.js";
   export { postService } from "./post.service.js";
   export * from "./post.schema.js";
   ```

7. **Register in app.ts:**
   ```typescript
   import { postRouter } from "./modules/posts/index.js";

   app.use("/api/v1/posts", postRouter);
   ```

8. **Add tests** (`post.test.ts`)

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev:api` | Start development server with hot reload |
| `pnpm --filter coworker-api pm2:logs` | Follow API logs (pm2) |
| `pnpm --filter coworker-api pm2:restart` | Restart API process (pm2) |
| `pnpm --filter coworker-api pm2:stop` | Stop API process (pm2) |
| `pnpm --filter coworker-api pm2:delete` | Delete API process (pm2) |
| `pnpm --filter coworker-api build` | Compile TypeScript |
| `pnpm --filter coworker-api start` | Run compiled code |
| `pnpm --filter coworker-api lint` | Run ESLint |
| `pnpm --filter coworker-api test` | Run tests |
| `pnpm --filter coworker-api test:watch` | Run tests in watch mode |
| `pnpm --filter coworker-api db:generate` | Generate Prisma client |
| `pnpm --filter coworker-api db:migrate` | Run database migrations |

## Quick Start

```bash
# 1. Start PostgreSQL
cd coworker-api && docker compose up -d

# 2. Generate Prisma client
pnpm --filter coworker-api db:generate

# 3. Run migrations
pnpm --filter coworker-api db:migrate

# 4. Start development server
pnpm dev:api

# 5. Test the API
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```
