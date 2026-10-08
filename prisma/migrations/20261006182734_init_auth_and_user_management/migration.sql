-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ALUMNI', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "profile_photo" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch" TEXT,
    "batch" TEXT,
    "graduation_year" INTEGER,
    "career_goal" TEXT,
    "preferred_domain" TEXT,
    "preferred_company" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "resume_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumni_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "graduation_year" INTEGER,
    "branch" TEXT,
    "current_company" TEXT,
    "job_role" TEXT,
    "years_of_experience" INTEGER,
    "domain" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "mentorship_available" BOOLEAN NOT NULL DEFAULT false,
    "areas_of_expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_approved_idx" ON "users"("is_approved");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE INDEX "student_profiles_user_id_idx" ON "student_profiles"("user_id");

-- CreateIndex
CREATE INDEX "student_profiles_branch_idx" ON "student_profiles"("branch");

-- CreateIndex
CREATE INDEX "student_profiles_graduation_year_idx" ON "student_profiles"("graduation_year");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_profiles_user_id_key" ON "alumni_profiles"("user_id");

-- CreateIndex
CREATE INDEX "alumni_profiles_user_id_idx" ON "alumni_profiles"("user_id");

-- CreateIndex
CREATE INDEX "alumni_profiles_current_company_idx" ON "alumni_profiles"("current_company");

-- CreateIndex
CREATE INDEX "alumni_profiles_domain_idx" ON "alumni_profiles"("domain");

-- CreateIndex
CREATE INDEX "alumni_profiles_mentorship_available_idx" ON "alumni_profiles"("mentorship_available");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
