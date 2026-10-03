-- CreateEnum
CREATE TYPE "TipoCriterio" AS ENUM ('GERAL', 'ESPECIFICO');

-- CreateTable
CREATE TABLE "Criterio" (
    "id" TEXT NOT NULL,
    "anoLetivoId" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "tipo" "TipoCriterio" NOT NULL,
    "grupoDisciplinarId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Criterio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentoRecolha" (
    "id" TEXT NOT NULL,
    "criterioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DOUBLE PRECISION,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InstrumentoRecolha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubInstrumento" (
    "id" TEXT NOT NULL,
    "instrumentoRecolhaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DOUBLE PRECISION,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubInstrumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Criterio_anoLetivoId_cicloId_idx" ON "Criterio"("anoLetivoId", "cicloId");

-- CreateIndex
CREATE INDEX "InstrumentoRecolha_criterioId_idx" ON "InstrumentoRecolha"("criterioId");

-- CreateIndex
CREATE INDEX "SubInstrumento_instrumentoRecolhaId_idx" ON "SubInstrumento"("instrumentoRecolhaId");

-- AddForeignKey
ALTER TABLE "Criterio" ADD CONSTRAINT "Criterio_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criterio" ADD CONSTRAINT "Criterio_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criterio" ADD CONSTRAINT "Criterio_grupoDisciplinarId_fkey" FOREIGN KEY ("grupoDisciplinarId") REFERENCES "GrupoDisciplinar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentoRecolha" ADD CONSTRAINT "InstrumentoRecolha_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "Criterio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubInstrumento" ADD CONSTRAINT "SubInstrumento_instrumentoRecolhaId_fkey" FOREIGN KEY ("instrumentoRecolhaId") REFERENCES "InstrumentoRecolha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

