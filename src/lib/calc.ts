/**
 * Motor de cálculo de médias e níveis.
 *
 * Generaliza a lógica da grelha de Excel original:
 * - Cada Instrumento (teste, outro instrumento, item de atitude, ...) dá uma
 *   percentagem 0-100%: soma dos pontos obtidos / soma dos pontos máximos
 *   (modo PONTOS), ou média da escala / escala máxima (modo ESCALA).
 * - Cada Critério (ex.: "Testes de avaliação" 45%, "Responsabilidade" 5%) é a
 *   média das percentagens dos seus instrumentos, num dado período.
 * - A nota final do período é a soma ponderada (peso × média) de todos os
 *   critérios, só calculada quando o aluno tem pelo menos uma nota em cada
 *   critério com peso > 0 (tal como no Excel original, que só fecha a média
 *   quando todas as componentes estão preenchidas).
 *
 * Nota: no ficheiro Excel original a fórmula da nota final somava médias em
 * escalas diferentes (0-20 e 0-25) sem normalizar — o que o próprio autor da
 * grelha assinalava com um "??" na folha de resumo. Aqui todas as
 * componentes são normalizadas para 0-100% antes de aplicar o peso, o que
 * corrige essa inconsistência mantendo o mesmo espírito de cálculo.
 */

export type ModoAvaliacao = 'PONTOS' | 'ESCALA';

export interface PerguntaCalc {
  id: string;
  valorMax: number;
}

export interface InstrumentoCalc {
  id: string;
  criterioId: string;
  periodoId: string;
  modo: ModoAvaliacao;
  escalaMax: number;
  perguntas: PerguntaCalc[];
}

export interface CriterioCalc {
  id: string;
  nome: string;
  grupo: string;
  peso: number; // 0..1
  ordem: number;
}

export interface TurmaLimiares {
  limiarNivel2: number;
  limiarNivel3: number;
  limiarNivel4: number;
  limiarNivel5: number;
}

/** notas[perguntaId] = valor (undefined/null = por preencher) */
export type NotasAluno = Record<string, number | null | undefined>;

export interface ResultadoInstrumento {
  instrumentoId: string;
  percent: number | null; // 0-100 ou null se sem nenhuma nota
  soma: number;
  max: number;
}

export interface ResultadoCriterio {
  criterioId: string;
  media: number | null; // 0-100
}

export interface ResultadoAluno {
  alunoId: string;
  porInstrumento: ResultadoInstrumento[];
  porCriterio: ResultadoCriterio[];
  notaFinalPercent: number | null; // 0-100
  notaFinal20: number | null; // 0-20
  nivel: 1 | 2 | 3 | 4 | 5 | null;
}

export function calcularInstrumento(
  instrumento: InstrumentoCalc,
  notas: NotasAluno
): ResultadoInstrumento {
  let soma = 0;
  let max = 0;
  let algumPreenchido = false;

  for (const pergunta of instrumento.perguntas) {
    const valor = notas[pergunta.id];
    max += instrumento.modo === 'ESCALA' ? instrumento.escalaMax : pergunta.valorMax;
    if (valor !== null && valor !== undefined) {
      algumPreenchido = true;
      soma += valor;
    }
  }

  if (!algumPreenchido || max === 0) {
    return { instrumentoId: instrumento.id, percent: null, soma, max };
  }

  // Em ambos os modos, `max` já foi acumulado de forma consistente acima
  // (escalaMax por item, ou valorMax por pergunta), logo a percentagem é
  // sempre soma/máximo.
  const percent = (soma / max) * 100;

  return { instrumentoId: instrumento.id, percent, soma, max };
}

export function nivelPorPercent(percent: number, limiares: TurmaLimiares): 1 | 2 | 3 | 4 | 5 {
  if (percent < limiares.limiarNivel2) return 1;
  if (percent < limiares.limiarNivel3) return 2;
  if (percent < limiares.limiarNivel4) return 3;
  if (percent < limiares.limiarNivel5) return 4;
  return 5;
}

export function calcularAluno(
  alunoId: string,
  periodoId: string,
  criterios: CriterioCalc[],
  instrumentos: InstrumentoCalc[],
  notas: NotasAluno,
  limiares: TurmaLimiares
): ResultadoAluno {
  const instrumentosDoPeriodo = instrumentos.filter((i) => i.periodoId === periodoId);
  const porInstrumento = instrumentosDoPeriodo.map((i) => calcularInstrumento(i, notas));

  const porCriterio: ResultadoCriterio[] = criterios.map((criterio) => {
    const resultadosDoCriterio = porInstrumento.filter((r) => {
      const instrumento = instrumentosDoPeriodo.find((i) => i.id === r.instrumentoId);
      return instrumento?.criterioId === criterio.id;
    });
    const comValor = resultadosDoCriterio.filter((r) => r.percent !== null) as Array<
      ResultadoInstrumento & { percent: number }
    >;
    if (comValor.length === 0) {
      return { criterioId: criterio.id, media: null };
    }
    const media = comValor.reduce((acc, r) => acc + r.percent, 0) / comValor.length;
    return { criterioId: criterio.id, media };
  });

  const criteriosComPeso = criterios.filter((c) => c.peso > 0);
  const todosPreenchidos = criteriosComPeso.every((c) => {
    const resultado = porCriterio.find((r) => r.criterioId === c.id);
    return resultado && resultado.media !== null;
  });

  let notaFinalPercent: number | null = null;
  if (todosPreenchidos && criteriosComPeso.length > 0) {
    notaFinalPercent = criteriosComPeso.reduce((acc, c) => {
      const resultado = porCriterio.find((r) => r.criterioId === c.id);
      return acc + c.peso * (resultado?.media ?? 0);
    }, 0);
  }

  const notaFinal20 = notaFinalPercent !== null ? (notaFinalPercent / 100) * 20 : null;
  const nivel = notaFinalPercent !== null ? nivelPorPercent(notaFinalPercent, limiares) : null;

  return { alunoId, porInstrumento, porCriterio, notaFinalPercent, notaFinal20, nivel };
}

export interface EstatisticasTurma {
  mediaTurma20: number | null;
  percentNegativas: number | null; // nível 1 ou 2
  contagemPorNivel: Record<1 | 2 | 3 | 4 | 5, number>;
  totalComNota: number;
}

export function calcularEstatisticasTurma(resultados: ResultadoAluno[]): EstatisticasTurma {
  const comNota = resultados.filter((r) => r.notaFinal20 !== null) as Array<
    ResultadoAluno & { notaFinal20: number; nivel: 1 | 2 | 3 | 4 | 5 }
  >;

  const contagemPorNivel: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of comNota) contagemPorNivel[r.nivel]++;

  const mediaTurma20 =
    comNota.length > 0 ? comNota.reduce((acc, r) => acc + r.notaFinal20, 0) / comNota.length : null;

  const negativas = contagemPorNivel[1] + contagemPorNivel[2];
  const percentNegativas = comNota.length > 0 ? (negativas / comNota.length) * 100 : null;

  return { mediaTurma20, percentNegativas, contagemPorNivel, totalComNota: comNota.length };
}
