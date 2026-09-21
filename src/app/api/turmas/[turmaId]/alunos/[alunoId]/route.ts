import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { alunoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

const INCLUDE = {
  medidas: { include: { medida: true as const } },
};

async function matriculaAtiva(alunoId: string, turmaId: string) {
  const matricula = await prisma.matricula.findFirst({
    where: { alunoId, turmaId, ativa: true },
  });
  if (!matricula) throw new NotFoundError('Aluno não encontrado nesta turma');
  return matricula;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { turmaId: string; alunoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const matricula = await matriculaAtiva(params.alunoId, params.turmaId);
    const { medidaIds, numero, ...data } = alunoSchema.partial().parse(await req.json());

    const aluno = await prisma.$transaction(async (tx) => {
      if (medidaIds) {
        await tx.alunoMedida.deleteMany({ where: { alunoId: params.alunoId } });
      }
      if (numero !== undefined) {
        await tx.matricula.update({ where: { id: matricula.id }, data: { numero } });
      }
      return tx.aluno.update({
        where: { id: params.alunoId },
        data: {
          ...data,
          ...(medidaIds ? { medidas: { create: medidaIds.map((medidaId) => ({ medidaId })) } } : {}),
        },
        include: INCLUDE,
      });
    });
    return NextResponse.json({ ...aluno, numero: numero ?? matricula.numero });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { turmaId: string; alunoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    await matriculaAtiva(params.alunoId, params.turmaId);
    await prisma.aluno.delete({ where: { id: params.alunoId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
