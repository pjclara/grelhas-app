-- A data de avaliação passa a ser obrigatória em Instrumento. Antes de aplicar
-- a restrição NOT NULL, preenche instrumentos antigos sem data com a data atual
-- (o professor pode corrigi-la depois) — não apaga nenhum dado.
UPDATE "Instrumento" SET "data" = CURRENT_DATE WHERE "data" IS NULL;

-- AlterTable
ALTER TABLE "Instrumento" ALTER COLUMN "data" SET NOT NULL;
