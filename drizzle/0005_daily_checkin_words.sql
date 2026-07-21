CREATE TABLE "daily_checkin_words" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "date" date NOT NULL,
  "word_id" integer NOT NULL REFERENCES "words"("id") ON DELETE cascade,
  "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_checkin_words_user_date_word_idx" ON "daily_checkin_words" ("user_id", "date", "word_id");
--> statement-breakpoint
CREATE INDEX "daily_checkin_words_user_date_idx" ON "daily_checkin_words" ("user_id", "date");
--> statement-breakpoint
INSERT INTO "daily_checkin_words" ("user_id", "date", "word_id", "created_at")
SELECT
  "user_id",
  ("reviewed_at" AT TIME ZONE 'Asia/Shanghai')::date,
  "word_id",
  MIN("reviewed_at")
FROM "review_logs"
GROUP BY "user_id", ("reviewed_at" AT TIME ZONE 'Asia/Shanghai')::date, "word_id"
ON CONFLICT ("user_id", "date", "word_id") DO NOTHING;
