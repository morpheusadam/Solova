import { execSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

/**
 * Creates the dedicated test database (if missing) and applies migrations.
 * Tests then run against TEST_DATABASE_URL — never the dev/prod database.
 */
export default async function globalSetup() {
  config();
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");

  const dbName = new URL(testUrl).pathname.slice(1);
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";

  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    const exists = await admin.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '${dbName.replace(/'/g, "''")}') AS exists`,
    );
    if (!exists[0]?.exists) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "inherit",
  });
}
