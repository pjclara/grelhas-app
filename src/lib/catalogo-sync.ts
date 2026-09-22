import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Propaga uma criação/alteração de InstrumentoAvaliacao (catálogo global)
 * a todas as TurmaDisciplina já existentes da mesma disciplina/ano letivo:
 * ativa o TurmaDisciplinaInstrumento se ainda não existir, ou atualiza o
 * peso se já existir — mesmo que o peso tenha sido editado manualmente na
 * turma, para o catálogo continuar a ser a fonte de verdade. Também
 * desativa (remove) o TurmaDisciplinaInstrumento nas turmas cuja disciplina
 * deixou de ter peso definido para este instrumento — remoção que, tal como
 * a remoção manual em `/criterios`, apaga em cascata os Instrumento/Notas
 * associados.
 */
export async function sincronizarAtivacoesInstrumento(
  tx: Tx,
  grupoId: string,
  instrumentoAvaliacaoId: string,
  pesos: { disciplinaId: string; peso: number }[]
) {
  const grupo = await tx.grupoAvaliacao.findFirst({ where: { id: grupoId }, select: { anoLetivoId: true } });
  if (!grupo) return;

  for (const { disciplinaId, peso } of pesos) {
    const turmaDisciplinas = await tx.turmaDisciplina.findMany({
      where: { disciplinaId, turma: { anoLetivoId: grupo.anoLetivoId } },
      select: { id: true, _count: { select: { criterios: true } } },
    });

    for (const td of turmaDisciplinas) {
      const existente = await tx.turmaDisciplinaInstrumento.findUnique({
        where: {
          turmaDisciplinaId_instrumentoAvaliacaoId: { turmaDisciplinaId: td.id, instrumentoAvaliacaoId },
        },
      });
      if (existente) {
        if (existente.peso !== peso) {
          await tx.turmaDisciplinaInstrumento.update({ where: { id: existente.id }, data: { peso } });
        }
      } else {
        await tx.turmaDisciplinaInstrumento.create({
          data: { turmaDisciplinaId: td.id, instrumentoAvaliacaoId, peso, ordem: td._count.criterios },
        });
      }
    }
  }

  const disciplinaIds = pesos.map((p) => p.disciplinaId);
  await tx.turmaDisciplinaInstrumento.deleteMany({
    where: {
      instrumentoAvaliacaoId,
      turmaDisciplina: disciplinaIds.length > 0 ? { disciplinaId: { notIn: disciplinaIds } } : {},
    },
  });
}
