import { beforeAll, afterAll } from "vitest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/coworker_test?schema=public";
  process.env.LOG_LEVEL = "error";
});

afterAll(() => {
  // Cleanup if needed
});
