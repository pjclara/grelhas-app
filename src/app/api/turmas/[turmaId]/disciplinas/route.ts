import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { turmaDisciplinaSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

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
 * critérios de avaliação ativados a partir do catálogo global (todo
 * InstrumentoAvaliacao do ano letivo da turma que tenha peso definido para
 * esta disciplina — ver GrupoAvaliacao/InstrumentoAvaliacao/InstrumentoPeso).
 * A mesma disciplina não pode ser associada duas vezes à mesma turma
 * (garantido por @@unique([turmaId, disciplinaId]) no schema — um pedido
 * duplicado resulta em 409 via handleApiError).
 */
export async function POST(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    const turma = await assertTurmaOwnership(params.turmaId, userId);
    const data = turmaDisciplinaSchema.parse(await req.json());

    const disciplina = await prisma.disciplina.findFirst({
      where: { id: data.disciplinaId },
    });
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');

    const grupos = await prisma.grupoAvaliacao.findMany({
      where: { anoLetivoId: turma.anoLetivoId },
      orderBy: { ordem: 'asc' },
      include: {
        instrumentos: {
          orderBy: { ordem: 'asc' },
          include: { pesos: { where: { disciplinaId: data.disciplinaId } } },
        },
      },
    });

    const criteriosParaAtivar: { instrumentoAvaliacaoId: string; peso: number; ordem: number }[] = [];
    let ordem = 0;
    for (const g of grupos) {
      for (const inst of g.instrumentos) {
        const peso = inst.pesos[0]?.peso;
        if (peso === undefined) continue;
        criteriosParaAtivar.push({ instrumentoAvaliacaoId: inst.id, peso, ordem: ordem++ });
      }
    }

    const turmaDisciplina = await prisma.turmaDisciplina.create({
      data: {
        turmaId: params.turmaId,
        disciplinaId: data.disciplinaId,
        criterios: { create: criteriosParaAtivar },
      },
      include: { disciplina: true, criterios: true },
    });

    return NextResponse.json(turmaDisciplina, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
