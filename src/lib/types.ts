export const NIVEIS_ENSINO = ['2.º ciclo', '3.º ciclo', 'Secundário'] as const;
export type NivelEnsino = (typeof NIVEIS_ENSINO)[number];

/**
 * Devolve o ano letivo corrente em Portugal (ex.: "2026/2027"), assumindo que
 * decorre de setembro a agosto. Serve apenas como valor por omissão sugerido
 * ao criar uma turma — o utilizador pode sempre escolher ou criar outro.
 */
export function anoLetivoAtual(hoje: Date = new Date()): string {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1; // 1-12
  return mes >= 9 ? `${ano}/${ano + 1}` : `${ano - 1}/${ano}`;
}

export interface Disciplina {
  id: string;
  nome: string;
  ciclo: string | null;
  _count?: { turmas: number };
}

export interface AnoLetivo {
  id: string;
  nome: string;
}

export interface Turma {
  id: string;
  nome: string;
  nivelEnsino: string | null;
  disciplina: Disciplina;
  anoLetivo: AnoLetivo;
  limiarNivel2: number;
  limiarNivel3: number;
  limiarNivel4: number;
  limiarNivel5: number;
  _count?: { alunos: number };
}

export interface Aluno {
  id: string;
  numero: number;
  nome: string;
  medidas: string | null;
  aliena: string | null;
  ativo: boolean;
}

export interface Periodo {
  id: string;
  nome: string;
  ordem: number;
}

export interface Criterio {
  id: string;
  grupo: string;
  nome: string;
  peso: number;
  ordem: number;
}

export type ModoAvaliacao = 'PONTOS' | 'ESCALA';

export interface Pergunta {
  id: string;
  codigo: string;
  valorMax: number;
  ordem: number;
  notas?: Array<{ alunoId: string; valor: number | null }>;
}

export interface Instrumento {
  id: string;
  turmaId: string;
  periodoId: string;
  criterioId: string;
  nome: string;
  modo: ModoAvaliacao;
  escalaMax: number;
  unidade: string | null;
  tema: string | null;
  data: string | null;
  ordem: number;
  perguntas: Pergunta[];
  criterio?: Criterio;
  periodo?: Periodo;
}

export interface TurmaDetalhe extends Turma {
  alunos: Aluno[];
  periodos: Periodo[];
  criterios: Criterio[];
}

export interface ResultadoInstrumentoDTO {
  instrumentoId: string;
  percent: number | null;
  soma: number;
  max: number;
}

export interface ResultadoCriterioDTO {
  criterioId: string;
  media: number | null;
}

export interface ResultadoAlunoDTO {
  alunoId: string;
  porInstrumento: ResultadoInstrumentoDTO[];
  porCriterio: ResultadoCriterioDTO[];
  notaFinalPercent: number | null;
  notaFinal20: number | null;
  nivel: 1 | 2 | 3 | 4 | 5 | null;
}

export interface ResumoPeriodoDTO {
  turma: { id: string; nome: string; disciplina: string; anoLetivo: string; nivelEnsino: string | null };
  periodo: { id: string; nome: string };
  criterios: Criterio[];
  alunos: Array<{ id: string; numero: number; nome: string }>;
  resultados: ResultadoAlunoDTO[];
  estatisticas: {
    mediaTurma20: number | null;
    percentNegativas: number | null;
    contagemPorNivel: Record<1 | 2 | 3 | 4 | 5, number>;
    totalComNota: number;
  };
}
