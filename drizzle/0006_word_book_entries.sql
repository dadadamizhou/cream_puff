CREATE TABLE "word_book_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "word_id" integer NOT NULL REFERENCES "words"("id") ON DELETE cascade,
  "word_book" text NOT NULL,
  "position" integer NOT NULL,
  CONSTRAINT "word_book_entries_book_check" CHECK ("word_book" IN ('grade1', 'grade2', 'grade3', 'cet4'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "word_book_entries_word_book_idx" ON "word_book_entries" ("word_id", "word_book");
--> statement-breakpoint
CREATE INDEX "word_book_entries_book_position_idx" ON "word_book_entries" ("word_book", "position");
--> statement-breakpoint
INSERT INTO "word_book_entries" ("word_id", "word_book", "position")
SELECT "id", "word_book", "position" FROM "words"
ON CONFLICT ("word_id", "word_book") DO NOTHING;
