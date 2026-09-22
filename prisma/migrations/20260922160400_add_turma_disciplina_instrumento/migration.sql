-- AlterTable
ALTER TABLE "AnoEscolaridade" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Ciclo" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Disciplina" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GrupoDisciplinar" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Instrumento" ADD COLUMN     "criterioCatalogoId" TEXT;

-- CreateTable
CREATE TABLE "TurmaDisciplinaInstrumento" (
    "id" TEXT NOT NULL,
    "turmaDisciplinaId" TEXT NOT NULL,
    "instrumentoAvaliacaoId" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "TurmaDisciplinaInstrumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TurmaDisciplinaInstrumento_turmaDisciplinaId_instrumentoAva_key" ON "TurmaDisciplinaInstrumento"("turmaDisciplinaId", "instrumentoAvaliacaoId");

-- AddForeignKey
ALTER TABLE "TurmaDisciplinaInstrumento" ADD CONSTRAINT "TurmaDisciplinaInstrumento_turmaDisciplinaId_fkey" FOREIGN KEY ("turmaDisciplinaId") REFERENCES "TurmaDisciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaDisciplinaInstrumento" ADD CONSTRAINT "TurmaDisciplinaInstrumento_instrumentoAvaliacaoId_fkey" FOREIGN KEY ("instrumentoAvaliacaoId") REFERENCES "InstrumentoAvaliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrumento" ADD CONSTRAINT "Instrumento_criterioCatalogoId_fkey" FOREIGN KEY ("criterioCatalogoId") REFERENCES "TurmaDisciplinaInstrumento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
