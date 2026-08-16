import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  client ??= postgres(process.env.DATABASE_URL, { max: 5, prepare: false });
  return drizzle(client, { schema });
}
export async function checkDatabase() {
  if (!process.env.DATABASE_URL)
    return { ok: false, reason: "not_configured" as const };
  try {
    await getDb().execute(schema.schemaHealth);
    return { ok: true as const };
  } catch {
    return { ok: false, reason: "unavailable" as const };
  }
}
export async function closeDatabase() {
  if (!client) return;
  await client.end({ timeout: 5 });
  client = undefined;
}
