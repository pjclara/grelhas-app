import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { construirResumoPeriodo } from '@/lib/resumo';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; periodoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const resumo = await construirResumoPeriodo(params.turmaId, params.periodoId);
    return NextResponse.json(resumo);
  } catch (error) {
    return handleApiError(error);
  }
}
