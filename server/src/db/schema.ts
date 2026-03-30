import {
  bigint,
  datetime,
  index,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});

export const decks = mysqlTable("decks", {
  id: bigint("id", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 512 }).notNull(),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});

export const cards = mysqlTable("cards", {
  id: bigint("id", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  deckId: bigint("deck_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  hanzi: varchar("hanzi", { length: 64 }).notNull(),
  pinyin: varchar("pinyin", { length: 255 }).notNull(),
  meaning: varchar("meaning", { length: 1024 }).notNull(),
  example: varchar("example", { length: 2048 }).notNull(),
  notes: text("notes"),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});

export const cardProgress = mysqlTable(
  "card_progress",
  {
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: bigint("card_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["not_started", "learning", "learned"])
      .notNull()
      .default("not_started"),
    step: tinyint("step", { unsigned: true }).notNull().default(0),
    firstShownAt: datetime("first_shown_at", { mode: "date", fsp: 3 }),
    nextDueAt: datetime("next_due_at", { mode: "date", fsp: 3 }),
    lastReviewAt: datetime("last_review_at", { mode: "date", fsp: 3 }),
    lastResult: mysqlEnum("last_result", ["know", "dont_know"]),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.cardId] }),
    index("card_progress_user_next_due_idx").on(table.userId, table.nextDueAt),
  ],
);
