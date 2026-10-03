import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/api-helpers';
import type { criterioSchema } from '@/lib/validation';

export type CriterioInput = z.infer<typeof criterioSchema>;

export const criterioInclude = {
  anoLetivo: true,
  ciclo: true,
  grupoDisciplinar: true,
  instrumentosRecolha: {
    orderBy: { ordem: 'asc' },
    include: { subInstrumentos: { orderBy: { ordem: 'asc' } } },
  },
} satisfies Prisma.CriterioInclude;

/** Confirma que o ano letivo, o ciclo e (se existir) o grupo disciplinar existem. */
export async function validarReferenciasCriterio(data: CriterioInput) {
  const [anoLetivo, ciclo, grupo] = await Promise.all([
    prisma.anoLetivo.findUnique({ where: { id: data.anoLetivoId }, select: { id: true } }),
    prisma.ciclo.findUnique({ where: { id: data.cicloId }, select: { id: true } }),
    data.grupoDisciplinarId
      ? prisma.grupoDisciplinar.findUnique({ where: { id: data.grupoDisciplinarId }, select: { id: true } })
      : Promise.resolve(true),
  ]);
  if (!anoLetivo) throw new NotFoundError('Ano letivo não encontrado');
  if (!ciclo) throw new NotFoundError('Ciclo não encontrado');
  if (!grupo) throw new NotFoundError('Grupo disciplinar não encontrado');
}

/** Já existe um critério com este nome para o mesmo ano letivo, ciclo e grupo (ou geral)? */
export async function existeCriterioComNome(data: CriterioInput, excluirId?: string) {
  const outro = await prisma.criterio.findFirst({
    where: {
      anoLetivoId: data.anoLetivoId,
      cicloId: data.cicloId,
      grupoDisciplinarId: data.grupoDisciplinarId ?? null,
      nome: { equals: data.nome, mode: 'insensitive' },
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { id: true },
  });
  return outro !== null;
}

/** Instrumentos de recolha (+ sub-instrumentos) no formato de criação aninhada do Prisma. */
export function instrumentosRecolhaCreate(
  data: CriterioInput
): Prisma.InstrumentoRecolhaCreateWithoutCriterioInput[] {
  return data.instrumentosRecolha.map((ir, i) => ({
    nome: ir.nome,
    peso: ir.peso ?? null,
    ordem: i,
    subInstrumentos: {
      create: ir.subInstrumentos.map((s, j) => ({ nome: s.nome, peso: s.peso ?? null, ordem: j })),
    },
  }));
}
