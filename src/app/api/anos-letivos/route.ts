import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { anoLetivoSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireUserId();
    const anos = await prisma.anoLetivo.findMany({
      orderBy: { nome: 'desc' },
    });
    return NextResponse.json(anos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminId();
    const data = anoLetivoSchema.parse(await req.json());
    const ano = await prisma.anoLetivo.create({
      data: { nome: data.nome },
    });
    return NextResponse.json(ano, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
