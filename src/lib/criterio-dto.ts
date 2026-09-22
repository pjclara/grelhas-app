import type { Prisma } from '@prisma/client';

/** Inclui os dados do catálogo necessários para derivar `grupo`/`nome` de um TurmaDisciplinaInstrumento. */
export const criterioInclude = {
  instrumentoAvaliacao: { include: { grupo: true } },
} satisfies Prisma.TurmaDisciplinaInstrumentoInclude;

type TurmaDisciplinaInstrumentoComCatalogo = Prisma.TurmaDisciplinaInstrumentoGetPayload<{
  include: typeof criterioInclude;
}>;

/** Achata um TurmaDisciplinaInstrumento (+ catálogo) no shape `Criterio` consumido pelo frontend. */
export function paraCriterioDTO(c: TurmaDisciplinaInstrumentoComCatalogo) {
  return {
    id: c.id,
    grupo: c.instrumentoAvaliacao.grupo.nome,
    nome: c.instrumentoAvaliacao.nome,
    peso: c.peso,
    ordem: c.ordem,
  };
}
