# Regras de testes

## Estado real do projeto

**Não existe nenhuma infraestrutura de testes automatizados neste
repositório.** Verificado em:

* `package.json` — sem `test` script, sem Jest/Vitest/Playwright/Cypress
  nas dependências.
* Repositório — sem ficheiros `*.test.*` ou `*.spec.*`.
* Sem configuração (`jest.config.*`, `vitest.config.*`,
  `playwright.config.*`) em qualquer lugar do projeto.

Isto é uma lacuna real do projeto, não uma omissão deste documento. Não
invente comandos de teste nem afirme ter corrido testes que não existem.

## O que fazer na ausência de testes

* Trate `npm run lint` e `npx tsc --noEmit` como a validação automatizada
  mínima disponível hoje.
* Para qualquer alteração de comportamento, descreva os passos de
  verificação manual realizados (ex.: "criei uma disciplina via UI e
  confirmei que aparece na lista").
* Se a tarefa pedir explicitamente para adicionar testes, ou se for claro
  que a tarefa precisa de testes (ex.: alteração ao motor de cálculo em
  `src/lib/calc.ts`), pergunte ao utilizador qual framework introduzir
  (ex.: Vitest, por ser leve e compatível com TypeScript/ESM) antes de
  adicionar a dependência — isto é uma decisão de arquitetura do projeto,
  não deve ser tomada unilateralmente pelo agente.

## Fluxo para bugs

```
BUG → TESTE QUE REPRODUZ (quando houver framework) → CORREÇÃO → TESTE PASSANDO
```

Sem framework disponível, substitua o "teste que reproduz" por uma
descrição exata dos passos de reprodução e da verificação pós-correção
(inputs usados, resultado esperado vs. obtido).

## Candidatos naturais a testes unitários (se/quando uma framework for introduzida)

Lógica pura, sem dependências de rede/BD, fácil de testar isoladamente:

* `src/lib/calc.ts` — cálculo de médias, percentagens e níveis.
* `src/lib/resumo.ts` — agregação de turma + notas.
* `src/lib/validation.ts` — schemas Zod (casos válidos/inválidos).
* `src/lib/types.ts` — função `anoLetivoAtual` (depende de data, boa
  candidata a teste com data injetada).
