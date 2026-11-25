CREATE TYPE "public"."video_status" AS ENUM('processing', 'ready', 'error');--> statement-breakpoint
CREATE TABLE "project_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"status" "video_status" DEFAULT 'processing' NOT NULL,
	"source_path" text,
	"original_name" text,
	"path" text,
	"poster_path" text,
	"duration_sec" integer,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"caption" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_videos" ADD CONSTRAINT "project_videos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;