import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Drizzle.");
  }

  if (!cachedDb) {
    const client = postgres(connectionString, {
      prepare: false,
    });

    cachedDb = drizzle({ client, schema });
  }

  return cachedDb;
}
