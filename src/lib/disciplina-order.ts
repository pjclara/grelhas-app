import type { Disciplina } from './types';

/** Chave de ordenação: Grupo Disciplinar → Ciclo → Disciplina → Ano de escolaridade. */
function chaveOrdenacao(d: Disciplina) {
  const grupo = d.grupoDisciplinar?.nome || '￿';
  const ciclo = [...d.ciclos].map((dc) => dc.ciclo.nome).sort((a, b) => a.localeCompare(b))[0] || '￿';
  const anoOrdem = d.anosEscolaridade.length
    ? Math.min(...d.anosEscolaridade.map((da) => da.anoEscolaridade.ordem))
    : Infinity;
  return { grupo, ciclo, nome: d.nome, anoOrdem };
}

export function compararPorGrupoCicloDisciplinaAno(a: Disciplina, b: Disciplina) {
  const ka = chaveOrdenacao(a);
  const kb = chaveOrdenacao(b);
  return (
    ka.grupo.localeCompare(kb.grupo) ||
    ka.ciclo.localeCompare(kb.ciclo) ||
    ka.nome.localeCompare(kb.nome) ||
    ka.anoOrdem - kb.anoOrdem
  );
}
