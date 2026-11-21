ALTER TABLE "products" ADD COLUMN "allow_multiple" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Crates were already multi-buy before this column existed; keep the stored flag consistent with that rule.
UPDATE "products" SET "allow_multiple" = true WHERE "type" = 'CRATE';
