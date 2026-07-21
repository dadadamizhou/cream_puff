CREATE TABLE "daily_practice_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "date" date NOT NULL,
  "status" text DEFAULT 'in_progress' NOT NULL,
  "question_count" integer DEFAULT 0 NOT NULL,
  "answered_count" integer DEFAULT 0 NOT NULL,
  "correct_count" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "daily_practice_sessions_status_check" CHECK ("status" IN ('in_progress', 'completed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_practice_sessions_user_date_idx" ON "daily_practice_sessions" ("user_id", "date");
--> statement-breakpoint
CREATE INDEX "daily_practice_sessions_user_status_idx" ON "daily_practice_sessions" ("user_id", "status");
--> statement-breakpoint
CREATE TABLE "practice_questions" (
  "id" serial PRIMARY KEY NOT NULL,
  "session_id" integer NOT NULL REFERENCES "daily_practice_sessions"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "word_id" integer NOT NULL REFERENCES "words"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "position" integer NOT NULL,
  "prompt" text NOT NULL,
  "audio_text" text,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "correct_answer" text NOT NULL,
  "selected_answer" text,
  "is_correct" boolean,
  "answered_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "practice_questions_type_check" CHECK ("type" IN ('meaning_to_word', 'word_to_meaning', 'listening_choice', 'listening_dictation', 'translation_dictation'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "practice_questions_session_position_idx" ON "practice_questions" ("session_id", "position");
--> statement-breakpoint
CREATE INDEX "practice_questions_user_session_idx" ON "practice_questions" ("user_id", "session_id");
