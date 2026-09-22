import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { turmaLimiaresSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';
import { criterioInclude, paraCriterioDTO } from '@/lib/criterio-dto';

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const turmaDisciplina = await prisma.turmaDisciplina.findUnique({
      where: { id: params.turmaDisciplinaId },
      include: {
        disciplina: true,
        criterios: { orderBy: { ordem: 'asc' }, include: criterioInclude },
        alunos: { include: { aluno: true } },
      },
    });
    if (!turmaDisciplina) {
      return NextResponse.json(turmaDisciplina);
    }
    return NextResponse.json({ ...turmaDisciplina, criterios: turmaDisciplina.criterios.map(paraCriterioDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const data = turmaLimiaresSchema.partial().parse(await req.json());
    const turmaDisciplina = await prisma.turmaDisciplina.update({
      where: { id: params.turmaDisciplinaId },
      data,
    });
    return NextResponse.json(turmaDisciplina);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Remove a disciplina da turma — apaga em cascata critérios, instrumentos, notas e inscrições (AlunoDisciplina) dessa disciplina. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    await prisma.turmaDisciplina.delete({ where: { id: params.turmaDisciplinaId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
