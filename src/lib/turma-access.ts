import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/api-helpers';

/** Confirma que a turma existe e pertence ao professor autenticado. */
export async function assertTurmaOwnership(turmaId: string, userId: string) {
  const turma = await prisma.turma.findFirst({ where: { id: turmaId, userId } });
  if (!turma) throw new NotFoundError('Turma não encontrada');
  return turma;
}

/**
 * Confirma que a disciplina-na-turma existe, pertence à turma indicada, e
 * que essa turma pertence ao professor autenticado.
 */
export async function assertTurmaDisciplinaOwnership(
  turmaId: string,
  turmaDisciplinaId: string,
  userId: string
) {
  const turmaDisciplina = await prisma.turmaDisciplina.findFirst({
    where: { id: turmaDisciplinaId, turmaId, turma: { userId } },
  });
  if (!turmaDisciplina) throw new NotFoundError('Disciplina da turma não encontrada');
  return turmaDisciplina;
}
