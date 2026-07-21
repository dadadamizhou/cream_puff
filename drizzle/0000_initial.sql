CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "nickname" text NOT NULL,
  "weekly_goal" integer DEFAULT 60 NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" ("token_hash");
--> statement-breakpoint
CREATE TABLE "words" (
  "id" serial PRIMARY KEY NOT NULL,
  "spelling" text NOT NULL UNIQUE,
  "phonetic" text DEFAULT '' NOT NULL,
  "definition" text NOT NULL,
  "example" text DEFAULT '' NOT NULL,
  "example_translation" text DEFAULT '' NOT NULL,
  "memory_tip" text DEFAULT '' NOT NULL,
  "position" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "words_position_idx" ON "words" ("position");
--> statement-breakpoint
CREATE TABLE "user_words" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "word_id" integer NOT NULL REFERENCES "words"("id") ON DELETE cascade,
  "stage" integer DEFAULT 0 NOT NULL,
  "review_count" integer DEFAULT 0 NOT NULL,
  "lapse_count" integer DEFAULT 0 NOT NULL,
  "next_review_at" timestamp with time zone NOT NULL,
  "first_learned_at" timestamp with time zone NOT NULL,
  "last_reviewed_at" timestamp with time zone,
  "assigned_week" text NOT NULL,
  "mastered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_words_user_word_idx" ON "user_words" ("user_id", "word_id");
--> statement-breakpoint
CREATE INDEX "user_words_due_idx" ON "user_words" ("user_id", "next_review_at");
--> statement-breakpoint
CREATE TABLE "review_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "word_id" integer NOT NULL REFERENCES "words"("id") ON DELETE cascade,
  "rating" text NOT NULL,
  "previous_stage" integer NOT NULL,
  "next_stage" integer NOT NULL,
  "pronunciation_matched" boolean,
  "duration_ms" integer DEFAULT 0 NOT NULL,
  "reviewed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "review_logs_user_date_idx" ON "review_logs" ("user_id", "reviewed_at");
--> statement-breakpoint
CREATE TABLE "daily_checkins" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "date" date NOT NULL,
  "completed_count" integer DEFAULT 0 NOT NULL,
  "target_count" integer DEFAULT 0 NOT NULL,
  "fully_completed" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_checkins_user_date_idx" ON "daily_checkins" ("user_id", "date");
