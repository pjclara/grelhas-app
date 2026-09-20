-- CreateTable
CREATE TABLE "InstrumentoPeso" (
    "id" TEXT NOT NULL,
    "instrumentoId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InstrumentoPeso_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InstrumentoPeso" ADD CONSTRAINT "InstrumentoPeso_instrumentoId_fkey" FOREIGN KEY ("instrumentoId") REFERENCES "InstrumentoAvaliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentoPeso" ADD CONSTRAINT "InstrumentoPeso_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: o peso de cada instrumento era único e partilhado por todas as
-- disciplinas do grupo a que pertencia. Aqui copia-se esse peso para cada
-- par (instrumento, disciplina) que já existia via o grupo, preservando o
-- valor atual antes de o modelo antigo ser removido.
INSERT INTO "InstrumentoPeso" ("id", "instrumentoId", "disciplinaId", "peso")
SELECT
    md5(random()::text || clock_timestamp()::text || ia."id" || d."A"),
    ia."id",
    d."A",
    ia."peso"
FROM "InstrumentoAvaliacao" ia
JOIN "GrupoAvaliacao" g ON g."id" = ia."grupoId"
JOIN "_DisciplinaToGrupoAvaliacao" d ON d."B" = g."id"
WHERE ia."peso" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "_DisciplinaToGrupoAvaliacao" DROP CONSTRAINT "_DisciplinaToGrupoAvaliacao_A_fkey";

-- DropForeignKey
ALTER TABLE "_DisciplinaToGrupoAvaliacao" DROP CONSTRAINT "_DisciplinaToGrupoAvaliacao_B_fkey";

-- DropTable
DROP TABLE "_DisciplinaToGrupoAvaliacao";

-- AlterTable
ALTER TABLE "InstrumentoAvaliacao" DROP COLUMN "peso";

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentoPeso_instrumentoId_disciplinaId_key" ON "InstrumentoPeso"("instrumentoId", "disciplinaId");
