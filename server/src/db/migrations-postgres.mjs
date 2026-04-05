let schemaReady = false;
let schemaInitPromise = null;

export async function ensurePostgresSchema(pool) {
  if (schemaReady) return;
  if (schemaInitPromise) return schemaInitPromise;

  schemaInitPromise = (async () => {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(320) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          currency CHAR(3) NOT NULL DEFAULT 'INR',
          monthly_goal NUMERIC(12,2),
          email_notif BOOLEAN NOT NULL DEFAULT FALSE,
          dark_mode BOOLEAN NOT NULL DEFAULT TRUE,
          two_factor BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id BIGSERIAL PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(16) NOT NULL CHECK (type IN ('income', 'expense')),
          description VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          amount NUMERIC(12,2) NOT NULL,
          currency CHAR(3) NOT NULL DEFAULT 'INR',
          occurred_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS ix_transactions_user_time
        ON transactions (user_id, occurred_at DESC);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS goals (
          id BIGSERIAL PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          target_amount NUMERIC(12,2) NOT NULL,
          saved_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          currency CHAR(3) NOT NULL DEFAULT 'INR',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS ix_goals_user
        ON goals (user_id);
      `);

      schemaReady = true;
    } finally {
      client.release();
      schemaInitPromise = null;
    }
  })();

  return schemaInitPromise;
}
