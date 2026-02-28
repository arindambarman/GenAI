/**
 * Migration runner — executes all SQL migration files against Supabase
 * Uses the Supabase REST API with service role key.
 * Usage: npx tsx scripts/run-migrations.ts
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extract project ref from URL
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  // Use Supabase's pg-meta SQL execution endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({}),
  });

  // This likely won't work for DDL, so try the pg-meta endpoint
  const pgMetaRes = await fetch(
    `${SUPABASE_URL}/pg/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-connection-encrypted": SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (pgMetaRes.ok) {
    return { success: true };
  }

  // Try the management API SQL endpoint
  const sqlRes = await fetch(
    `https://${projectRef}.supabase.co/rest/v1/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (sqlRes.ok) {
    return { success: true };
  }

  return {
    success: false,
    error: `Status ${pgMetaRes.status}: ${await pgMetaRes.text().catch(() => "unknown")}`,
  };
}

async function runMigrations() {
  const migrationsDir = join(__dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files`);
  console.log(`Target: ${SUPABASE_URL} (ref: ${projectRef})\n`);

  // Combine all migrations into one SQL block
  const allSql = files
    .map((file) => {
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      return `-- === ${file} ===\n${sql}`;
    })
    .join("\n\n");

  console.log("Running all migrations as a single batch...\n");
  const result = await executeSql(allSql);

  if (result.success) {
    console.log("✓ All migrations applied successfully!");
  } else {
    console.log(`✗ Migration failed: ${result.error}`);
    console.log("\n--- Combined SQL (copy to Supabase SQL Editor) ---\n");
    console.log(allSql);
    console.log("\n--- End SQL ---");
    console.log("\nPaste the SQL above into your Supabase SQL Editor and click Run.");
  }
}

runMigrations().catch(console.error);
