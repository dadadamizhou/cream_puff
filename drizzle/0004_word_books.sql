ALTER TABLE "users" ADD COLUMN "enabled_word_books" jsonb DEFAULT '["grade1","grade2","grade3","cet4"]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "word_book" text DEFAULT 'grade1' NOT NULL;
--> statement-breakpoint
UPDATE "words"
SET "word_book" = CASE
  WHEN "position" <= 1200 THEN 'grade1'
  WHEN "position" <= 2400 THEN 'grade2'
  ELSE 'grade3'
END;
--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_word_book_check" CHECK ("word_book" IN ('grade1', 'grade2', 'grade3', 'cet4'));
--> statement-breakpoint
CREATE INDEX "words_book_position_idx" ON "words" ("word_book", "position");
