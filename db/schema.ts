import { boolean, date, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { WordBookId } from "@/lib/word-books";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nickname: text("nickname").notNull(),
  weeklyGoal: integer("weekly_goal").notNull().default(60),
  enabledWordBooks: jsonb("enabled_word_books").$type<WordBookId[]>().notNull().default(["grade1", "grade2", "grade3", "cet4"]),
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
  wordBook: text("word_book", { enum: ["grade1", "grade2", "grade3", "cet4"] }).notNull().default("grade1"),
  position: integer("position").notNull(),
}, (table) => [
  index("words_position_idx").on(table.position),
  index("words_book_position_idx").on(table.wordBook, table.position),
]);

export const wordBookEntries = pgTable(
  "word_book_entries",
  {
    id: serial("id").primaryKey(),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    wordBook: text("word_book", { enum: ["grade1", "grade2", "grade3", "cet4"] }).notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("word_book_entries_word_book_idx").on(table.wordId, table.wordBook),
    index("word_book_entries_book_position_idx").on(table.wordBook, table.position),
  ],
);

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

export const dailyCheckinWords = pgTable(
  "daily_checkin_words",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("daily_checkin_words_user_date_word_idx").on(table.userId, table.date, table.wordId),
    index("daily_checkin_words_user_date_idx").on(table.userId, table.date),
  ],
);

export const dailyPracticeSessions = pgTable(
  "daily_practice_sessions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    status: text("status", { enum: ["in_progress", "completed"] }).notNull().default("in_progress"),
    questionCount: integer("question_count").notNull().default(0),
    answeredCount: integer("answered_count").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("daily_practice_sessions_user_date_idx").on(table.userId, table.date),
    index("daily_practice_sessions_user_status_idx").on(table.userId, table.status),
  ],
);

export const practiceQuestions = pgTable(
  "practice_questions",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => dailyPracticeSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "meaning_to_word",
        "word_to_meaning",
        "listening_choice",
        "listening_dictation",
        "translation_dictation",
      ],
    }).notNull(),
    position: integer("position").notNull(),
    prompt: text("prompt").notNull(),
    audioText: text("audio_text"),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    correctAnswer: text("correct_answer").notNull(),
    selectedAnswer: text("selected_answer"),
    isCorrect: boolean("is_correct"),
    answeredAt: timestamp("answered_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("practice_questions_session_position_idx").on(table.sessionId, table.position),
    index("practice_questions_user_session_idx").on(table.userId, table.sessionId),
  ],
);

export type User = typeof users.$inferSelect;
export type Word = typeof words.$inferSelect;
export type WordBookEntry = typeof wordBookEntries.$inferSelect;
export type UserWord = typeof userWords.$inferSelect;
export type DailyCheckinWord = typeof dailyCheckinWords.$inferSelect;
export type DailyPracticeSession = typeof dailyPracticeSessions.$inferSelect;
export type PracticeQuestion = typeof practiceQuestions.$inferSelect;
