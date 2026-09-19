import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { turmaSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

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

const PERIODOS_PADRAO = [
  { nome: '1.º Semestre', ordem: 1 },
  { nome: '2.º Semestre', ordem: 2 },
];

export async function GET() {
  try {
    const userId = await requireUserId();
    const turmas = await prisma.turma.findMany({
      where: { userId },
      include: { disciplina: true, anoLetivo: true, _count: { select: { alunos: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(turmas);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Cria uma turma já com os critérios de avaliação e períodos "padrão"
 * (réplica dos pesos da grelha original: 45% testes, 30% outros
 * instrumentos, 5x5% atitudes/proatividade). Tudo isto é depois editável em
 * /turmas/[id]/criterios.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const data = turmaSchema.parse(await req.json());

    const turma = await prisma.turma.create({
      data: {
        userId,
        disciplinaId: data.disciplinaId,
        anoLetivoId: data.anoLetivoId,
        nome: data.nome,
        nivelEnsino: data.nivelEnsino ?? null,
        criterios: { create: CRITERIOS_PADRAO },
        periodos: { create: PERIODOS_PADRAO },
      },
      include: { criterios: true, periodos: true },
    });

    return NextResponse.json(turma, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
