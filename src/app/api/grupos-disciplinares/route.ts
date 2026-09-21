import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { grupoDisciplinarSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireUserId();
    const grupos = await prisma.grupoDisciplinar.findMany({
      orderBy: { nome: 'asc' },
    });
    return NextResponse.json(grupos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminId();
    const data = grupoDisciplinarSchema.parse(await req.json());
    const grupo = await prisma.grupoDisciplinar.create({
      data: { nome: data.nome, descricao: data.descricao ?? null },
    });
    return NextResponse.json(grupo, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
