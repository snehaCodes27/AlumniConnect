-- Create new enums for community system
CREATE TYPE "CommunityRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');
CREATE TYPE "CommunityMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'LEFT', 'BANNED');
CREATE TYPE "CommunityPostType" AS ENUM ('DISCUSSION', 'ANNOUNCEMENT', 'RESOURCE', 'QUESTION');

-- Add new notification types
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_JOIN';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_POST';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_COMMENT';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MEMBER_LEAVE';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MEMBER_ROLE';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MEMBER_REMOVE';

-- Create communities table
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT,
    "career_focus" TEXT,
    "tags" TEXT[],
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "max_members" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "creator_id" TEXT NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- Create unique index on slug
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");
CREATE INDEX "communities_domain_idx" ON "communities"("domain");
CREATE INDEX "communities_career_focus_idx" ON "communities"("career_focus");

-- Create community_members table (unique constraint prevents duplicate memberships)
CREATE TABLE "community_members" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
    "status" "CommunityMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_members_community_id_user_id_key" ON "community_members"("community_id", "user_id");
CREATE INDEX "community_members_community_id_idx" ON "community_members"("community_id");
CREATE INDEX "community_members_user_id_idx" ON "community_members"("user_id");
CREATE INDEX "community_members_community_id_role_idx" ON "community_members"("community_id", "role");
CREATE INDEX "community_members_community_id_status_idx" ON "community_members"("community_id", "status");

-- Create community_posts table
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "type" "CommunityPostType" NOT NULL DEFAULT 'DISCUSSION',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link_url" TEXT,
    "tags" TEXT[],
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_posts_community_id_idx" ON "community_posts"("community_id");
CREATE INDEX "community_posts_author_id_idx" ON "community_posts"("author_id");
CREATE INDEX "community_posts_type_idx" ON "community_posts"("type");
CREATE INDEX "community_posts_community_id_is_pinned_idx" ON "community_posts"("community_id", "is_pinned");
CREATE INDEX "community_posts_community_id_created_at_idx" ON "community_posts"("community_id", "created_at");

-- Create community_comments table (supports threaded replies)
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_comments_post_id_idx" ON "community_comments"("post_id");
CREATE INDEX "community_comments_author_id_idx" ON "community_comments"("author_id");
CREATE INDEX "community_comments_parent_id_idx" ON "community_comments"("parent_id");
CREATE INDEX "community_comments_post_id_created_at_idx" ON "community_comments"("post_id", "created_at");

-- Add foreign key constraints
ALTER TABLE "communities" ADD CONSTRAINT "communities_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
