CREATE TABLE "post_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_likes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "post_bookmarks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "post_comments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "post_likes_select_all" ON "post_likes" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "post_likes_insert_own" ON "post_likes" FOR INSERT TO authenticated WITH CHECK ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "post_likes_delete_own" ON "post_likes" FOR DELETE TO authenticated USING ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "post_bookmarks_select_own" ON "post_bookmarks" FOR SELECT TO authenticated USING ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "post_bookmarks_insert_own" ON "post_bookmarks" FOR INSERT TO authenticated WITH CHECK ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "post_bookmarks_delete_own" ON "post_bookmarks" FOR DELETE TO authenticated USING ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "post_comments_select_all" ON "post_comments" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "post_comments_insert_own" ON "post_comments" FOR INSERT TO authenticated WITH CHECK ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "post_comments_delete_own" ON "post_comments" FOR DELETE TO authenticated USING ("profile_id" = auth.uid());
