import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { cicloSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireUserId();
    const ciclos = await prisma.ciclo.findMany({
      orderBy: { nome: 'asc' },
    });
    return NextResponse.json(ciclos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminId();
    const data = cicloSchema.parse(await req.json());
    const ciclo = await prisma.ciclo.create({
      data: { nome: data.nome, descricao: data.descricao ?? null },
    });
    return NextResponse.json(ciclo, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
