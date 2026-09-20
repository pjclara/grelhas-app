# Prompt: adicionar testes

Antes de escrever qualquer teste, confirme o estado real do projeto: **não
existe framework de testes configurada** (`.claude/rules/testing.md`) —
sem Jest/Vitest/Playwright/Cypress em `package.json`.

## 1. Antes de instalar qualquer coisa

* Não adicione uma dependência de testes sem confirmar com o utilizador
  qual framework prefere (ex.: Vitest para lógica pura em `src/lib/`).
* Isto conta como "adicionar dependência" — precisa de justificação e,
  idealmente, confirmação explícita, conforme `claude.md`.

## 2. Escolher o alvo

Bons candidatos a teste unitário, por serem lógica pura sem I/O:

* `src/lib/calc.ts` (cálculo de médias/níveis);
* `src/lib/resumo.ts` (agregação da folha de resumo);
* `src/lib/validation.ts` (schemas Zod — casos válidos e inválidos);
* `anoLetivoAtual` em `src/lib/types.ts`.

Rotas de API e páginas precisariam de mocks de `next-auth`/Prisma ou de
testes de integração — trate como tarefa separada, mais cara.

## 3. Escrever o teste

* Um teste por comportamento relevante, incluindo casos de erro/borda
  (ex.: `calc.ts` com zero notas lançadas, `resumo.ts` com aluno inativo).
* Sem mocks desnecessários — funções em `src/lib/calc.ts`/`resumo.ts` são
  puras, não precisam de mockar a BD.

## 4. Validar

* Corra a suite de testes introduzida e confirme que passa.
* Corra `npm run lint` e `npx tsc --noEmit`.
* Reporte exatamente que comandos foram corridos e o resultado — não
  afirme cobertura que não foi verificada.
