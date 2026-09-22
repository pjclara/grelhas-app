import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

/**
 * Lista os InstrumentoAvaliacao do catálogo (do ano letivo da turma) ainda
 * não ativados nesta turma+disciplina — usada para o professor escolher o
 * que ativar, um a um, em /criterios.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    const turmaDisciplina = await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);

    const turma = await prisma.turma.findFirst({
      where: { id: params.turmaId },
      select: { anoLetivoId: true },
    });
    if (!turma) throw new NotFoundError('Turma não encontrada');

    const ativos = await prisma.turmaDisciplinaInstrumento.findMany({
      where: { turmaDisciplinaId: params.turmaDisciplinaId },
      select: { instrumentoAvaliacaoId: true },
    });
    const idsAtivos = new Set(ativos.map((a) => a.instrumentoAvaliacaoId));

    const grupos = await prisma.grupoAvaliacao.findMany({
      where: { anoLetivoId: turma.anoLetivoId },
      orderBy: { ordem: 'asc' },
      include: {
        instrumentos: {
          orderBy: { ordem: 'asc' },
          include: { pesos: { where: { disciplinaId: turmaDisciplina.disciplinaId } } },
        },
      },
    });

    const disponiveis = grupos.flatMap((g) =>
      g.instrumentos
        .filter((inst) => !idsAtivos.has(inst.id))
        .map((inst) => ({
          instrumentoAvaliacaoId: inst.id,
          grupo: g.nome,
          nome: inst.nome,
          pesoCatalogo: inst.pesos[0]?.peso ?? null,
        }))
    );

    return NextResponse.json(disponiveis);
  } catch (error) {
    return handleApiError(error);
  }
}
