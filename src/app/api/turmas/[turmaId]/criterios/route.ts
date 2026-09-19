import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { criterioSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const criterios = await prisma.criterio.findMany({
      where: { turmaId: params.turmaId },
      orderBy: { ordem: 'asc' },
    });
    return NextResponse.json(criterios);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = criterioSchema.parse(await req.json());
    const criterio = await prisma.criterio.create({
      data: { turmaId: params.turmaId, ...data },
    });
    return NextResponse.json(criterio, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
