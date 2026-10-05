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

/**
 * Confirma que o período indicado é um em que esta disciplina pode ter
 * instrumentos/notas: qualquer um, se a disciplina for ANUAL
 * (`turmaDisciplina.periodoId` nulo); só o período fixado no catálogo, se for
 * SEMESTRAL. Usar sempre que um pedido referir um `periodoId` para uma
 * disciplina-na-turma (criar/editar instrumento, grelhas de notas).
 */
export function assertPeriodoDaDisciplina(
  turmaDisciplina: { periodoId: string | null },
  periodoId: string
) {
  if (turmaDisciplina.periodoId && turmaDisciplina.periodoId !== periodoId) {
    throw new NotFoundError('Esta disciplina é semestral e não decorre neste período');
  }
}
