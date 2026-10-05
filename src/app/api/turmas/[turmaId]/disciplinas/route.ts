import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { turmaDisciplinaSchema } from '@/lib/validation';
import { ConflictError, handleApiError, NotFoundError } from '@/lib/api-helpers';

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
 * Associa uma disciplina (do catálogo global) a esta turma. Os critérios de
 * avaliação não são copiados para aqui: aplicam-se por derivação (ano letivo e
 * ciclo da turma + grupo disciplinar da disciplina — ver folhasAplicaveis).
 * A mesma disciplina não pode ser associada duas vezes à mesma turma
 * (garantido por @@unique([turmaId, disciplinaId]) no schema — um pedido
 * duplicado resulta em 409 via handleApiError).
 *
 * Disciplinas SEMESTRAL decorrem no semestre definido no catálogo
 * (Disciplina.semestre) — o período correspondente desta turma é resolvido
 * aqui automaticamente, sem o professor ter de o escolher; disciplinas ANUAL
 * decorrem sempre nos dois períodos da turma.
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

    let periodoId: string | null = null;
    if (disciplina.periodicidade === 'SEMESTRAL') {
      if (!disciplina.semestre) {
        throw new ConflictError(
          'Esta disciplina está marcada como semestral mas não tem semestre definido no catálogo — peça a um administrador para o corrigir em Disciplinas.'
        );
      }
      const periodo = await prisma.periodo.findFirst({ where: { turmaId: params.turmaId, ordem: disciplina.semestre } });
      if (!periodo) throw new NotFoundError('Período correspondente não encontrado nesta turma');
      periodoId = periodo.id;
    }

    const turmaDisciplina = await prisma.turmaDisciplina.create({
      data: { turmaId: params.turmaId, disciplinaId: data.disciplinaId, periodoId },
      include: { disciplina: true, periodo: true },
    });

    return NextResponse.json(turmaDisciplina, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
