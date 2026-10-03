-- Substitui o modelo antigo de critérios (GrupoAvaliacao / InstrumentoAvaliacao /
-- InstrumentoPeso / TurmaDisciplinaInstrumento) pelo novo (Criterio /
-- InstrumentoRecolha / SubInstrumento).
--
-- DESTRUTIVO por decisão expressa do utilizador ("limpar a bd e começar de
-- novo"): apaga todos os Instrumento e, em cascata, as Pergunta e Nota. As
-- linhas apagadas ficam registadas em audit_log (triggers nota_audit /
-- instrumento_audit). Utilizadores, turmas, alunos e disciplinas não são tocados.
DELETE FROM "Instrumento";

-- DropForeignKey
ALTER TABLE "GrupoAvaliacao" DROP CONSTRAINT "GrupoAvaliacao_anoLetivoId_fkey";

-- DropForeignKey
ALTER TABLE "InstrumentoAvaliacao" DROP CONSTRAINT "InstrumentoAvaliacao_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "TurmaDisciplinaInstrumento" DROP CONSTRAINT "TurmaDisciplinaInstrumento_turmaDisciplinaId_fkey";

-- DropForeignKey
ALTER TABLE "TurmaDisciplinaInstrumento" DROP CONSTRAINT "TurmaDisciplinaInstrumento_instrumentoAvaliacaoId_fkey";

-- DropForeignKey
ALTER TABLE "InstrumentoPeso" DROP CONSTRAINT "InstrumentoPeso_instrumentoId_fkey";

-- DropForeignKey
ALTER TABLE "InstrumentoPeso" DROP CONSTRAINT "InstrumentoPeso_disciplinaId_fkey";

-- DropForeignKey
ALTER TABLE "Instrumento" DROP CONSTRAINT "Instrumento_criterioId_fkey";

-- AlterTable
ALTER TABLE "Turma" ADD COLUMN     "cicloId" TEXT;

-- Preenche o ciclo das turmas existentes a partir do rótulo (nivelEnsino = Ciclo.nome).
UPDATE "Turma" SET "cicloId" = "Ciclo"."id" FROM "Ciclo" WHERE "Ciclo"."nome" = "Turma"."nivelEnsino";

-- AlterTable
ALTER TABLE "Instrumento" DROP COLUMN "criterioId",
ADD COLUMN     "instrumentoRecolhaId" TEXT NOT NULL,
ADD COLUMN     "subInstrumentoId" TEXT;

-- DropTable
DROP TABLE "GrupoAvaliacao";

-- DropTable
DROP TABLE "InstrumentoAvaliacao";

-- DropTable
DROP TABLE "TurmaDisciplinaInstrumento";

-- DropTable
DROP TABLE "InstrumentoPeso";

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrumento" ADD CONSTRAINT "Instrumento_instrumentoRecolhaId_fkey" FOREIGN KEY ("instrumentoRecolhaId") REFERENCES "InstrumentoRecolha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrumento" ADD CONSTRAINT "Instrumento_subInstrumentoId_fkey" FOREIGN KEY ("subInstrumentoId") REFERENCES "SubInstrumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
