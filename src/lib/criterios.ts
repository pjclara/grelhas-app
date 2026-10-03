import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ConflictError, NotFoundError } from '@/lib/api-helpers';
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

// ---------- Critérios aplicáveis a uma disciplina de uma turma ----------

/**
 * Uma "folha" da árvore de um critério: o nível onde se penduram os
 * instrumentos de avaliação das turmas (o sub-instrumento, se o instrumento de
 * recolha os tiver; senão o próprio instrumento de recolha). É o formato que o
 * resumo, o cálculo e as exportações consomem: `grupo` = nome do critério,
 * `nome` = instrumento de recolha (› sub-instrumento), `peso` = peso efetivo
 * absoluto (0..1) dentro da nota final.
 */
export interface CriterioFolha {
  id: string; // subInstrumentoId ?? instrumentoRecolhaId (ou "criterio:<id>" se o critério não tem instrumentos)
  recolhaId: string | null;
  subId: string | null;
  grupo: string;
  nome: string;
  peso: number;
  ordem: number;
  semInstrumentos?: boolean;
}

interface CriterioComArvore {
  id: string;
  nome: string;
  peso: number;
  instrumentosRecolha: Array<{
    id: string;
    nome: string;
    peso: number | null;
    subInstrumentos: Array<{ id: string; nome: string; peso: number | null }>;
  }>;
}

/** Pesos absolutos dos filhos: os indicados (se todos tiverem) ou a divisão igual do peso do pai. */
function pesosEfetivos(itens: Array<{ peso: number | null }>, totalPai: number): number[] {
  const todosComPeso = itens.length > 0 && itens.every((i) => i.peso !== null);
  return itens.map((i) => (todosComPeso ? (i.peso as number) : totalPai / itens.length));
}

export function folhasDeCriterios(criterios: CriterioComArvore[]): CriterioFolha[] {
  const folhas: CriterioFolha[] = [];
  const proxima = () => folhas.length;

  for (const c of criterios) {
    if (c.instrumentosRecolha.length === 0) {
      // Sem instrumentos não há onde lançar notas: a folha-reserva impede que a
      // nota final saia calculada sem este critério.
      folhas.push({
        id: `criterio:${c.id}`,
        recolhaId: null,
        subId: null,
        grupo: c.nome,
        nome: 'Sem instrumentos de recolha definidos',
        peso: c.peso,
        ordem: proxima(),
        semInstrumentos: true,
      });
      continue;
    }
    const pesosRecolha = pesosEfetivos(c.instrumentosRecolha, c.peso);
    c.instrumentosRecolha.forEach((ir, i) => {
      if (ir.subInstrumentos.length === 0) {
        folhas.push({
          id: ir.id,
          recolhaId: ir.id,
          subId: null,
          grupo: c.nome,
          nome: ir.nome,
          peso: pesosRecolha[i],
          ordem: proxima(),
        });
        return;
      }
      const pesosSub = pesosEfetivos(ir.subInstrumentos, pesosRecolha[i]);
      ir.subInstrumentos.forEach((s, j) => {
        folhas.push({
          id: s.id,
          recolhaId: ir.id,
          subId: s.id,
          grupo: c.nome,
          nome: `${ir.nome} › ${s.nome}`,
          peso: pesosSub[j],
          ordem: proxima(),
        });
      });
    });
  }
  return folhas;
}

/**
 * Critérios que se aplicam a uma disciplina de uma turma: os do ano letivo e
 * ciclo da turma que são GERAIS ou específicos do grupo disciplinar da
 * disciplina. Turma sem ciclo definido → nenhum critério.
 */
export async function folhasAplicaveis(turmaDisciplinaId: string): Promise<CriterioFolha[]> {
  const td = await prisma.turmaDisciplina.findUnique({
    where: { id: turmaDisciplinaId },
    select: {
      turma: { select: { anoLetivoId: true, cicloId: true } },
      disciplina: { select: { grupoDisciplinarId: true } },
    },
  });
  if (!td || !td.turma.cicloId) return [];

  const grupoId = td.disciplina.grupoDisciplinarId;
  const criterios = await prisma.criterio.findMany({
    where: {
      anoLetivoId: td.turma.anoLetivoId,
      cicloId: td.turma.cicloId,
      OR: [{ tipo: 'GERAL' }, ...(grupoId ? [{ tipo: 'ESPECIFICO' as const, grupoDisciplinarId: grupoId }] : [])],
    },
    orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
    include: criterioInclude,
  });
  return folhasDeCriterios(criterios);
}

/** Resolve o `criterioId` enviado pelo cliente (id de uma folha) ou lança 404. */
export function resolverFolha(folhas: CriterioFolha[], criterioId: string): CriterioFolha {
  const folha = folhas.find((f) => f.id === criterioId && !f.semInstrumentos);
  if (!folha || !folha.recolhaId) throw new NotFoundError('Critério não encontrado para esta disciplina');
  return folha;
}

/** Acrescenta a cada instrumento o `criterioId` (folha) e o `criterio` correspondente. */
export function comCriterio<T extends { instrumentoRecolhaId: string; subInstrumentoId: string | null }>(
  instrumentos: T[],
  folhas: CriterioFolha[]
) {
  const porId = new Map(folhas.map((f) => [f.id, f]));
  return instrumentos.map((i) => {
    const criterioId = i.subInstrumentoId ?? i.instrumentoRecolhaId;
    return { ...i, criterioId, criterio: porId.get(criterioId) };
  });
}

// ---------- Edição e remoção de critérios em uso ----------

/** Quantos instrumentos de turmas usam (direta ou indiretamente) este critério. */
export async function contarInstrumentosEmUso(criterioId: string) {
  return prisma.instrumento.count({ where: { instrumentoRecolha: { criterioId } } });
}

/**
 * Atualiza um critério e a sua árvore preservando os ids (e portanto os
 * instrumentos e notas dos professores que apontam para eles). Itens com `id`
 * são atualizados, sem `id` são criados, e os que deixam de vir são apagados.
 * Lança ConflictError se a alteração afetar instrumentos já em uso.
 */
export async function atualizarCriterio(criterioId: string, data: CriterioInput) {
  const existente = await prisma.criterio.findUnique({
    where: { id: criterioId },
    include: { instrumentosRecolha: { include: { subInstrumentos: true } } },
  });
  if (!existente) throw new NotFoundError('Critério não encontrado');

  const emUso = await prisma.instrumento.findMany({
    where: { instrumentoRecolha: { criterioId } },
    select: { instrumentoRecolhaId: true, subInstrumentoId: true },
  });
  const recolhasEmUso = new Set(emUso.map((i) => i.instrumentoRecolhaId));
  const subsEmUso = new Set(emUso.map((i) => i.subInstrumentoId).filter((x): x is string => x !== null));
  const recolhasComDiretos = new Set(
    emUso.filter((i) => i.subInstrumentoId === null).map((i) => i.instrumentoRecolhaId)
  );

  const grupoNovo = data.tipo === 'ESPECIFICO' ? data.grupoDisciplinarId ?? null : null;
  const mudouAmbito =
    existente.anoLetivoId !== data.anoLetivoId ||
    existente.cicloId !== data.cicloId ||
    existente.tipo !== data.tipo ||
    existente.grupoDisciplinarId !== grupoNovo;
  if (emUso.length > 0 && mudouAmbito) {
    throw new ConflictError(
      `Este critério está em uso por ${emUso.length} instrumento(s) de turmas: não é possível alterar o ano letivo, o ciclo ou o âmbito.`
    );
  }

  const recolhasExistentes = new Map(existente.instrumentosRecolha.map((r) => [r.id, r]));
  const subsExistentes = new Set(existente.instrumentosRecolha.flatMap((r) => r.subInstrumentos.map((s) => s.id)));
  const recolhasRecebidas = new Set<string>();
  const subsRecebidos = new Set<string>();

  for (const ir of data.instrumentosRecolha) {
    if (ir.id) {
      const antes = recolhasExistentes.get(ir.id);
      if (!antes) throw new NotFoundError('Instrumento de recolha inválido');
      recolhasRecebidas.add(ir.id);
      if (antes.subInstrumentos.length === 0 && ir.subInstrumentos.length > 0 && recolhasComDiretos.has(ir.id)) {
        throw new ConflictError(
          `O instrumento "${ir.nome}" já tem instrumentos de turmas associados diretamente: não é possível passar a ter sub-instrumentos.`
        );
      }
    }
    for (const s of ir.subInstrumentos) {
      if (!s.id) continue;
      if (!subsExistentes.has(s.id)) throw new NotFoundError('Sub-instrumento inválido');
      subsRecebidos.add(s.id);
    }
  }

  const recolhasRemovidas = existente.instrumentosRecolha.filter((r) => !recolhasRecebidas.has(r.id));
  const subsRemovidos = existente.instrumentosRecolha
    .flatMap((r) => r.subInstrumentos)
    .filter((s) => !subsRecebidos.has(s.id));
  const emUsoRemovido =
    recolhasRemovidas.find((r) => recolhasEmUso.has(r.id))?.nome ??
    subsRemovidos.find((s) => subsEmUso.has(s.id))?.nome;
  if (emUsoRemovido) {
    throw new ConflictError(`"${emUsoRemovido}" está em uso por instrumentos de turmas e não pode ser removido.`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.subInstrumento.deleteMany({ where: { id: { in: subsRemovidos.map((s) => s.id) } } });
    await tx.instrumentoRecolha.deleteMany({ where: { id: { in: recolhasRemovidas.map((r) => r.id) } } });

    await tx.criterio.update({
      where: { id: criterioId },
      data: {
        anoLetivoId: data.anoLetivoId,
        cicloId: data.cicloId,
        nome: data.nome,
        peso: data.peso,
        tipo: data.tipo,
        grupoDisciplinarId: grupoNovo,
      },
    });

    for (const [i, ir] of data.instrumentosRecolha.entries()) {
      const recolha = ir.id
        ? await tx.instrumentoRecolha.update({
            where: { id: ir.id },
            data: { nome: ir.nome, peso: ir.peso ?? null, ordem: i },
          })
        : await tx.instrumentoRecolha.create({
            data: { criterioId, nome: ir.nome, peso: ir.peso ?? null, ordem: i },
          });
      for (const [j, s] of ir.subInstrumentos.entries()) {
        if (s.id) {
          await tx.subInstrumento.update({
            where: { id: s.id },
            data: { instrumentoRecolhaId: recolha.id, nome: s.nome, peso: s.peso ?? null, ordem: j },
          });
        } else {
          await tx.subInstrumento.create({
            data: { instrumentoRecolhaId: recolha.id, nome: s.nome, peso: s.peso ?? null, ordem: j },
          });
        }
      }
    }

    return tx.criterio.findUniqueOrThrow({ where: { id: criterioId }, include: criterioInclude });
  });
}
