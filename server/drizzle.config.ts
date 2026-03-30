import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ??
  "mysql://root:root@127.0.0.1:3306/flashcards";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url,
  },
});
