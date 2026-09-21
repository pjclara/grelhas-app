-- Tornar Disciplina, AnoLetivo e GrupoAvaliacao globais (deixam de pertencer
-- a um utilizador). Antes de remover a coluna "userId" e apertar as
-- constraints @@unique para [nome] / [anoLetivoId, nome], é preciso fundir
-- registos duplicados que hoje só são distintos por pertencerem a
-- utilizadores diferentes (ex.: dois professores, cada um com o seu próprio
-- ano letivo "2026/2027"). A fusão repointa as tabelas dependentes para o
-- registo mais antigo (MIN(id)) antes de apagar os duplicados — se dois
-- registos "iguais" tiverem filhos que colidissem entre si (ex.: o mesmo
-- nome de instrumento em dois grupos fundidos), o UPDATE seguinte falha por
-- violação de unicidade em vez de descartar dados silenciosamente.

-- 1) Fundir AnoLetivo por "nome"
WITH canonical AS (
  SELECT nome, MIN(id) AS canonical_id
  FROM "AnoLetivo"
  GROUP BY nome
)
UPDATE "GrupoAvaliacao" g
SET "anoLetivoId" = c.canonical_id
FROM "AnoLetivo" a
JOIN canonical c ON c.nome = a.nome
WHERE g."anoLetivoId" = a.id
  AND a.id <> c.canonical_id;

WITH canonical AS (
  SELECT nome, MIN(id) AS canonical_id
  FROM "AnoLetivo"
  GROUP BY nome
)
UPDATE "Turma" t
SET "anoLetivoId" = c.canonical_id
FROM "AnoLetivo" a
JOIN canonical c ON c.nome = a.nome
WHERE t."anoLetivoId" = a.id
  AND a.id <> c.canonical_id;

WITH canonical AS (
  SELECT nome, MIN(id) AS canonical_id
  FROM "AnoLetivo"
  GROUP BY nome
)
DELETE FROM "AnoLetivo" a
USING canonical c
WHERE a.nome = c.nome
  AND a.id <> c.canonical_id;

-- 2) Fundir GrupoAvaliacao por ("anoLetivoId", "nome") — já pós-fusão do AnoLetivo
WITH canonical AS (
  SELECT "anoLetivoId", nome, MIN(id) AS canonical_id
  FROM "GrupoAvaliacao"
  GROUP BY "anoLetivoId", nome
)
UPDATE "InstrumentoAvaliacao" ia
SET "grupoId" = c.canonical_id
FROM "GrupoAvaliacao" g
JOIN canonical c ON c."anoLetivoId" = g."anoLetivoId" AND c.nome = g.nome
WHERE ia."grupoId" = g.id
  AND g.id <> c.canonical_id;

WITH canonical AS (
  SELECT "anoLetivoId", nome, MIN(id) AS canonical_id
  FROM "GrupoAvaliacao"
  GROUP BY "anoLetivoId", nome
)
DELETE FROM "GrupoAvaliacao" g
USING canonical c
WHERE g."anoLetivoId" = c."anoLetivoId"
  AND g.nome = c.nome
  AND g.id <> c.canonical_id;

-- 3) Fundir Disciplina por "nome"
WITH canonical AS (
  SELECT nome, MIN(id) AS canonical_id
  FROM "Disciplina"
  GROUP BY nome
)
UPDATE "TurmaDisciplina" td
SET "disciplinaId" = c.canonical_id
FROM "Disciplina" d
JOIN canonical c ON c.nome = d.nome
WHERE td."disciplinaId" = d.id
  AND d.id <> c.canonical_id;

WITH canonical AS (
  SELECT nome, MIN(id) AS canonical_id
  FROM "Disciplina"
  GROUP BY nome
)
UPDATE "InstrumentoPeso" ip
SET "disciplinaId" = c.canonical_id
FROM "Disciplina" d
JOIN canonical c ON c.nome = d.nome
WHERE ip."disciplinaId" = d.id
  AND d.id <> c.canonical_id;

WITH canonical AS (
  SELECT nome, MIN(id) AS canonical_id
  FROM "Disciplina"
  GROUP BY nome
)
DELETE FROM "Disciplina" d
USING canonical c
WHERE d.nome = c.nome
  AND d.id <> c.canonical_id;

-- 4) Só agora: tornar os três catálogos globais (remover userId, apertar unicidade)

-- DropForeignKey
ALTER TABLE "AnoLetivo" DROP CONSTRAINT "AnoLetivo_userId_fkey";

-- DropForeignKey
ALTER TABLE "Disciplina" DROP CONSTRAINT "Disciplina_userId_fkey";

-- DropForeignKey
ALTER TABLE "GrupoAvaliacao" DROP CONSTRAINT "GrupoAvaliacao_userId_fkey";

-- DropIndex
DROP INDEX "AnoLetivo_userId_nome_key";

-- DropIndex
DROP INDEX "Disciplina_userId_nome_key";

-- DropIndex
DROP INDEX "GrupoAvaliacao_userId_anoLetivoId_nome_key";

-- AlterTable
ALTER TABLE "AnoLetivo" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Disciplina" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "GrupoAvaliacao" DROP COLUMN "userId";

-- CreateIndex
CREATE UNIQUE INDEX "AnoLetivo_nome_key" ON "AnoLetivo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Disciplina_nome_key" ON "Disciplina"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoAvaliacao_anoLetivoId_nome_key" ON "GrupoAvaliacao"("anoLetivoId", "nome");
