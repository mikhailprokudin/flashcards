import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

const env = envSchema.parse(process.env);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

async function main() {
  const connection = await mysql.createConnection(env.DATABASE_URL);
  const db = drizzle(connection);

  await migrate(db, { migrationsFolder });

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
