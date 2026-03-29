import 'dotenv/config';

function requiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const dbConfig = {
  host: requiredEnv('MYSQL_HOST', '127.0.0.1'),
  port: Number(requiredEnv('MYSQL_PORT', '3306')),
  user: requiredEnv('MYSQL_USER', 'financeflow'),
  password: requiredEnv('MYSQL_PASSWORD', 'financeflow'),
  database: requiredEnv('MYSQL_DATABASE', 'financeflow'),
} as const;

