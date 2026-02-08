-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "user_id" TEXT,
    "details" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "events_user_id_idx" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "events_created_at_idx" ON "events"("created_at");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
