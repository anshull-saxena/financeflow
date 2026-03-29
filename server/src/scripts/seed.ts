import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2';

type UserRow = RowDataPacket & { id: string; email: string };
type CountRow = RowDataPacket & { cnt: number };

if (process.env.FINANCEFLOW_ALLOW_SEED !== '1') {
  console.log('Seeding is disabled by default.');
  console.log('Set FINANCEFLOW_ALLOW_SEED=1 to run db:seed.');
  process.exit(0);
}

async function ensureDemoUser(): Promise<{ id: string; email: string }> {
  const demoEmail = 'demo@financeflow.local';
  const [existing] = await pool.query<UserRow[]>('SELECT id, email FROM users WHERE email = ?', [demoEmail]);
  if (existing.length > 0) return { id: String(existing[0]!.id), email: String(existing[0]!.email) };

  const id = randomUUID();
  await pool.execute('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [id, 'Demo User', demoEmail]);
  await pool.execute('INSERT INTO user_settings (user_id, currency, monthly_goal, email_notif, dark_mode, two_factor) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    'INR',
    10000,
    false,
    true,
    false,
  ]);
  return { id, email: demoEmail };
}

async function seedTransactions(userId: string): Promise<void> {
  const [rows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS cnt FROM transactions WHERE user_id = ?', [userId]);
  if ((rows[0]?.cnt ?? 0) > 0) return;

  const seed = [
    { type: 'expense', description: 'Apple Store', category: 'Technology', amount: 1299.0, occurredAt: '2023-10-24T14:45:00.000Z' },
    { type: 'income', description: 'Monthly Salary', category: 'Salary', amount: 12450.0, occurredAt: '2023-10-01T09:00:00.000Z' },
    { type: 'expense', description: 'Lumière Dining', category: 'Food', amount: 240.5, occurredAt: '2023-09-30T20:15:00.000Z' },
    { type: 'expense', description: 'Skyline Airways', category: 'Transport', amount: 850.0, occurredAt: '2023-09-28T11:30:00.000Z' },
  ] as const;

  for (const t of seed) {
    await pool.execute(
      'INSERT INTO transactions (user_id, type, description, category, amount, currency, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, t.type, t.description, t.category, t.amount, 'INR', new Date(t.occurredAt)],
    );
  }
}

async function seedGoals(userId: string): Promise<void> {
  const [rows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS cnt FROM goals WHERE user_id = ?', [userId]);
  if ((rows[0]?.cnt ?? 0) > 0) return;

  const seed = [
    { name: 'New Porsche 911', target: 160000.0, saved: 104000.0 },
    { name: 'Tokyo Trip', target: 12000.0, saved: 11040.0 },
  ] as const;

  for (const g of seed) {
    await pool.execute(
      'INSERT INTO goals (user_id, name, target_amount, saved_amount, currency) VALUES (?, ?, ?, ?, ?)',
      [userId, g.name, g.target, g.saved, 'INR'],
    );
  }
}

async function main(): Promise<void> {
  const user = await ensureDemoUser();
  await seedTransactions(user.id);
  await seedGoals(user.id);
  console.log(`Seeded MySQL for ${user.email} (${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
