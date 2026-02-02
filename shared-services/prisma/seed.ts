import dotenv from "dotenv";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

const envPath = path.join(import.meta.dirname, "..", "..", "coworker-pilot", ".env");
dotenv.config({ path: envPath });

const { prisma } = (await import("@coworker/shared-services/db")) as {
  prisma: PrismaClient;
};

const users = [
  { email: "hello@coworker.ai", name: "Coworker" },
  { email: "welcome@coworker.ai", name: "Welcome" },
  { email: "team@coworker.ai", name: "Team" },
];

async function seedUsers(): Promise<void> {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: user,
      update: { name: user.name },
    });
  }
}

async function main(): Promise<void> {
  await seedUsers();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
