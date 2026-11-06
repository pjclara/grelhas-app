import type { ResumoPeriodo } from '@/lib/resumo';
import { ehSecundario } from '@/lib/types';

export interface LinhaExport {
  numero: number;
  nome: string;
  porCriterio: Array<{ nome: string; valor: string }>;
  notaFinal20: string;
  nivel: string | null;
}

/** Os níveis 1-5 só se aplicam ao 2.º/3.º ciclo; no Secundário a nota é diretamente 0-20. */
export function mostraNivel(resumo: ResumoPeriodo): boolean {
  return !ehSecundario(resumo.turma.nivelEnsino);
}

export function formatNum(valor: number | null, casas = 1): string {
  if (valor === null || Number.isNaN(valor)) return '—';
  return valor.toFixed(casas).replace('.', ',');
}

export function construirLinhas(resumo: ResumoPeriodo): LinhaExport[] {
  const comNivel = mostraNivel(resumo);
  // Até ao 9.º ano (2.º/3.º ciclo) os valores são apresentados em %; no
  // Secundário na escala 0-200 — mesma regra da página de resumo.
  const escala200 = ehSecundario(resumo.turma.nivelEnsino);
  const formatarValor = (v: number | null | undefined) =>
    v == null ? '—' : escala200 ? (v * 2).toFixed(0) : `${v.toFixed(0)}%`;
  return resumo.alunos.map((aluno) => {
    const resultado = resumo.resultados.find((r) => r.alunoId === aluno.id)!;
    return {
      numero: aluno.numero,
      nome: aluno.nome,
      porCriterio: resumo.criterios.map((c) => {
        const r = resultado.porCriterio.find((x) => x.criterioId === c.id);
        return { nome: c.nome, valor: formatarValor(r?.media) };
      }),
      notaFinal20: formatNum(resultado.notaFinal20),
      nivel: comNivel ? (resultado.nivel?.toString() ?? '—') : null,
    };
  });
}

export function nomeFicheiro(resumo: ResumoPeriodo, extensao: string): string {
  const base = `${resumo.turma.disciplina}_${resumo.turma.nome}_${resumo.periodo.nome}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base}.${extensao}`;
}
