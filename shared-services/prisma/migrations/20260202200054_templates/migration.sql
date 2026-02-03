-- CreateTable
CREATE TABLE "coworker_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "role_prompt" TEXT NOT NULL,
    "default_behaviors_json" TEXT,
    "default_tools_policy_json" TEXT,
    "model_routing_policy_json" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coworker_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coworker_templates_slug_key" ON "coworker_templates"("slug");

-- CreateIndex
CREATE INDEX "coworker_templates_is_published_idx" ON "coworker_templates"("is_published");

-- CreateIndex
CREATE INDEX "coworker_templates_slug_idx" ON "coworker_templates"("slug");
