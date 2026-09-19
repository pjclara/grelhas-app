import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminId } from '@/lib/auth';
import { roleUpdateSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const adminId = await requireAdminId();
    const data = roleUpdateSchema.parse(await req.json());

    if (params.userId === adminId) {
      return NextResponse.json(
        { error: 'Não pode alterar o seu próprio papel. Peça a outro administrador.' },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!target) throw new NotFoundError('Utilizador não encontrado');

    if (target.role === 'ADMIN' && data.role === 'PROFESSOR') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (admins <= 1) {
        return NextResponse.json(
          { error: 'Não é possível remover o último administrador.' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: { role: data.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const adminId = await requireAdminId();

    if (params.userId === adminId) {
      return NextResponse.json({ error: 'Não pode eliminar a sua própria conta.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!target) throw new NotFoundError('Utilizador não encontrado');

    if (target.role === 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (admins <= 1) {
        return NextResponse.json(
          { error: 'Não é possível eliminar o último administrador.' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id: params.userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
