ALTER TABLE "users" RENAME COLUMN "weekly_goal" TO "daily_new_words";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "daily_new_words" SET DEFAULT 10;
--> statement-breakpoint
UPDATE "users"
SET "daily_new_words" = CASE
  WHEN "daily_new_words" = 30 THEN 5
  WHEN "daily_new_words" = 60 THEN 10
  WHEN "daily_new_words" = 90 THEN 15
  ELSE GREATEST(5, LEAST(50, ROUND("daily_new_words" / 7.0)::integer))
END;
