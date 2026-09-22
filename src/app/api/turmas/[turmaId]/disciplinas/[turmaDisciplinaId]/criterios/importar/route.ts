import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';
import { criterioInclude, paraCriterioDTO } from '@/lib/criterio-dto';

/**
 * Ativa, para esta turma+disciplina, todos os InstrumentoAvaliacao do
 * catálogo global (GrupoAvaliacao/InstrumentoAvaliacao) do ano letivo da
 * turma que tenham peso definido para a disciplina em causa e ainda não
 * estejam ativos aqui.
 */
export async function POST(
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

    const existentes = await prisma.turmaDisciplinaInstrumento.findMany({
      where: { turmaDisciplinaId: params.turmaDisciplinaId },
      select: { instrumentoAvaliacaoId: true },
    });
    const idsExistentes = new Set(existentes.map((c) => c.instrumentoAvaliacaoId));

    const paraCriar: { turmaDisciplinaId: string; instrumentoAvaliacaoId: string; peso: number; ordem: number }[] = [];
    let ordem = existentes.length;
    for (const g of grupos) {
      for (const inst of g.instrumentos) {
        const peso = inst.pesos[0]?.peso;
        if (peso === undefined) continue;
        if (idsExistentes.has(inst.id)) continue;
        paraCriar.push({
          turmaDisciplinaId: params.turmaDisciplinaId,
          instrumentoAvaliacaoId: inst.id,
          peso,
          ordem: ordem++,
        });
      }
    }

    if (paraCriar.length > 0) {
      await prisma.turmaDisciplinaInstrumento.createMany({ data: paraCriar });
    }

    const criterios = await prisma.turmaDisciplinaInstrumento.findMany({
      where: { turmaDisciplinaId: params.turmaDisciplinaId },
      orderBy: { ordem: 'asc' },
      include: criterioInclude,
    });
    return NextResponse.json({ importados: paraCriar.length, criterios: criterios.map(paraCriterioDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}
