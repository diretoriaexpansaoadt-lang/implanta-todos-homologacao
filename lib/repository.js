const fs = require("fs");
const path = require("path");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class JsonStateRepository {
  constructor(config) {
    this.file = path.join(config.dataDir, "app-state.json");
    this.state = null;
  }

  async initialize(defaultState) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    try {
      this.state = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      this.state = defaultState;
      await this.save(this.state);
    }
    return clone(this.state);
  }

  get() {
    return clone(this.state);
  }

  async save(state) {
    const temporary = `${this.file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(temporary, this.file);
    this.state = clone(state);
    return this.get();
  }

  async audit(entry) {
    const file = path.join(path.dirname(this.file), "audit-log.jsonl");
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
  }

  async close() {}
}

class PostgresStateRepository {
  constructor(config) {
    let Pool;
    try {
      ({ Pool } = require("pg"));
    } catch {
      throw new Error("DATABASE_URL foi configurada, mas o pacote 'pg' não está instalado. Execute npm install.");
    }
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.productionLike ? { rejectUnauthorized: false } : undefined,
    });
    this.state = null;
  }

  async initialize(defaultState) {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id SMALLINT PRIMARY KEY CHECK (id = 1),
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        actor_id TEXT,
        actor_email TEXT,
        action TEXT NOT NULL,
        detail JSONB NOT NULL DEFAULT '{}'::jsonb,
        ip TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const result = await this.pool.query("SELECT payload FROM app_state WHERE id = 1");
    if (result.rowCount) {
      this.state = result.rows[0].payload;
    } else {
      this.state = defaultState;
      await this.save(defaultState);
    }
    return clone(this.state);
  }

  get() {
    return clone(this.state);
  }

  async save(state) {
    await this.pool.query(
      `INSERT INTO app_state (id, payload, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [JSON.stringify(state)]
    );
    this.state = clone(state);
    return this.get();
  }

  async audit(entry) {
    await this.pool.query(
      "INSERT INTO audit_log (actor_id, actor_email, action, detail, ip) VALUES ($1, $2, $3, $4::jsonb, $5)",
      [entry.actorId || null, entry.actorEmail || null, entry.action, JSON.stringify(entry.detail || {}), entry.ip || null]
    );
  }

  async close() {
    await this.pool.end();
  }
}

function createRepository(config) {
  return config.databaseUrl ? new PostgresStateRepository(config) : new JsonStateRepository(config);
}

module.exports = { createRepository };
