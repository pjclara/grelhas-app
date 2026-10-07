import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/api-helpers';
import { carregarGrelha } from '@/lib/grelha';
import type { TabelaExport } from '@/lib/export-table';

const GRUPOS_MEDIDAS = [
  { tipo: 'UNIVERSAL' as const, label: 'Universais' },
  { tipo: 'SELETIVA' as const, label: 'Seletivas' },
  { tipo: 'ADICIONAL' as const, label: 'Adicionais' },
];

/** Alunos da turma (ver src/app/turmas/[turmaId]/alunos/page.tsx). */
export async function tabelaAlunosTurma(turmaId: string): Promise<{ nomeBase: string[]; tabela: TabelaExport }> {
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) throw new NotFoundError('Turma não encontrada');

  const matriculas = await prisma.matricula.findMany({
    where: { turmaId, ativa: true },
    orderBy: { numero: 'asc' },
    include: { aluno: { include: { medidas: { include: { medida: true } } } } },
  });

  const linhas = matriculas.map((m) => [
    m.numero,
    m.aluno.numeroProcesso,
    m.aluno.nome,
    ...GRUPOS_MEDIDAS.map((g) =>
      m.aluno.medidas
        .filter((am) => am.medida.tipo === g.tipo)
        .map((am) => am.medida.codigo)
        .join(', ') || '—'
    ),
    m.aluno.ativo ? 'Ativo' : 'Inativo',
  ]);

  return {
    nomeBase: ['Alunos', turma.nome],
    tabela: {
      titulo: `Alunos — Turma ${turma.nome}`,
      cabecalho: ['Nº', 'Nº processo', 'Nome', ...GRUPOS_MEDIDAS.map((g) => g.label), 'Estado'],
      linhas,
      largurasPdf: [28, 70, 170, 90, 90, 90, 60],
      largurasXlsx: [6, 14, 28, 18, 18, 18, 10],
    },
  };
}

/** Inscrições dos alunos da turma numa disciplina (ver .../disciplinas/[turmaDisciplinaId]/alunos/page.tsx). */
export async function tabelaInscricoesDisciplina(
  turmaId: string,
  turmaDisciplinaId: string
): Promise<{ nomeBase: string[]; tabela: TabelaExport }> {
  const turmaDisciplina = await prisma.turmaDisciplina.findUnique({
    where: { id: turmaDisciplinaId },
    include: { disciplina: true, turma: { select: { nome: true } } },
  });
  if (!turmaDisciplina) throw new NotFoundError('Disciplina da turma não encontrada');

  const [matriculas, inscricoes] = await Promise.all([
    prisma.matricula.findMany({
      where: { turmaId, ativa: true },
      orderBy: { numero: 'asc' },
      include: { aluno: true },
    }),
    prisma.alunoDisciplina.findMany({ where: { turmaDisciplinaId }, select: { alunoId: true, ativo: true } }),
  ]);
  const inscritoPorAluno = new Map(inscricoes.map((i) => [i.alunoId, i.ativo]));

  const linhas = matriculas.map((m) => [
    m.numero,
    m.aluno.nome,
    inscritoPorAluno.get(m.alunoId) ? 'Inscrito' : 'Não inscrito',
  ]);

  return {
    nomeBase: ['Inscricoes', turmaDisciplina.turma.nome, turmaDisciplina.disciplina.nome],
    tabela: {
      titulo: `Inscrições — ${turmaDisciplina.disciplina.nome}`,
      subtitulo: `Turma ${turmaDisciplina.turma.nome}`,
      cabecalho: ['Nº', 'Nome', 'Estado'],
      linhas,
      largurasPdf: [28, 220, 100],
      largurasXlsx: [6, 32, 16],
    },
  };
}

/** Grelha de notas de um critério geral/sub-instrumentos (ver .../grelhas/[chave]/page.tsx). */
export async function tabelaGrelha(
  turmaId: string,
  turmaDisciplinaId: string,
  periodoId: string,
  chave: string,
  ocorrencia: number
): Promise<{ nomeBase: string[]; tabela: TabelaExport }> {
  const turmaDisciplina = await prisma.turmaDisciplina.findUnique({
    where: { id: turmaDisciplinaId },
    include: { disciplina: true, turma: { select: { nome: true } } },
  });
  if (!turmaDisciplina) throw new NotFoundError('Disciplina da turma não encontrada');

  const grelha = await carregarGrelha(turmaId, turmaDisciplinaId, periodoId, chave, ocorrencia);

  const linhas = grelha.alunos.map((aluno) => {
    const porColuna = grelha.colunas.map((c) => grelha.notas[aluno.id]?.[c.id] ?? null);
    const comValor = porColuna.filter((v): v is number => v !== null);
    const soma = comValor.length > 0 ? comValor.reduce((acc, v) => acc + v, 0) : null;
    return [aluno.numero, aluno.nome, ...porColuna, soma];
  });

  return {
    nomeBase: ['Grelha', turmaDisciplina.turma.nome, turmaDisciplina.disciplina.nome, grelha.nome],
    tabela: {
      titulo: `${grelha.nome} — ${turmaDisciplina.disciplina.nome}`,
      subtitulo: `Turma ${turmaDisciplina.turma.nome} · ${grelha.periodo.nome}${
        grelha.ocorrencia > 1 ? ` · ${grelha.ocorrencia}.ª avaliação` : ''
      }`,
      cabecalho: ['Nº', 'Nome', ...grelha.colunas.map((c) => c.nome), 'Soma'],
      linhas,
      largurasPdf: [28, 150, ...grelha.colunas.map(() => 90), 50],
      largurasXlsx: [6, 28, ...grelha.colunas.map(() => 18), 10],
    },
  };
}

/** Lançamento de notas por pergunta de um instrumento (ver .../instrumentos/[instrumentoId]/page.tsx). */
export async function tabelaInstrumento(
  turmaId: string,
  turmaDisciplinaId: string,
  instrumentoId: string
): Promise<{ nomeBase: string[]; tabela: TabelaExport }> {
  const [turmaDisciplina, instrumento] = await Promise.all([
    prisma.turmaDisciplina.findUnique({
      where: { id: turmaDisciplinaId },
      include: { disciplina: true, turma: { select: { nome: true } } },
    }),
    prisma.instrumento.findFirst({
      where: { id: instrumentoId, turmaDisciplinaId },
      include: { perguntas: { orderBy: { ordem: 'asc' }, include: { notas: true } } },
    }),
  ]);
  if (!turmaDisciplina) throw new NotFoundError('Disciplina da turma não encontrada');
  if (!instrumento) throw new NotFoundError('Instrumento não encontrado');

  const [matriculas, inscricoes] = await Promise.all([
    prisma.matricula.findMany({
      where: { turmaId, ativa: true },
      orderBy: { numero: 'asc' },
      include: { aluno: true },
    }),
    prisma.alunoDisciplina.findMany({
      where: { turmaDisciplinaId, ativo: true },
      select: { alunoId: true },
    }),
  ]);
  const inscritos = new Set(inscricoes.map((i) => i.alunoId));
  const alunos = matriculas.filter((m) => inscritos.has(m.alunoId) && m.aluno.ativo);

  const maxTotal = instrumento.perguntas.reduce((acc, p) => acc + p.valorMax, 0);
  const linhas = alunos.map((m) => {
    const porPergunta = instrumento.perguntas.map((p) => {
      const nota = p.notas.find((n) => n.alunoId === m.alunoId);
      return nota?.valor ?? null;
    });
    const comValor = porPergunta.filter((v): v is number => v !== null);
    const total = comValor.length > 0 ? `${comValor.reduce((acc, v) => acc + v, 0)}/${maxTotal}` : null;
    return [m.numero, m.aluno.nome, ...porPergunta, total];
  });

  return {
    nomeBase: ['Notas', turmaDisciplina.turma.nome, turmaDisciplina.disciplina.nome, instrumento.nome],
    tabela: {
      titulo: `${instrumento.nome} — ${turmaDisciplina.disciplina.nome}`,
      subtitulo: `Turma ${turmaDisciplina.turma.nome}`,
      cabecalho: ['Nº', 'Nome', ...instrumento.perguntas.map((p) => `${p.codigo} (/${p.valorMax})`), 'Total'],
      linhas,
      largurasPdf: [28, 150, ...instrumento.perguntas.map(() => 70), 60],
      largurasXlsx: [6, 28, ...instrumento.perguntas.map(() => 14), 12],
    },
  };
}
