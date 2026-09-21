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

export interface GrupoDisciplinar {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export interface Ciclo {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export interface AnoEscolaridade {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface DisciplinaCiclo {
  id: string;
  ciclo: Ciclo;
}

export interface DisciplinaAnoEscolaridade {
  id: string;
  anoEscolaridade: AnoEscolaridade;
}

export interface Disciplina {
  id: string;
  nome: string;
  ativo: boolean;
  grupoDisciplinarId: string | null;
  grupoDisciplinar: GrupoDisciplinar | null;
  ciclos: DisciplinaCiclo[];
  anosEscolaridade: DisciplinaAnoEscolaridade[];
  _count?: { turmaDisciplinas: number };
}

export interface AnoLetivo {
  id: string;
  nome: string;
}

export interface Turma {
  id: string;
  nome: string;
  nivelEnsino: string | null;
  anoLetivo: AnoLetivo;
  _count?: { matriculas: number };
  disciplinas?: TurmaDisciplina[];
}

/** Disciplina oferecida por uma turma (associação turma↔disciplina). */
export interface TurmaDisciplina {
  id: string;
  turmaId: string;
  disciplina: Disciplina;
  limiarNivel2: number;
  limiarNivel3: number;
  limiarNivel4: number;
  limiarNivel5: number;
}

export type TipoMedida = 'UNIVERSAL' | 'SELETIVA' | 'ADICIONAL';

export interface Medida {
  id: string;
  tipo: TipoMedida;
  codigo: string;
  titulo: string;
}

export interface AlunoMedida {
  id: string;
  medida: Medida;
}

export interface Aluno {
  id: string;
  numeroProcesso: string;
  nome: string;
  medidas: AlunoMedida[];
  ativo: boolean;
}

/** Aluno tal como devolvido por endpoints que o listam numa turma concreta — inclui o nº dessa matrícula. */
export interface AlunoTurma extends Aluno {
  numero: number;
}

export interface Periodo {
  id: string;
  nome: string;
  ordem: number;
}

export interface InstrumentoPeso {
  id: string;
  disciplinaId: string;
  peso: number;
}

export interface InstrumentoAvaliacao {
  id: string;
  nome: string;
  ordem: number;
  pesos: InstrumentoPeso[];
}

export interface GrupoAvaliacao {
  id: string;
  anoLetivoId: string;
  nome: string;
  ordem: number;
  instrumentos: InstrumentoAvaliacao[];
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
  turmaDisciplinaId: string;
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
  alunos: AlunoTurma[];
  periodos: Periodo[];
  disciplinas: TurmaDisciplina[];
}

/** Aluno inscrito (ou não) numa TurmaDisciplina — usado na gestão de inscrições. */
export interface AlunoDisciplina {
  id: string;
  alunoId: string;
  turmaDisciplinaId: string;
  ativo: boolean;
}

export interface TurmaDisciplinaDetalhe extends TurmaDisciplina {
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

export interface InstrumentoResumoDTO {
  id: string;
  nome: string;
  criterioId: string;
  ordem: number;
}

export interface ResumoPeriodoDTO {
  turma: { id: string; nome: string; disciplina: string; anoLetivo: string; nivelEnsino: string | null };
  periodo: { id: string; nome: string };
  criterios: Criterio[];
  instrumentos: InstrumentoResumoDTO[];
  alunos: Array<{ id: string; numero: number; nome: string }>;
  resultados: ResultadoAlunoDTO[];
  estatisticas: {
    mediaTurma20: number | null;
    percentNegativas: number | null;
    contagemPorNivel: Record<1 | 2 | 3 | 4 | 5, number>;
    totalComNota: number;
  };
}
