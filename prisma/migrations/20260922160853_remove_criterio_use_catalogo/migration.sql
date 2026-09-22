-- DropForeignKey
ALTER TABLE "Criterio" DROP CONSTRAINT "Criterio_turmaDisciplinaId_fkey";

-- DropForeignKey
ALTER TABLE "Instrumento" DROP CONSTRAINT "Instrumento_criterioCatalogoId_fkey";

-- DropForeignKey
ALTER TABLE "Instrumento" DROP CONSTRAINT "Instrumento_criterioId_fkey";

-- AlterTable
ALTER TABLE "Instrumento" DROP COLUMN "criterioCatalogoId";

-- DropTable
DROP TABLE "Criterio";

-- AddForeignKey
ALTER TABLE "Instrumento" ADD CONSTRAINT "Instrumento_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "TurmaDisciplinaInstrumento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

