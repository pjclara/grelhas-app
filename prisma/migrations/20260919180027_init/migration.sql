-- CreateEnum
CREATE TYPE "ModoAvaliacao" AS ENUM ('PONTOS', 'ESCALA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disciplina" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Disciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnoLetivo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "AnoLetivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "anoLetivoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nivelEnsino" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "limiarNivel2" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "limiarNivel3" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "limiarNivel4" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "limiarNivel5" DOUBLE PRECISION NOT NULL DEFAULT 90,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aluno" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "medidas" TEXT,
    "aliena" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criterio" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "Criterio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instrumento" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "criterioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "modo" "ModoAvaliacao" NOT NULL DEFAULT 'PONTOS',
    "escalaMax" INTEGER NOT NULL DEFAULT 5,
    "unidade" TEXT,
    "tema" TEXT,
    "data" TIMESTAMP(3),
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Instrumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pergunta" (
    "id" TEXT NOT NULL,
    "instrumentoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "valorMax" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "Pergunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "perguntaId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Disciplina_userId_nome_key" ON "Disciplina"("userId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "AnoLetivo_userId_nome_key" ON "AnoLetivo"("userId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Turma_userId_disciplinaId_anoLetivoId_nome_key" ON "Turma"("userId", "disciplinaId", "anoLetivoId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_turmaId_numero_key" ON "Aluno"("turmaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Periodo_turmaId_ordem_key" ON "Periodo"("turmaId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "Criterio_turmaId_nome_key" ON "Criterio"("turmaId", "nome");

-- CreateIndex
CREATE INDEX "Instrumento_turmaId_periodoId_idx" ON "Instrumento"("turmaId", "periodoId");

-- CreateIndex
CREATE INDEX "Pergunta_instrumentoId_idx" ON "Pergunta"("instrumentoId");

-- CreateIndex
CREATE INDEX "Nota_alunoId_idx" ON "Nota"("alunoId");

-- CreateIndex
CREATE UNIQUE INDEX "Nota_perguntaId_alunoId_key" ON "Nota"("perguntaId", "alunoId");

-- AddForeignKey
ALTER TABLE "Disciplina" ADD CONSTRAINT "Disciplina_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnoLetivo" ADD CONSTRAINT "AnoLetivo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Periodo" ADD CONSTRAINT "Periodo_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criterio" ADD CONSTRAINT "Criterio_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrumento" ADD CONSTRAINT "Instrumento_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrumento" ADD CONSTRAINT "Instrumento_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrumento" ADD CONSTRAINT "Instrumento_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "Criterio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pergunta" ADD CONSTRAINT "Pergunta_instrumentoId_fkey" FOREIGN KEY ("instrumentoId") REFERENCES "Instrumento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_perguntaId_fkey" FOREIGN KEY ("perguntaId") REFERENCES "Pergunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
