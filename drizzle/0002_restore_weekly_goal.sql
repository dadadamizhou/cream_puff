ALTER TABLE "users" RENAME COLUMN "daily_new_words" TO "weekly_goal";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "weekly_goal" SET DEFAULT 60;
--> statement-breakpoint
UPDATE "users"
SET "weekly_goal" = CASE
  WHEN "weekly_goal" = 5 THEN 30
  WHEN "weekly_goal" = 10 THEN 60
  WHEN "weekly_goal" = 15 THEN 90
  ELSE GREATEST(20, LEAST(350, ROUND("weekly_goal" * 7.0 / 10.0) * 10))
END;
