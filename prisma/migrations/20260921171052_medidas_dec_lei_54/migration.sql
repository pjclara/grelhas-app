-- Substitui o campo de texto livre "Aluno.medidas" (e o campo não usado
-- "Aluno.aliena") por um catálogo fixo de medidas de suporte à
-- aprendizagem (Dec-Lei 54/2018), atribuíveis 0..N a cada aluno via
-- AlunoMedida. A tabela "Aluno" está vazia na BD partilhada à data desta
-- migração, pelo que não há dados a preservar.

-- CreateEnum
CREATE TYPE "TipoMedida" AS ENUM ('UNIVERSAL', 'SELETIVA', 'ADICIONAL');

-- AlterTable
ALTER TABLE "Aluno" DROP COLUMN "aliena",
DROP COLUMN "medidas";

-- CreateTable
CREATE TABLE "Medida" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMedida" NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,

    CONSTRAINT "Medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlunoMedida" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "medidaId" TEXT NOT NULL,

    CONSTRAINT "AlunoMedida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Medida_tipo_codigo_key" ON "Medida"("tipo", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AlunoMedida_alunoId_medidaId_key" ON "AlunoMedida"("alunoId", "medidaId");

-- AddForeignKey
ALTER TABLE "AlunoMedida" ADD CONSTRAINT "AlunoMedida_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlunoMedida" ADD CONSTRAINT "AlunoMedida_medidaId_fkey" FOREIGN KEY ("medidaId") REFERENCES "Medida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed do catálogo fixo (Dec-Lei 54/2018)
INSERT INTO "Medida" ("id", "tipo", "codigo", "titulo") VALUES
  ('medida_universal_a', 'UNIVERSAL', 'a', 'Diferenciação pedagógica'),
  ('medida_universal_b', 'UNIVERSAL', 'b', 'Acomodações curriculares'),
  ('medida_universal_c', 'UNIVERSAL', 'c', 'Enriquecimento curricular'),
  ('medida_universal_d', 'UNIVERSAL', 'd', 'Promoção do comportamento pró-social'),
  ('medida_universal_e', 'UNIVERSAL', 'e', 'Intervenção em pequenos grupos'),
  ('medida_seletiva_a', 'SELETIVA', 'a', 'Percursos curriculares diferenciados'),
  ('medida_seletiva_b', 'SELETIVA', 'b', 'Adaptações curriculares não significativas'),
  ('medida_seletiva_c', 'SELETIVA', 'c', 'Apoio psicopedagógico'),
  ('medida_seletiva_d', 'SELETIVA', 'd', 'Antecipação e reforço das aprendizagens'),
  ('medida_seletiva_e', 'SELETIVA', 'e', 'Apoio tutorial'),
  ('medida_adicional_a', 'ADICIONAL', 'a', 'Frequência do ano por disciplinas'),
  ('medida_adicional_b', 'ADICIONAL', 'b', 'Adaptações curriculares significativas'),
  ('medida_adicional_c', 'ADICIONAL', 'c', 'Plano Individual de Transição'),
  ('medida_adicional_d', 'ADICIONAL', 'd', 'Ensino estruturado'),
  ('medida_adicional_e', 'ADICIONAL', 'e', 'Autonomia pessoal e social')
ON CONFLICT DO NOTHING;
