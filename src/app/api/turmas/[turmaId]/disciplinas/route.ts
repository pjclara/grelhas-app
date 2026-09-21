import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { turmaDisciplinaSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

const CRITERIOS_PADRAO = [
  { grupo: 'Conhecimentos e Capacidades', nome: 'Testes de avaliação', peso: 0.45, ordem: 0 },
  { grupo: 'Conhecimentos e Capacidades', nome: 'Outros instrumentos', peso: 0.3, ordem: 1 },
  {
    grupo: 'Atitudes',
    nome: 'Responsabilidade e valores democráticos, de cidadania e solidariedade',
    peso: 0.05,
    ordem: 2,
  },
  {
    grupo: 'Atitudes',
    nome: 'Cooperação, relacionamento interpessoal e desenvolvimento pessoal',
    peso: 0.05,
    ordem: 3,
  },
  {
    grupo: 'Atitudes',
    nome: 'Reflexão e (auto)regulação do processo de aprendizagem',
    peso: 0.05,
    ordem: 4,
  },
  { grupo: 'Atitudes', nome: 'Iniciativa, autonomia e organização/método de trabalho', peso: 0.05, ordem: 5 },
  {
    grupo: 'Atitudes',
    nome: 'Seleção e desenvolvimento de estratégias para resolução de problemas',
    peso: 0.05,
    ordem: 6,
  },
];

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const disciplinas = await prisma.turmaDisciplina.findMany({
      where: { turmaId: params.turmaId },
      include: { disciplina: true, _count: { select: { alunos: true } } },
      orderBy: { disciplina: { nome: 'asc' } },
    });
    return NextResponse.json(disciplinas);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Associa uma disciplina (do catálogo global) a esta turma, já com os
 * critérios de avaliação "padrão" (réplica dos pesos da grelha original).
 * A mesma disciplina não pode ser associada duas vezes à mesma turma
 * (garantido por @@unique([turmaId, disciplinaId]) no schema — um pedido
 * duplicado resulta em 409 via handleApiError).
 */
export async function POST(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = turmaDisciplinaSchema.parse(await req.json());

    const disciplina = await prisma.disciplina.findFirst({
      where: { id: data.disciplinaId },
    });
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');

    const turmaDisciplina = await prisma.turmaDisciplina.create({
      data: {
        turmaId: params.turmaId,
        disciplinaId: data.disciplinaId,
        criterios: { create: CRITERIOS_PADRAO },
      },
      include: { disciplina: true, criterios: true },
    });

    return NextResponse.json(turmaDisciplina, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
