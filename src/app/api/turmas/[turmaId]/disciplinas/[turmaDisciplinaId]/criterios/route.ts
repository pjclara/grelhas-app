import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { handleApiError } from '@/lib/api-helpers';
import { folhasAplicaveis } from '@/lib/criterios';

/**
 * Critérios aplicáveis a esta disciplina da turma (só leitura): derivam do
 * ano letivo e ciclo da turma e do grupo disciplinar da disciplina — ver
 * folhasAplicaveis em src/lib/criterios.ts. Cada item é uma "folha" (instrumento
 * de recolha ou sub-instrumento) onde se penduram os instrumentos de avaliação.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    return NextResponse.json(await folhasAplicaveis(params.turmaDisciplinaId));
  } catch (error) {
    return handleApiError(error);
  }
}
