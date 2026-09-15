/**
 * PostgreSQL schema is managed ahead of deployment by Prisma migrations/db push.
 * Runtime requests only verify that the database can be reached; they must not
 * attempt SQLite/libSQL DDL on Vercel cold starts.
 */
import { prisma } from "./db";

let connectionPromise: Promise<void> | undefined;

export function ensureDbSchema(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = prisma.$connect().catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  return connectionPromise;
}

export function ensureSecuritySchema(): Promise<void> {
  return ensureDbSchema();
}
