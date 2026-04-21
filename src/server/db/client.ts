import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as typeof globalThis & {
  pool?: Pool;
  prisma?: PrismaClient;
};

function getConnectionString() {
  return process.env.DATABASE_URL?.trim() || null;
}

export function hasDatabaseUrl() {
  return Boolean(getConnectionString());
}

function getPrismaClient() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
    });

  const adapter = new PrismaPg(pool);
  const client =
    process.env.NODE_ENV === "development"
      ? new PrismaClient({
          adapter,
          log: ["warn", "error"],
        })
      : globalForPrisma.prisma ??
        new PrismaClient({
          adapter,
          log: ["error"],
        });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
