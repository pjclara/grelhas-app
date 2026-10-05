import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/api-helpers';
import { folhasAplicaveis, type CriterioFolha } from '@/lib/criterios';

/** Escala fixa das grelhas: cada célula é uma nota de 1 a ESCALA_GRELHA. */
export const ESCALA_GRELHA = 5;

export interface GrelhaDTO {
  chave: string;
  nome: string;
  periodo: { id: string; nome: string };
  /** Ocorrência (repetição) mostrada, e todas as que existem neste período (sempre inclui a pedida). */
  ocorrencia: number;
  ocorrencias: number[];
  /** Data da avaliação desta ocorrência (ISO), ou null se ainda não foi gravada nenhuma nota. */
  data: string | null;
  escalaMax: number;
  colunas: Array<{ id: string; nome: string; peso: number; pesoDefinido: boolean }>;
  alunos: Array<{ id: string; numero: number; nome: string }>;
  /** notas[alunoId][colunaId] = valor | null (por lançar) */
  notas: Record<string, Record<string, number | null>>;
}

async function contexto(turmaId: string, turmaDisciplinaId: string, periodoId: string, chave: string) {
  const periodo = await prisma.periodo.findFirst({ where: { id: periodoId, turmaId } });
  if (!periodo) throw new NotFoundError('Período não encontrado');

  const colunas = (await folhasAplicaveis(turmaDisciplinaId)).filter(
    (f) => f.avaliacao === 'GRELHA' && f.bloco === chave
  );
  if (colunas.length === 0) throw new NotFoundError('Grelha não encontrada para esta disciplina');

  const turmaDisciplina = await prisma.turmaDisciplina.findFirst({
    where: { id: turmaDisciplinaId, turmaId },
    include: { alunos: { where: { ativo: true, aluno: { ativo: true } }, include: { aluno: true } } },
  });
  if (!turmaDisciplina) throw new NotFoundError('Disciplina da turma não encontrada');

  const matriculas = await prisma.matricula.findMany({
    where: { turmaId, ativa: true },
    select: { alunoId: true, numero: true },
  });
  const numeroPorAluno = new Map(matriculas.map((m) => [m.alunoId, m.numero]));
  const alunos = turmaDisciplina.alunos
    .map((ad) => ({ id: ad.aluno.id, numero: numeroPorAluno.get(ad.aluno.id) ?? 0, nome: ad.aluno.nome }))
    .sort((a, b) => a.numero - b.numero);

  return { periodo, colunas, alunos };
}

/** O instrumento (ESCALA, uma pergunta) que guarda as notas de uma coluna da grelha, se já existir. */
function instrumentoDaColuna<T extends { instrumentoRecolhaId: string; subInstrumentoId: string | null }>(
  instrumentos: T[],
  coluna: CriterioFolha
) {
  return instrumentos.find((i) => (i.subInstrumentoId ?? i.instrumentoRecolhaId) === coluna.id);
}

export async function carregarGrelha(
  turmaId: string,
  turmaDisciplinaId: string,
  periodoId: string,
  chave: string,
  ocorrencia = 1
): Promise<GrelhaDTO> {
  const { periodo, colunas, alunos } = await contexto(turmaId, turmaDisciplinaId, periodoId, chave);

  const instrumentos = await prisma.instrumento.findMany({
    where: {
      turmaDisciplinaId,
      periodoId,
      instrumentoRecolhaId: { in: colunas.map((c) => c.recolhaId as string) },
    },
    include: { perguntas: { orderBy: { ordem: 'asc' }, include: { notas: true } } },
  });
  const ocorrencias = Array.from(new Set([1, ocorrencia, ...instrumentos.map((i) => i.ocorrencia)])).sort(
    (a, b) => a - b
  );
  const daOcorrencia = instrumentos.filter((i) => i.ocorrencia === ocorrencia);

  const notas: GrelhaDTO['notas'] = {};
  for (const aluno of alunos) notas[aluno.id] = {};
  for (const coluna of colunas) {
    const pergunta = instrumentoDaColuna(daOcorrencia, coluna)?.perguntas[0];
    for (const aluno of alunos) {
      const nota = pergunta?.notas.find((n) => n.alunoId === aluno.id);
      notas[aluno.id][coluna.id] = nota?.valor ?? null;
    }
  }

  return {
    chave,
    nome: colunas[0].blocoNome,
    periodo: { id: periodo.id, nome: periodo.nome },
    ocorrencia,
    ocorrencias,
    data: daOcorrencia[0]?.data.toISOString() ?? null,
    escalaMax: ESCALA_GRELHA,
    colunas: colunas.map((c) => ({ id: c.id, nome: c.nome, peso: c.peso, pesoDefinido: c.pesoDefinido })),
    alunos,
    notas,
  };
}

/**
 * Grava notas da grelha. Cada coluna é guardada num Instrumento (modo ESCALA,
 * uma pergunta "Nota"), criado na primeira nota lançada nessa coluna e período,
 * com a data de avaliação indicada (obrigatória, igual para todas as colunas
 * desta ocorrência). Se a data mudar numa gravação seguinte, atualiza-se nos
 * instrumentos já criados desta ocorrência. Só aceita alunos inscritos nesta
 * disciplina e colunas desta grelha.
 */
export async function gravarGrelha(
  turmaId: string,
  turmaDisciplinaId: string,
  periodoId: string,
  chave: string,
  notas: Record<string, Record<string, number | null>>,
  dataAvaliacao: string,
  ocorrencia = 1
) {
  const { colunas, alunos } = await contexto(turmaId, turmaDisciplinaId, periodoId, chave);
  const alunoIds = new Set(alunos.map((a) => a.id));
  const colunaPorId = new Map(colunas.map((c) => [c.id, c]));

  for (const [alunoId, porColuna] of Object.entries(notas)) {
    if (!alunoIds.has(alunoId)) throw new NotFoundError('Aluno não inscrito nesta disciplina');
    for (const colunaId of Object.keys(porColuna)) {
      if (!colunaPorId.has(colunaId)) throw new NotFoundError('Coluna inexistente nesta grelha');
    }
  }

  const colunasComNotas = colunas.filter((c) =>
    Object.values(notas).some((porColuna) => porColuna[c.id] !== undefined && porColuna[c.id] !== null)
  );
  const dataDate = new Date(dataAvaliacao);

  return prisma.$transaction(async (tx) => {
    const existentes = await tx.instrumento.findMany({
      where: {
        turmaDisciplinaId,
        periodoId,
        ocorrencia,
        instrumentoRecolhaId: { in: colunas.map((c) => c.recolhaId as string) },
      },
      include: { perguntas: { orderBy: { ordem: 'asc' } } },
    });

    const perguntaPorColuna = new Map<string, string>();
    for (const coluna of colunas) {
      const existente = instrumentoDaColuna(existentes, coluna);
      if (existente?.perguntas[0]) {
        perguntaPorColuna.set(coluna.id, existente.perguntas[0].id);
        if (existente.data.getTime() !== dataDate.getTime()) {
          await tx.instrumento.update({ where: { id: existente.id }, data: { data: dataDate } });
        }
      } else if (colunasComNotas.includes(coluna)) {
        const criado = await tx.instrumento.create({
          data: {
            turmaDisciplinaId,
            periodoId,
            instrumentoRecolhaId: coluna.recolhaId as string,
            subInstrumentoId: coluna.subId,
            nome: ocorrencia > 1 ? `${coluna.nome} (${ocorrencia})` : coluna.nome,
            ocorrencia,
            data: dataDate,
            modo: 'ESCALA',
            escalaMax: ESCALA_GRELHA,
            ordem: coluna.ordem,
            perguntas: { create: [{ codigo: 'Nota', valorMax: ESCALA_GRELHA, ordem: 0 }] },
          },
          include: { perguntas: true },
        });
        perguntaPorColuna.set(coluna.id, criado.perguntas[0].id);
      }
    }

    let gravadas = 0;
    for (const [alunoId, porColuna] of Object.entries(notas)) {
      for (const [colunaId, valor] of Object.entries(porColuna)) {
        const perguntaId = perguntaPorColuna.get(colunaId);
        if (!perguntaId) continue; // coluna sem instrumento e sem nada para gravar
        await tx.nota.upsert({
          where: { perguntaId_alunoId: { perguntaId, alunoId } },
          update: { valor },
          create: { perguntaId, alunoId, valor },
        });
        gravadas++;
      }
    }
    return gravadas;
  });
}
