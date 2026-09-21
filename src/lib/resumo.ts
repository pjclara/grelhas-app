import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/api-helpers';
import {
  calcularAluno,
  calcularEstatisticasTurma,
  type CriterioCalc,
  type InstrumentoCalc,
  type NotasAluno,
  type ResultadoAluno,
} from '@/lib/calc';

export interface InstrumentoResumo {
  id: string;
  nome: string;
  criterioId: string;
  ordem: number;
}

export interface ResumoPeriodo {
  turma: { id: string; nome: string; disciplina: string; anoLetivo: string; nivelEnsino: string | null };
  periodo: { id: string; nome: string };
  criterios: CriterioCalc[];
  instrumentos: InstrumentoResumo[];
  alunos: Array<{ id: string; numero: number; nome: string }>;
  resultados: ResultadoAluno[];
  estatisticas: ReturnType<typeof calcularEstatisticasTurma>;
}

/**
 * Constrói o resumo de um período para uma disciplina concreta de uma
 * turma. Os critérios/instrumentos são os da TurmaDisciplina; os alunos
 * considerados são apenas os que têm inscrição ativa nessa disciplina
 * (AlunoDisciplina.ativo) e continuam ativos na turma.
 */
export async function construirResumoPeriodo(
  turmaId: string,
  turmaDisciplinaId: string,
  periodoId: string
): Promise<ResumoPeriodo> {
  const turmaDisciplina = await prisma.turmaDisciplina.findFirst({
    where: { id: turmaDisciplinaId, turmaId },
    include: {
      disciplina: true,
      turma: { include: { anoLetivo: true } },
      criterios: { orderBy: { ordem: 'asc' } },
      alunos: {
        where: { ativo: true, aluno: { ativo: true } },
        include: { aluno: true },
      },
    },
  });
  if (!turmaDisciplina) throw new NotFoundError('Disciplina da turma não encontrada');

  const periodo = await prisma.periodo.findFirst({ where: { id: periodoId, turmaId } });
  if (!periodo) throw new NotFoundError('Período não encontrado');

  const matriculas = await prisma.matricula.findMany({
    where: { turmaId, ativa: true },
    select: { alunoId: true, numero: true },
  });
  const numeroPorAluno = new Map(matriculas.map((m) => [m.alunoId, m.numero]));

  const alunos = turmaDisciplina.alunos
    .map((ad) => ad.aluno)
    .sort((a, b) => (numeroPorAluno.get(a.id) ?? 0) - (numeroPorAluno.get(b.id) ?? 0));

  const instrumentosDb = await prisma.instrumento.findMany({
    where: { turmaDisciplinaId, periodoId },
    include: { perguntas: true },
    orderBy: { ordem: 'asc' },
  });

  const instrumentos: InstrumentoCalc[] = instrumentosDb.map((i) => ({
    id: i.id,
    criterioId: i.criterioId,
    periodoId: i.periodoId,
    modo: i.modo,
    escalaMax: i.escalaMax,
    perguntas: i.perguntas.map((p) => ({ id: p.id, valorMax: p.valorMax })),
  }));

  const perguntaIds = instrumentosDb.flatMap((i) => i.perguntas.map((p) => p.id));
  const notasDb = await prisma.nota.findMany({
    where: { perguntaId: { in: perguntaIds }, alunoId: { in: alunos.map((a) => a.id) } },
  });

  const notasPorAluno = new Map<string, NotasAluno>();
  for (const aluno of alunos) notasPorAluno.set(aluno.id, {});
  for (const nota of notasDb) {
    const mapa = notasPorAluno.get(nota.alunoId);
    if (mapa) mapa[nota.perguntaId] = nota.valor;
  }

  const criterios: CriterioCalc[] = turmaDisciplina.criterios;

  const resultados = alunos.map((aluno) =>
    calcularAluno(
      aluno.id,
      periodoId,
      criterios,
      instrumentos,
      notasPorAluno.get(aluno.id) ?? {},
      turmaDisciplina
    )
  );

  const estatisticas = calcularEstatisticasTurma(resultados);

  return {
    turma: {
      id: turmaDisciplina.turma.id,
      nome: turmaDisciplina.turma.nome,
      disciplina: turmaDisciplina.disciplina.nome,
      anoLetivo: turmaDisciplina.turma.anoLetivo.nome,
      nivelEnsino: turmaDisciplina.turma.nivelEnsino,
    },
    periodo: { id: periodo.id, nome: periodo.nome },
    criterios,
    instrumentos: instrumentosDb.map((i) => ({
      id: i.id,
      nome: i.nome,
      criterioId: i.criterioId,
      ordem: i.ordem,
    })),
    alunos: alunos.map((a) => ({ id: a.id, numero: numeroPorAluno.get(a.id) ?? 0, nome: a.nome })),
    resultados,
    estatisticas,
  };
}
