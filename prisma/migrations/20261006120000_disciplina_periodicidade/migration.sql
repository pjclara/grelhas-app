-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('ANUAL', 'SEMESTRAL');

-- AlterTable
ALTER TABLE "Disciplina" ADD COLUMN     "periodicidade" "Periodicidade" NOT NULL DEFAULT 'ANUAL';

-- AlterTable
ALTER TABLE "TurmaDisciplina" ADD COLUMN     "periodoId" TEXT;

-- AddForeignKey
ALTER TABLE "TurmaDisciplina" ADD CONSTRAINT "TurmaDisciplina_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

