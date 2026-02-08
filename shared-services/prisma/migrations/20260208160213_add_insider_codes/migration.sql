-- CreateTable
CREATE TABLE "insider_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insider_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insider_activations" (
    "id" TEXT NOT NULL,
    "insider_code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insider_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insider_codes_code_key" ON "insider_codes"("code");

-- CreateIndex
CREATE INDEX "insider_codes_code_idx" ON "insider_codes"("code");

-- CreateIndex
CREATE INDEX "insider_codes_is_active_idx" ON "insider_codes"("is_active");

-- CreateIndex
CREATE INDEX "insider_activations_insider_code_id_idx" ON "insider_activations"("insider_code_id");

-- CreateIndex
CREATE INDEX "insider_activations_user_id_idx" ON "insider_activations"("user_id");

-- AddForeignKey
ALTER TABLE "insider_activations" ADD CONSTRAINT "insider_activations_insider_code_id_fkey" FOREIGN KEY ("insider_code_id") REFERENCES "insider_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insider_activations" ADD CONSTRAINT "insider_activations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
