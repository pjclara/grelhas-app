import type { ResumoPeriodo } from '@/lib/resumo';
import { ehSecundario } from '@/lib/types';

export interface ColunaExport {
  /** Critério a que a coluna pertence (cabeçalho agrupado); null = coluna independente. */
  grupo: string | null;
  titulo: string;
  /** Valores formatados, um por aluno (mesma ordem de `alunos`). */
  valores: string[];
  media: string;
  negativas: string;
  /** Coluna de texto livre (notas / comentários). */
  texto?: boolean;
  /** Colunas de resumo (média do critério, atitudes, final, classificação, nível) a negrito. */
  destaque: boolean;
}

export interface TabelaExport {
  alunos: Array<{ numero: number; nome: string }>;
  colunas: ColunaExport[];
  /** Nº de alunos por intervalo de nota (0-20): classificação final e cada instrumento. */
  estatisticas: {
    bandas: string[];
    linhas: Array<{ titulo: string; totais: number[] }>;
  };
}

/** Os níveis 1-5 só se aplicam ao 2.º/3.º ciclo; no Secundário a nota é diretamente 0-20. */
export function mostraNivel(resumo: ResumoPeriodo): boolean {
  return !ehSecundario(resumo.turma.nivelEnsino);
}

export function formatNum(valor: number | null, casas = 1): string {
  if (valor === null || Number.isNaN(valor)) return '—';
  return valor.toFixed(casas).replace('.', ',');
}

const notNull = (v: number | null | undefined): v is number => v != null;
const mediaDe = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const negativasDe = (v: number[], limite: number) =>
  v.length ? (v.filter((x) => x < limite).length / v.length) * 100 : null;
const fmtPct = (v: number | null) => (v == null ? '—' : `${v.toFixed(0)}%`);

/**
 * Tabela do resumo para exportação — mesma estrutura da página de resumo:
 * instrumentos por critério + média do critério, atitudes agregadas, Média final,
 * Classificação (inserida pelo professor ou média arredondada) e Nível.
 */
export function construirTabela(resumo: ResumoPeriodo): TabelaExport {
  const comNivel = mostraNivel(resumo);
  // Até ao 9.º ano (2.º/3.º ciclo) os valores são apresentados em %; no
  // Secundário na escala 0-20 — mesma regra da página de resumo.
  const escala20 = ehSecundario(resumo.turma.nivelEnsino);
  const formatarValor = (v: number | null | undefined) =>
    v == null ? '—' : escala20 ? (v / 5).toFixed(1).replace('.', ',') : `${v.toFixed(0)}%`;
  const fmtMediaPercent = (v: number | null) => (v == null ? '—' : formatarValor(v));

  const resultadoDe = (alunoId: string) => resumo.resultados.find((r) => r.alunoId === alunoId)!;
  const resultados = resumo.alunos.map((a) => resultadoDe(a.id));

  const criteriosAtitude = resumo.criterios.filter((c) => c.grupo.toLowerCase().includes('atitude'));
  const criteriosDetalhados = resumo.criterios.filter((c) => !criteriosAtitude.includes(c));
  const pesoAtitudes = criteriosAtitude.reduce((acc, c) => acc + c.peso, 0);
  const nomeAtitudes = criteriosAtitude[0]?.grupo ?? 'Atitudes';

  const mediaAtitudes = (r: ResumoPeriodo['resultados'][number]): number | null => {
    const comValor = criteriosAtitude
      .map((c) => ({ peso: c.peso, media: r.porCriterio.find((x) => x.criterioId === c.id)?.media ?? null }))
      .filter((x): x is { peso: number; media: number } => x.media != null);
    const pesoTotal = comValor.reduce((acc, x) => acc + x.peso, 0);
    if (comValor.length === 0 || pesoTotal === 0) return null;
    return comValor.reduce((acc, x) => acc + x.peso * x.media, 0) / pesoTotal;
  };

  // Coluna em % (negativa < 50%) a partir de um valor por aluno.
  const colunaPercent = (grupo: string | null, titulo: string, valores: Array<number | null | undefined>, destaque: boolean): ColunaExport => {
    const nums = valores.filter(notNull);
    return {
      grupo,
      titulo,
      valores: valores.map(formatarValor),
      media: fmtMediaPercent(mediaDe(nums)),
      negativas: fmtPct(negativasDe(nums, 50)),
      destaque,
    };
  };

  const colunas: ColunaExport[] = [];
  const valoresPorInstrumento: Array<{ titulo: string; notas20: number[] }> = [];
  for (const c of criteriosDetalhados) {
    const rotulo = `${c.nome} (${Math.round(c.peso * 100)}%)`;
    const instrumentos = resumo.instrumentos.filter((i) => i.criterioId === c.id).sort((a, b) => a.ordem - b.ordem);
    const mediaCriterio = resultados.map((r) => r.porCriterio.find((x) => x.criterioId === c.id)?.media);
    if (instrumentos.length === 0) {
      colunas.push(colunaPercent(null, rotulo, mediaCriterio, true));
      continue;
    }
    for (const i of instrumentos) {
      valoresPorInstrumento.push({
        titulo: `${c.nome} · ${i.nome}`,
        notas20: resultados
          .map((r) => r.porInstrumento.find((x) => x.instrumentoId === i.id)?.percent)
          .filter(notNull)
          .map((p) => Math.round(p / 5)),
      });
      colunas.push(
        colunaPercent(rotulo, i.nome, resultados.map((r) => r.porInstrumento.find((x) => x.instrumentoId === i.id)?.percent), false)
      );
    }
    colunas.push(colunaPercent(rotulo, 'Média', mediaCriterio, true));
  }
  if (criteriosAtitude.length > 0) {
    colunas.push(
      colunaPercent(null, `${nomeAtitudes} (${Math.round(pesoAtitudes * 100)}%)`, resultados.map(mediaAtitudes), true)
    );
  }

  const finais = resultados.map((r) => r.notaFinal20);
  const finaisNums = finais.filter(notNull);
  colunas.push({
    grupo: null,
    titulo: 'Média final',
    valores: finais.map((v) => formatNum(v, 2)),
    media: formatNum(mediaDe(finaisNums), 2),
    negativas: fmtPct(negativasDe(finaisNums, 10)),
    destaque: true,
  });

  const autoavaliacoes = resumo.alunos.map((a) => resumo.autoavaliacoes[a.id] ?? null);
  const autoNums = autoavaliacoes.filter(notNull);
  colunas.push({
    grupo: null,
    titulo: 'Autoavaliação',
    valores: autoavaliacoes.map((v) => (v == null ? '—' : String(v))),
    media: formatNum(mediaDe(autoNums), 2),
    negativas: fmtPct(negativasDe(autoNums, 10)),
    destaque: true,
  });

  const classificacoes = resultados.map((r) => resumo.classificacoes[r.alunoId] ?? (r.notaFinal20 != null ? Math.round(r.notaFinal20) : null));
  const classNums = classificacoes.filter(notNull);
  colunas.push({
    grupo: null,
    titulo: 'Classificação',
    valores: classificacoes.map((v) => (v == null ? '—' : String(v))),
    media: formatNum(mediaDe(classNums), 0),
    negativas: fmtPct(negativasDe(classNums, 10)),
    destaque: true,
  });

  if (comNivel) {
    const niveis: Array<number | null> = resultados.map((r) => r.nivel);
    const niveisNums = niveis.filter(notNull);
    colunas.push({
      grupo: null,
      titulo: 'Nível',
      valores: niveis.map((v) => (v == null ? '—' : String(v))),
      media: formatNum(mediaDe(niveisNums), 2),
      negativas: fmtPct(negativasDe(niveisNums, 3)),
      destaque: true,
    });
  }

  colunas.push({
    grupo: null,
    titulo: 'Notas / comentários',
    valores: resumo.alunos.map((a) => resumo.comentarios[a.id] ?? ''),
    media: '',
    negativas: '',
    destaque: false,
    texto: true,
  });

  const bandas = [
    { label: '0 - 7', min: 0, max: 7 },
    { label: '8 - 9', min: 8, max: 9 },
    { label: '10 - 13', min: 10, max: 13 },
    { label: '14 - 17', min: 14, max: 17 },
    { label: '18 - 20', min: 18, max: 20 },
  ];
  const contar = (notas: number[]) => bandas.map((b) => notas.filter((n) => n >= b.min && n <= b.max).length);
  const estatisticas = {
    bandas: bandas.map((b) => b.label),
    linhas: [
      { titulo: 'Classificação final', totais: contar(classNums) },
      ...valoresPorInstrumento.map((v) => ({ titulo: v.titulo, totais: contar(v.notas20) })),
    ],
  };

  return {
    alunos: resumo.alunos.map((a) => ({ numero: a.numero, nome: a.nome })),
    colunas,
    estatisticas,
  };
}

export function nomeFicheiro(resumo: ResumoPeriodo, extensao: string): string {
  const base = `${resumo.turma.disciplina}_${resumo.turma.nome}_${resumo.periodo.nome}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base}.${extensao}`;
}
