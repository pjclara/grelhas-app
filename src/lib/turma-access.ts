import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/api-helpers';

/** Confirma que a turma existe e pertence ao professor autenticado. */
export async function assertTurmaOwnership(turmaId: string, userId: string) {
  const turma = await prisma.turma.findFirst({ where: { id: turmaId, userId } });
  if (!turma) throw new NotFoundError('Turma não encontrada');
  return turma;
}
