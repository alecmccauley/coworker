-- Seed: Friends and Family insider code
INSERT INTO "insider_codes" ("id", "code", "title", "notes", "is_active", "created_at", "updated_at")
VALUES (
  gen_random_uuid()::text,
  'friendsandfamily',
  'Friends and Family',
  'general insider code',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("code") DO NOTHING;
