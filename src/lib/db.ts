import { neon } from "@neondatabase/serverless";

export interface Subscription {
  email: string;
  city: string;
  warning_type: string;
}

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Add a Postgres database (e.g. the Neon integration) in Vercel → Storage, and make sure the connection string is saved as DATABASE_URL."
    );
  }
  return neon(connectionString);
}

let schemaReady: Promise<void> | null = null;

/**
 * Creates the subscriptions table if it doesn't exist yet. Cached per
 * serverless instance so it only runs once per cold start, not per request.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        email TEXT PRIMARY KEY,
        city TEXT NOT NULL,
        warning_type TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.then(() => undefined);
  }
  return schemaReady;
}

/** Insert or update a user's subscription preferences — mirrors save_to_database(). */
export async function upsertSubscription(email: string, city: string, warningType: string): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  await sql`
    INSERT INTO subscriptions (email, city, warning_type, updated_at)
    VALUES (${email}, ${city}, ${warningType}, now())
    ON CONFLICT (email)
    DO UPDATE SET city = EXCLUDED.city, warning_type = EXCLUDED.warning_type, updated_at = now()
  `;
}

/** Fetch every subscriber — used by the daily cron job. */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = await sql`SELECT email, city, warning_type FROM subscriptions`;
  return rows as Subscription[];
}
