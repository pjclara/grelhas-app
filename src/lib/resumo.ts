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

export interface ResumoPeriodo {
  turma: { id: string; nome: string; disciplina: string; anoLetivo: string; nivelEnsino: string | null };
  periodo: { id: string; nome: string };
  criterios: CriterioCalc[];
  alunos: Array<{ id: string; numero: number; nome: string }>;
  resultados: ResultadoAluno[];
  estatisticas: ReturnType<typeof calcularEstatisticasTurma>;
}

export async function construirResumoPeriodo(
  turmaId: string,
  periodoId: string
): Promise<ResumoPeriodo> {
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    include: {
      disciplina: true,
      anoLetivo: true,
      alunos: { where: { ativo: true }, orderBy: { numero: 'asc' } },
      criterios: { orderBy: { ordem: 'asc' } },
    },
  });
  if (!turma) throw new NotFoundError('Turma não encontrada');

  const periodo = await prisma.periodo.findFirst({ where: { id: periodoId, turmaId } });
  if (!periodo) throw new NotFoundError('Período não encontrado');

  const instrumentosDb = await prisma.instrumento.findMany({
    where: { turmaId, periodoId },
    include: { perguntas: true },
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
    where: { perguntaId: { in: perguntaIds }, alunoId: { in: turma.alunos.map((a) => a.id) } },
  });

  const notasPorAluno = new Map<string, NotasAluno>();
  for (const aluno of turma.alunos) notasPorAluno.set(aluno.id, {});
  for (const nota of notasDb) {
    const mapa = notasPorAluno.get(nota.alunoId);
    if (mapa) mapa[nota.perguntaId] = nota.valor;
  }

  const criterios: CriterioCalc[] = turma.criterios;

  const resultados = turma.alunos.map((aluno) =>
    calcularAluno(
      aluno.id,
      periodoId,
      criterios,
      instrumentos,
      notasPorAluno.get(aluno.id) ?? {},
      turma
    )
  );

  const estatisticas = calcularEstatisticasTurma(resultados);

  return {
    turma: {
      id: turma.id,
      nome: turma.nome,
      disciplina: turma.disciplina.nome,
      anoLetivo: turma.anoLetivo.nome,
      nivelEnsino: turma.nivelEnsino,
    },
    periodo: { id: periodo.id, nome: periodo.nome },
    criterios,
    alunos: turma.alunos.map((a) => ({ id: a.id, numero: a.numero, nome: a.nome })),
    resultados,
    estatisticas,
  };
}
