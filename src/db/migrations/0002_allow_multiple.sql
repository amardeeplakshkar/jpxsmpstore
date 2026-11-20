ALTER TABLE "products" ADD COLUMN "allow_multiple" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "products" SET "allow_multiple" = true WHERE "type" = 'CRATE';