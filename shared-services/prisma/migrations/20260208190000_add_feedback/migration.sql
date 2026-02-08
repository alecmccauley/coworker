-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('bug', 'improvement', 'like');

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "FeedbackType" NOT NULL,
    "message" TEXT NOT NULL,
    "can_contact" BOOLEAN NOT NULL DEFAULT true,
    "include_screenshot" BOOLEAN NOT NULL DEFAULT false,
    "screenshot_bytes" BYTEA,
    "screenshot_mime" TEXT,
    "screenshot_width" INTEGER,
    "screenshot_height" INTEGER,
    "screenshot_size" INTEGER,
    "screenshot_captured_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");

-- CreateIndex
CREATE INDEX "feedback_type_idx" ON "feedback"("type");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
