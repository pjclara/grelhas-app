-- CreateTable
CREATE TABLE "Classificacao" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "turmaDisciplinaId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,

    CONSTRAINT "Classificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Classificacao_alunoId_turmaDisciplinaId_periodoId_key" ON "Classificacao"("alunoId", "turmaDisciplinaId", "periodoId");

-- AddForeignKey
ALTER TABLE "Classificacao" ADD CONSTRAINT "Classificacao_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classificacao" ADD CONSTRAINT "Classificacao_turmaDisciplinaId_fkey" FOREIGN KEY ("turmaDisciplinaId") REFERENCES "TurmaDisciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classificacao" ADD CONSTRAINT "Classificacao_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
