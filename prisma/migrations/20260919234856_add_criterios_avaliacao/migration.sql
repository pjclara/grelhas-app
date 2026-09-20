-- CreateTable
CREATE TABLE "GrupoAvaliacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "anoLetivoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GrupoAvaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentoAvaliacao" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InstrumentoAvaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DisciplinaToGrupoAvaliacao" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GrupoAvaliacao_userId_anoLetivoId_nome_key" ON "GrupoAvaliacao"("userId", "anoLetivoId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentoAvaliacao_grupoId_nome_key" ON "InstrumentoAvaliacao"("grupoId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "_DisciplinaToGrupoAvaliacao_AB_unique" ON "_DisciplinaToGrupoAvaliacao"("A", "B");

-- CreateIndex
CREATE INDEX "_DisciplinaToGrupoAvaliacao_B_index" ON "_DisciplinaToGrupoAvaliacao"("B");

-- AddForeignKey
ALTER TABLE "GrupoAvaliacao" ADD CONSTRAINT "GrupoAvaliacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoAvaliacao" ADD CONSTRAINT "GrupoAvaliacao_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentoAvaliacao" ADD CONSTRAINT "InstrumentoAvaliacao_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoAvaliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DisciplinaToGrupoAvaliacao" ADD CONSTRAINT "_DisciplinaToGrupoAvaliacao_A_fkey" FOREIGN KEY ("A") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DisciplinaToGrupoAvaliacao" ADD CONSTRAINT "_DisciplinaToGrupoAvaliacao_B_fkey" FOREIGN KEY ("B") REFERENCES "GrupoAvaliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
