-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "career_interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cgpa" DECIMAL(3,2),
ADD COLUMN     "college" TEXT,
ADD COLUMN     "current_year" INTEGER,
ADD COLUMN     "degree" TEXT,
ADD COLUMN     "domain_interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "github_url" TEXT,
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "portfolio_url" TEXT,
ADD COLUMN     "preferred_role" TEXT,
ADD COLUMN     "technical_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tools" TEXT[] DEFAULT ARRAY[]::TEXT[];
