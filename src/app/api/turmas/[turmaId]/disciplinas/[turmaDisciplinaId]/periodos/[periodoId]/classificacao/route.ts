import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertPeriodoDaDisciplina, assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { classificacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

export async function PUT(
  req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; periodoId: string } }
) {
  try {
    const userId = await requireUserId();
    const turmaDisciplina = await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    assertPeriodoDaDisciplina(turmaDisciplina, params.periodoId);
    const periodo = await prisma.periodo.findFirst({ where: { id: params.periodoId, turmaId: params.turmaId } });
    if (!periodo) throw new NotFoundError('Período não encontrado');

    const { alunoId, valor } = classificacaoSchema.parse(await req.json());
    const matricula = await prisma.matricula.findFirst({ where: { alunoId, turmaId: params.turmaId } });
    if (!matricula) throw new NotFoundError('Aluno não encontrado nesta turma');

    const chave = { alunoId, turmaDisciplinaId: params.turmaDisciplinaId, periodoId: params.periodoId };
    if (valor == null) {
      await prisma.classificacao.deleteMany({ where: chave });
    } else {
      await prisma.classificacao.upsert({
        where: { alunoId_turmaDisciplinaId_periodoId: chave },
        create: { ...chave, valor },
        update: { valor },
      });
    }
    return NextResponse.json({ alunoId, valor });
  } catch (error) {
    return handleApiError(error);
  }
}
