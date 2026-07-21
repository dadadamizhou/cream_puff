import { boolean, date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nickname: text("nickname").notNull(),
  weeklyGoal: integer("weekly_goal").notNull().default(60),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [uniqueIndex("sessions_token_hash_idx").on(table.tokenHash)],
);

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  spelling: text("spelling").notNull().unique(),
  phonetic: text("phonetic").notNull().default(""),
  definition: text("definition").notNull(),
  example: text("example").notNull().default(""),
  exampleTranslation: text("example_translation").notNull().default(""),
  memoryTip: text("memory_tip").notNull().default(""),
  position: integer("position").notNull(),
}, (table) => [index("words_position_idx").on(table.position)]);

export const userWords = pgTable(
  "user_words",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    stage: integer("stage").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    lapseCount: integer("lapse_count").notNull().default(0),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true, mode: "date" }).notNull(),
    firstLearnedAt: timestamp("first_learned_at", { withTimezone: true, mode: "date" }).notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true, mode: "date" }),
    assignedWeek: text("assigned_week").notNull(),
    masteredAt: timestamp("mastered_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("user_words_user_word_idx").on(table.userId, table.wordId),
    index("user_words_due_idx").on(table.userId, table.nextReviewAt),
  ],
);

export const reviewLogs = pgTable("review_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  wordId: integer("word_id")
    .notNull()
    .references(() => words.id, { onDelete: "cascade" }),
  rating: text("rating", { enum: ["again", "hard", "good", "easy"] }).notNull(),
  previousStage: integer("previous_stage").notNull(),
  nextStage: integer("next_stage").notNull(),
  pronunciationMatched: boolean("pronunciation_matched"),
  durationMs: integer("duration_ms").notNull().default(0),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }).notNull(),
}, (table) => [index("review_logs_user_date_idx").on(table.userId, table.reviewedAt)]);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    completedCount: integer("completed_count").notNull().default(0),
    targetCount: integer("target_count").notNull().default(0),
    fullyCompleted: boolean("fully_completed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [uniqueIndex("daily_checkins_user_date_idx").on(table.userId, table.date)],
);

export type User = typeof users.$inferSelect;
export type Word = typeof words.$inferSelect;
export type UserWord = typeof userWords.$inferSelect;
