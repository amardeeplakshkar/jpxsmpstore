CREATE TABLE "game_modes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(60) NOT NULL,
	"slug" varchar(60) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon_url" text,
	"accent_color" varchar(7) DEFAULT '#a855f7' NOT NULL,
	"allowed_types" jsonb DEFAULT '["RANK","CRATE","COINS","CUSTOM"]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "game_mode_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount_eligible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "game_modes_slug_uq" ON "game_modes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "game_modes_sort_idx" ON "game_modes" USING btree ("sort_order");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_game_mode_id_game_modes_id_fk" FOREIGN KEY ("game_mode_id") REFERENCES "public"."game_modes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_game_mode_idx" ON "products" USING btree ("game_mode_id");