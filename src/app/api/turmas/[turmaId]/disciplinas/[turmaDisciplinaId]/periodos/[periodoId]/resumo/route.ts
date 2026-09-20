import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { construirResumoPeriodo } from '@/lib/resumo';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; periodoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const resumo = await construirResumoPeriodo(params.turmaId, params.turmaDisciplinaId, params.periodoId);
    return NextResponse.json(resumo);
  } catch (error) {
    return handleApiError(error);
  }
}
