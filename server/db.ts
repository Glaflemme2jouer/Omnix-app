import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let writeChain: Promise<void> = Promise.resolve();

export function isPostgresEnabled(): boolean {
  return Boolean(pool);
}

export async function initPostgres(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    return false;
  }

  const disableSsl =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1') ||
    connectionString.includes('sslmode=disable');

  pool = new Pool({
    connectionString,
    ssl: disableSsl ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS omnix_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  return true;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!pool) return null;
  const res = await pool.query<{ value: T }>('SELECT value FROM omnix_kv WHERE key = $1', [key]);
  if (res.rows.length === 0) return null;
  return res.rows[0].value;
}

export function kvSet<T>(key: string, value: T): Promise<void> {
  if (!pool) return Promise.resolve();
  const activePool = pool;
  const serialized = JSON.stringify(value);
  const nextWrite = writeChain.then(async () => {
    await activePool.query(
      `INSERT INTO omnix_kv (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
      [key, serialized]
    );
  });
  writeChain = nextWrite.catch(() => {});
  return nextWrite;
}
