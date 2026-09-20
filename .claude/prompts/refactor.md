# Prompt: refatoração

Só use este prompt quando a refatoração for **explicitamente pedida** pelo
utilizador. Nunca inicie uma refatoração como efeito colateral de outra
tarefa (ver `claude.md`, secção "Alterações").

## 1. Analisar antes de modificar

* Confirme o objetivo exato da refatoração e o seu escopo (quais ficheiros
  estão dentro/fora).
* Mapeie todos os pontos que usam o código a refatorar (`grep`/procura por
  referências) — em particular funções de `src/lib/` são partilhadas por
  múltiplas rotas e páginas.
* Confirme que os contratos externos (respostas das rotas de API, forma
  dos tipos em `src/lib/types.ts`, schema da BD) não vão mudar, a não ser
  que isso seja explicitamente parte do pedido.

## 2. Planejar

Apresente o plano antes de tocar em código:

* ficheiros afetados;
* comportamento que deve permanecer idêntico;
* riscos (ex.: alterar uma função em `src/lib/calc.ts` usada por várias
  páginas de resumo).

## 3. Implementar

* Faça a refatoração em passos pequenos e coerentes.
* Não misture a refatoração com correções de bugs ou funcionalidades
  novas — se encontrar um bug durante a refatoração, reporte-o separado em
  vez de o corrigir "de passagem", salvo se o utilizador pedir o
  contrário.

## 4. Validar

* Corra `npm run lint` e `npx tsc --noEmit`.
* Não há testes automatizados (`.claude/rules/testing.md`) — verifique
  manualmente que o comportamento observável não mudou (mesmas respostas
  de API, mesmas páginas a funcionar).
* Reveja o `git diff` cuidadosamente — refatorações tendem a gerar diffs
  grandes; confirme que nenhuma mudança de comportamento acidental foi
  introduzida.

## 5. Apresentar

* Liste o que mudou estruturalmente e confirme explicitamente que o
  comportamento externo se manteve igual (ou descreva a única mudança de
  comportamento intencional, se houver).
