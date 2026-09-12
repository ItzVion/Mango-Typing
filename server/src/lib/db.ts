import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";

const adapter = new PrismaLibSQL({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const prisma = new PrismaClient({ adapter });
