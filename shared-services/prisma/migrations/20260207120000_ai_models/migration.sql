CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_models_value_key" ON "ai_models"("value");
CREATE INDEX "ai_models_is_active_idx" ON "ai_models"("is_active");
CREATE INDEX "ai_models_is_default_idx" ON "ai_models"("is_default");

CREATE UNIQUE INDEX "ai_models_single_default" ON "ai_models"("is_default") WHERE ("is_default" = true);
