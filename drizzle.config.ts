import { defineConfig } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env")) {
  const envFile = readFileSync(".env", "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || line.trimStart().startsWith("#")) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.trim().replace(/^"(.*)"$/, "$1");
    process.env[key] = value;
  }
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? process.env.SUPABASE_POSTGRES_URL ?? "",
  },
});
