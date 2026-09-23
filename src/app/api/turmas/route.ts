import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { turmaSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

const PERIODOS_PADRAO = [
  { nome: '1.º Semestre', ordem: 1 },
  { nome: '2.º Semestre', ordem: 2 },
];

export async function GET() {
  try {
    const userId = await requireUserId();
    const turmas = await prisma.turma.findMany({
      where: { userId },
      include: {
        anoLetivo: true,
        disciplinas: { include: { disciplina: true } },
        _count: { select: { matriculas: { where: { ativa: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(turmas);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Cria uma turma (grupo de alunos) já com os períodos "padrão" do ano
 * letivo. A turma nasce sem disciplinas associadas — cada disciplina é
 * adicionada depois via POST /api/turmas/[turmaId]/disciplinas, que é
 * também onde os critérios de avaliação "padrão" são criados.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const data = turmaSchema.parse(await req.json());

    if (data.nivelEnsino) {
      const ciclo = await prisma.ciclo.findFirst({ where: { nome: data.nivelEnsino } });
      if (!ciclo) throw new NotFoundError('Nível de ensino inexistente');
    }

    const turma = await prisma.turma.create({
      data: {
        userId,
        anoLetivoId: data.anoLetivoId,
        nome: data.nome,
        nivelEnsino: data.nivelEnsino ?? null,
        periodos: { create: PERIODOS_PADRAO },
      },
      include: { periodos: true, disciplinas: true },
    });

    return NextResponse.json(turma, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
