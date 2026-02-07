INSERT INTO "ai_models" ("id", "title", "value", "is_active", "is_default", "created_at", "updated_at") VALUES
  ('cajvtygbw0000a0t0s8e9w2ut', 'Claude Sonnet 4.5', 'anthropic/claude-sonnet-4.5', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cajvtygbw0001a0t0s8e9w2uu', 'Gemini 3 Flash', 'google/gemini-3-flash', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cajvtygbw0002a0t0s8e9w2uv', 'GPT 5.2', 'openai/gpt-5.2', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cajvtygbw0003a0t0s8e9w2uw', 'Claude Opus 4.6', 'anthropic/claude-opus-4.6', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cajvtygbw0004a0t0s8e9w2ux', 'Gemini 2.5 Pro', 'google/gemini-2.5-pro', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cajvtygbw0005a0t0s8e9w2uy', 'Grok Code Fast 1', 'xai/grok-code-fast-1', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("value") DO UPDATE SET
  "title" = EXCLUDED."title",
  "is_active" = EXCLUDED."is_active",
  "is_default" = EXCLUDED."is_default",
  "updated_at" = CURRENT_TIMESTAMP;

UPDATE "ai_models"
SET "is_default" = false
WHERE "value" <> 'openai/gpt-5.2';
