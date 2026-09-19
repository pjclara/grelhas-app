-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROFESSOR', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'PROFESSOR';
