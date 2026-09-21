-- Eleva "Disciplina.ciclo" (texto livre, um só valor) a um modelo
-- próprio: cada disciplina passa a ter um Grupo Disciplinar, vários
-- Ciclos e vários Anos de Escolaridade. Os dados existentes de
-- "Disciplina.ciclo" são preservados: semeia-se o catálogo "Ciclo" com
-- os valores distintos já usados e liga-se cada disciplina ao ciclo
-- correspondente antes de remover a coluna antiga.

-- CreateTable
CREATE TABLE "GrupoDisciplinar" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrupoDisciplinar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ciclo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ciclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnoEscolaridade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnoEscolaridade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaCiclo" (
    "id" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,

    CONSTRAINT "DisciplinaCiclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaAnoEscolaridade" (
    "id" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "anoEscolaridadeId" TEXT NOT NULL,

    CONSTRAINT "DisciplinaAnoEscolaridade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrupoDisciplinar_nome_key" ON "GrupoDisciplinar"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Ciclo_nome_key" ON "Ciclo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "AnoEscolaridade_nome_key" ON "AnoEscolaridade"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "DisciplinaCiclo_disciplinaId_cicloId_key" ON "DisciplinaCiclo"("disciplinaId", "cicloId");

-- CreateIndex
CREATE UNIQUE INDEX "DisciplinaAnoEscolaridade_disciplinaId_anoEscolaridadeId_key" ON "DisciplinaAnoEscolaridade"("disciplinaId", "anoEscolaridadeId");

-- AddForeignKey
ALTER TABLE "DisciplinaCiclo" ADD CONSTRAINT "DisciplinaCiclo_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaCiclo" ADD CONSTRAINT "DisciplinaCiclo_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaAnoEscolaridade" ADD CONSTRAINT "DisciplinaAnoEscolaridade_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaAnoEscolaridade" ADD CONSTRAINT "DisciplinaAnoEscolaridade_anoEscolaridadeId_fkey" FOREIGN KEY ("anoEscolaridadeId") REFERENCES "AnoEscolaridade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Semear "Ciclo" com os valores distintos já usados em "Disciplina.ciclo"
INSERT INTO "Ciclo" ("id", "nome", "ativo", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, sub.ciclo, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT ciclo FROM "Disciplina" WHERE ciclo IS NOT NULL) AS sub(ciclo)
ON CONFLICT ("nome") DO NOTHING;

-- Ligar cada disciplina ao Ciclo correspondente, antes de apagar a coluna antiga
INSERT INTO "DisciplinaCiclo" ("id", "disciplinaId", "cicloId")
SELECT gen_random_uuid()::text, d.id, c.id
FROM "Disciplina" d
JOIN "Ciclo" c ON c.nome = d.ciclo
WHERE d.ciclo IS NOT NULL
ON CONFLICT ("disciplinaId", "cicloId") DO NOTHING;

-- Semear o catálogo de Anos de Escolaridade (7.º a 12.º ano)
INSERT INTO "AnoEscolaridade" ("id", "nome", "ordem", "ativo", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, '7.º ano', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '8.º ano', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '9.º ano', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '10.º ano', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '11.º ano', 11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '12.º ano', 12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nome") DO NOTHING;

-- AlterTable: só agora remover "ciclo" (já migrado acima) e adicionar as
-- colunas novas de "Disciplina". "updatedAt" leva DEFAULT para não
-- falhar NOT NULL nas disciplinas já existentes.
ALTER TABLE "Disciplina" DROP COLUMN "ciclo",
ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "grupoDisciplinarId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Disciplina" ADD CONSTRAINT "Disciplina_grupoDisciplinarId_fkey" FOREIGN KEY ("grupoDisciplinarId") REFERENCES "GrupoDisciplinar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
