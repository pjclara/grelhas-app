-- Introduz "Matricula" (histórico de inscrição do aluno numa turma) para
-- permitir transferências sem perder o histórico, e move a identidade do
-- aluno (numeroProcesso) para ser fixa por professor, independente da
-- turma atual. A tabela "Aluno" está vazia na BD partilhada à data desta
-- migração, pelo que não há dados a preservar.

-- DropForeignKey
ALTER TABLE "Aluno" DROP CONSTRAINT "Aluno_turmaId_fkey";

-- DropIndex
DROP INDEX "Aluno_turmaId_numero_key";

-- AlterTable
ALTER TABLE "Aluno" DROP COLUMN "numero",
DROP COLUMN "turmaId",
ADD COLUMN     "numeroProcesso" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Matricula" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadaEm" TIMESTAMP(3),

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_turmaId_numero_key" ON "Matricula"("turmaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_userId_numeroProcesso_key" ON "Aluno"("userId", "numeroProcesso");

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
