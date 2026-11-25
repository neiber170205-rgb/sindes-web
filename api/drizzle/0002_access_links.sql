ALTER TABLE "admin_users" ADD COLUMN "access_token_hash" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "access_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_access_token_hash_unique" UNIQUE("access_token_hash");