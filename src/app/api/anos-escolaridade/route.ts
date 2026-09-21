import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { anoEscolaridadeSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireUserId();
    const anos = await prisma.anoEscolaridade.findMany({
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
    return NextResponse.json(anos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminId();
    const data = anoEscolaridadeSchema.parse(await req.json());
    const ano = await prisma.anoEscolaridade.create({
      data: { nome: data.nome, ordem: data.ordem ?? 0 },
    });
    return NextResponse.json(ano, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
