const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL antes da migração.");
  const source = process.argv[2] || path.join(__dirname, "..", "data", "app-state.json");
  const state = JSON.parse(fs.readFileSync(source, "utf8"));
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging"
      ? { rejectUnauthorized: false }
      : undefined,
  });
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, "..", "sql", "schema.sql"), "utf8"));
    await pool.query(
      `INSERT INTO app_state (id, payload, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [JSON.stringify(state)]
    );
    console.log(`Migração concluída: ${source}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
