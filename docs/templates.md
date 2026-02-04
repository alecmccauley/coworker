# Co-worker Templates

This document describes the co-worker template system, including the cloud control plane and usage in the desktop app.

**Related docs:** [API project](api_project.md), [App project](app_project.md), [Workspaces](workspaces.md).

---

## Table of contents

1. [Overview](#1-overview)
2. [Cloud template system](#2-cloud-template-system)
3. [Loading templates in the app](#3-loading-templates-in-the-app)
4. [Using templates](#4-using-templates)
5. [Admin management](#5-admin-management)
6. [API reference](#6-api-reference)

---

## 1. Overview

Co-worker templates are centrally-managed role definitions that give users a starting point when creating co-workers. Templates define:

- **Name & Description:** Human-readable identifier and explanation
- **Role Prompt:** The core behavioral prompt that defines how the co-worker acts
- **Default Behaviors:** Tone, formatting, guardrails
- **Tools Policy:** Which tool categories are allowed/disallowed
- **Model Routing Policy:** (Internal) Preferred models and token limits

Templates are stored in the cloud (PostgreSQL via Prisma). The desktop app fetches them from the API when needed (e.g. when the create co-worker dialog opens).

### Architecture

```
┌─────────────────────────────┐
│   Cloud Control Plane       │
│   (coworker-pilot)          │
├─────────────────────────────┤
│ - CoworkerTemplate model    │
│ - Admin CRUD endpoints      │
│ - Public list/get endpoints │
└─────────────┬───────────────┘
              │
              │ SDK (templates.list)
              │
┌─────────────▼───────────────┐
│   Desktop App               │
│   (coworker-app)            │
├─────────────────────────────┤
│ - IPC: templates.list       │
│ - Fetched when dialog opens │
└─────────────────────────────┘
```

---

## 2. Cloud template system

### Prisma model

Located in `shared-services/prisma/schema.prisma`:

```prisma
model CoworkerTemplate {
  id                     String   @id @default(cuid())
  slug                   String   @unique
  name                   String
  description            String?
  rolePrompt             String   @map("role_prompt") @db.Text
  defaultBehaviorsJson   String?  @map("default_behaviors_json") @db.Text
  defaultToolsPolicyJson String?  @map("default_tools_policy_json") @db.Text
  modelRoutingPolicyJson String?  @map("model_routing_policy_json") @db.Text
  version                Int      @default(1)
  isPublished            Boolean  @default(false) @map("is_published")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  @@map("coworker_templates")
}
```

### Zod schemas

Located in `shared-services/src/schemas/template.ts`:

- `createCoworkerTemplateSchema` - Input validation for creating templates
- `updateCoworkerTemplateSchema` - Input validation for updating templates
- `templateIdParamSchema` - ID parameter validation
- `listTemplatesQuerySchema` - Query parameter validation

### SDK methods

```typescript
sdk.templates.list()           // Get published templates
sdk.templates.getById(id)      // Get single template
sdk.templates.adminList()      // (Admin) All templates
sdk.templates.create(data)     // (Admin) Create template
sdk.templates.update(id, data) // (Admin) Update template
sdk.templates.delete(id)       // (Admin) Delete template
```

---

## 3. Loading templates in the app

The desktop app does not cache templates locally. Templates are fetched from the API whenever they are needed:

- **Create co-worker dialog:** When the user opens the "Create a Co-worker" dialog, the app calls `window.api.templates.list()`, which invokes the main process and then the SDK’s `GET /api/v1/templates`. The returned list is shown in the dialog.

No disk cache or background sync is used; each open of the dialog triggers a fresh API request from the main process.

### IPC

```typescript
// From preload/index.ts
window.api.templates.list()   // Get published templates from API
```

---

## 4. Using templates

When creating a co-worker, the user can:

1. **Select a template:** Choose from available templates
2. **Customize name:** Override the default name
3. **Add responsibility:** Describe what this co-worker does

The template's `rolePrompt` is stored in the coworker's `rolePrompt` field, and `defaultBehaviorsJson` is stored in `defaultsJson`. The `templateId` and `templateVersion` are recorded for reference.

### Example: Creating from template

```typescript
// In renderer
const template = selectedTemplate
const coworker = await window.api.coworker.create({
  name: customName || template.name,
  description: responsibility,
  rolePrompt: template.rolePrompt,
  defaultsJson: JSON.stringify(template.defaultBehaviors),
  templateId: template.id,
  templateVersion: template.version
})
```

---

## 5. Admin management

Templates are managed through the admin UI at `/admin/templates`.

### Features

- **List templates:** View all templates (published and draft)
- **Create template:** Add new template with name, slug, description, role prompt
- **Edit template:** Update any field, version auto-increments
- **Publish/Unpublish:** Toggle visibility to users
- **Delete template:** Remove template permanently

### Access control

Template admin endpoints require:
1. Valid JWT token
2. User email in `ADMIN_USERS` environment variable

---

## 6. API reference

### Public endpoints (no auth required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/templates` | GET | List published templates |
| `/api/v1/templates/:id` | GET | Get single published template |

### Admin endpoints (auth + admin required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/admin/templates` | GET | List all templates |
| `/api/v1/admin/templates` | POST | Create template |
| `/api/v1/admin/templates/:id` | GET | Get any template |
| `/api/v1/admin/templates/:id` | PATCH | Update template |
| `/api/v1/admin/templates/:id` | DELETE | Delete template |

### Response shapes

**CoworkerTemplatePublic:**
```json
{
  "id": "cuid...",
  "slug": "marketing",
  "name": "Marketing",
  "description": "Content and campaign specialist",
  "rolePrompt": "You are a marketing specialist...",
  "defaultBehaviors": { "tone": "professional" },
  "defaultToolsPolicy": { "allowedCategories": ["content"] },
  "version": 3,
  "createdAt": "2026-01-15T...",
  "updatedAt": "2026-02-01T..."
}
```

---

## File reference

| Concern | File(s) |
|---------|---------|
| Prisma model | `shared-services/prisma/schema.prisma` |
| Zod schemas | `shared-services/src/schemas/template.ts` |
| Types | `shared-services/src/types/domain/template.ts` |
| SDK endpoint | `shared-services/src/sdk/endpoints/templates.ts` |
| Public API routes | `coworker-pilot/app/api/v1/templates/` |
| Admin API routes | `coworker-pilot/app/api/v1/admin/templates/` |
| Admin UI | `coworker-pilot/app/admin/templates/` |
| Template IPC | `coworker-app/src/main/templates/ipc-handlers.ts` |
| Preload API | `coworker-app/src/preload/index.ts` |
