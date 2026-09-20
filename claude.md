# CLAUDE.md — Manual para agentes Claude neste repositório

Este ficheiro é o manual principal para qualquer trabalho feito por Claude
Code neste projeto. As regras aqui descritas foram construídas a partir do
código real do repositório — não inventam tecnologias, comandos ou
convenções que não existam.

Regras específicas por domínio estão em [`.claude/rules/`](.claude/rules/).
Prompts reutilizáveis estão em [`.claude/prompts/`](.claude/prompts/).

## 1. Visão geral

**Grelhas de Avaliação** é uma aplicação web que substitui uma folha de
Excel usada por professores para avaliação de turmas: disciplinas → anos
letivos → turmas → alunos → critérios de avaliação (pesos configuráveis) →
instrumentos de avaliação → notas por pergunta/item → cálculo automático da
nota final, nível (1–5) e estatísticas de turma, com exportação para PDF e
Excel. Existe também uma área de administração (gestão de utilizadores e
papéis).

**Stack real** (ver `package.json`):

* Next.js 14.2.13 — **App Router** (`src/app`), com Route Handlers em
  `src/app/api/**/route.ts`.
* React 18.3.1.
* TypeScript 5.5.4 em modo `strict` (ver `tsconfig.json`).
* Prisma 5.20.0 como ORM, contra **PostgreSQL** (`prisma/schema.prisma`).
* NextAuth 4.24.7 (`CredentialsProvider`, sessão JWT) para autenticação.
* Zod 3.23.8 para validação de entrada.
* Tailwind CSS 3.4.10 para estilos (sem biblioteca de componentes; não
  existe pasta `components/ui`).
* `bcryptjs` para hashing de palavras-passe.
* `exceljs` / `xlsx` e `pdf-lib` para exportação/importação de ficheiros.
* Gestor de pacotes: **npm** (existe `package-lock.json`).

**Principais diretórios:**

```
prisma/schema.prisma        modelo de dados (Prisma)
prisma/migrations/          migrações SQL
src/app/api/**/route.ts     Route Handlers (API)
src/app/**/page.tsx         páginas (App Router)
src/components/             componentes React partilhados
src/lib/auth.ts             NextAuth + requireUserId/requireAdminId
src/lib/api-helpers.ts      handleApiError + erros HTTP tipados
src/lib/turma-access.ts     verificação de posse (ownership) de turma
src/lib/validation.ts       schemas Zod
src/lib/calc.ts             motor de cálculo de médias e níveis
src/lib/resumo.ts           agregação da folha de resumo
src/middleware.ts           proteção de rotas (withAuth)
scripts/import-xlsx.ts      importador do Excel original
```

Não foram encontrados: testes automatizados, CI/CD (`.github/workflows`),
Docker, ou um Route Handler dedicado a health-check. Ver secção 7 e
"Comandos detectados" no relatório de setup para detalhes.

## 2. Regras gerais

* Entenda o código existente antes de modificar (ler ficheiros relevantes,
  não assumir).
* Procure implementações semelhantes antes de criar algo novo (rota, schema
  Zod, componente, helper).
* Reutilize `src/lib/auth.ts`, `src/lib/api-helpers.ts`,
  `src/lib/validation.ts` e `src/lib/turma-access.ts` — não duplique lógica
  de autenticação, autorização, validação ou tratamento de erros.
* Evite alterações fora do escopo pedido. Não aproveite a tarefa para
  "arrumar" código não relacionado.
* Não adicione dependências novas sem necessidade clara e sem justificar.
* Não faça refatorações oportunistas.
* Preserve as APIs existentes (contratos dos Route Handlers, formas dos
  DTOs em `src/lib/types.ts`) salvo pedido explícito de alteração.
* Não invente abstrações genéricas que o projeto não usa hoje — ex.: não
  crie um `<DataTable>`/`<CrudForm>` genérico só porque `disciplinas` e
  `criterios-avaliacao` têm tabelas com formato parecido; o padrão atual é
  cada página definir o seu próprio JSX inline.

## 3. Processo obrigatório

```
ANALISAR → PLANEJAR → IMPLEMENTAR → TESTAR → REVISAR → APRESENTAR RESULTADO
```

* **Tarefas pequenas** (ex.: corrigir um texto, ajustar uma validação,
  pequeno bug isolado): pode simplificar-se para
  `ANALISAR → IMPLEMENTAR → VALIDAR → APRESENTAR`, mas nunca saltar a
  análise nem a apresentação do resultado.
* **Tarefas complexas** (nova entidade no schema, novo fluxo de
  autorização, alteração ao cálculo de notas em `src/lib/calc.ts` ou
  `src/lib/resumo.ts`, mudanças que atravessam vários Route Handlers):
  apresente um plano (ficheiros afetados, riscos) **antes** de implementar
  e aguarde alinhamento se a tarefa for ambígua.

## 4. Next.js / React (App Router, Next 14)

Ver detalhes em [`.claude/rules/frontend.md`](.claude/rules/frontend.md).

Pontos-chave:

* O projeto usa **App Router**. Route Handlers ficam em
  `src/app/api/**/route.ts`; páginas em `src/app/**/page.tsx`.
* **Estado real do código**: todas as páginas com dados de negócio
  (`disciplinas/page.tsx`, `turmas/[turmaId]/...`, `admin/page.tsx`, etc.)
  são **Client Components** (`"use client"`) que buscam dados via `fetch`
  dentro de `useEffect`, e chamam as suas próprias APIs REST em
  `src/app/api/**`. As únicas Server Components hoje são de *auth-gating*,
  sem dados de negócio: `src/app/page.tsx` (home — `getServerSession` +
  `redirect`) e `src/app/admin/layout.tsx` (idem, mais verificação de
  `role` na BD, com `redirect('/dashboard')` se não for `ADMIN`).
* Para código **novo**, prefira Server Components e data fetching direto no
  servidor (`prisma` dentro de um Server Component, ou Route Handler
  chamado a partir de um Server Component) sempre que a página não precisar
  de interatividade imediata — use `src/app/admin/layout.tsx` como
  referência real de "Server Component que verifica sessão/papel e
  redireciona". Não converta páginas existentes para esse padrão só por
  preferência estética — isso seria refatoração fora de escopo; faça-o
  apenas quando pedido explicitamente ou quando a própria tarefa exigir
  mexer nessa página.
* Não transforme um componente pai em Client Component apenas porque um
  filho precisa de interatividade — mantenha a fronteira `"use client"` o
  mais baixa possível na árvore.
* Não use `useEffect` como mecanismo padrão de carregamento de dados em
  código novo sem antes considerar buscar no servidor.
* Não existem `loading.tsx` / `error.tsx` (error boundaries do App Router)
  nem `generateMetadata` dinâmico no projeto hoje — os estados de
  carregamento/erro são geridos manualmente com `useState` dentro de cada
  Client Component. Siga esse padrão em páginas existentes; considere os
  mecanismos nativos do App Router apenas em páginas novas, se fizer
  sentido.
* Não há uso de `revalidatePath`, `revalidateTag` ou `unstable_cache` no
  projeto — não introduza cache avançado sem necessidade concreta.

## 5. TypeScript

* `strict: true` está ativo (`tsconfig.json`) — mantenha assim.
* Evite `any` fora dos casos já existentes no projeto. Os únicos usos hoje
  são `(window as any).SpeechRecognition ?? (window as any)
  .webkitSpeechRecognition` (`alunos/page.tsx`,
  `instrumentos/[instrumentoId]/page.tsx`), necessários porque a Web
  Speech API não está nos tipos `dom` do TypeScript — é um `any` legítimo
  e localizado, não um precedente para usar `any` noutro contexto.
* Casts (`as X`) existem hoje para vários fins distintos e legítimos:
  estender `session.user` do NextAuth (`src/lib/auth.ts`,
  `Sidebar.tsx`, `TopNav.tsx`, `admin/layout.tsx`), o singleton do Prisma
  client (`globalThis as unknown as {...}` em `src/lib/prisma.ts`), e
  narrowing pontual em `src/lib/calc.ts` e nas rotas de export. Siga o
  padrão já usado para o mesmo tipo de caso; evite casts novos para
  contornar um erro de tipo genuíno.
* Reutilize os tipos de `src/lib/types.ts` e os tipos gerados pelo Prisma
  (`@prisma/client`) em vez de recriar interfaces equivalentes.
* Não existe nenhum `@ts-ignore`/`@ts-expect-error` no projeto hoje — não
  introduza um para contornar um erro de compilação real; corrija a causa.

## 6. Segurança

Regras detalhadas (autenticação, autorização, validação, BD) vivem em
[`.claude/rules/authentication.md`](.claude/rules/authentication.md),
[`.claude/rules/backend.md`](.claude/rules/backend.md) e
[`.claude/rules/database.md`](.claude/rules/database.md) — não duplicar
aqui; se uma regra de segurança mudar, atualizar primeiro esses ficheiros.

Resumo do que nunca deve ser violado:

* **Nunca** coloque secrets no código (`DATABASE_URL`, `NEXTAUTH_SECRET`
  vivem em `.env`, já no `.gitignore`).
* Toda rota de API chama `requireUserId()`/`requireAdminId()`
  (`src/lib/auth.ts`) e valida o corpo com um schema Zod de
  `src/lib/validation.ts` — nunca confie em dados vindos do cliente
  (`userId`, `role`, etc.).
* Recursos aninhados a uma turma confirmam posse com
  `assertTurmaOwnership` (`src/lib/turma-access.ts`).
* Nunca devolva `passwordHash` (ou outro campo sensível) numa resposta de
  API — use `select` explícito no Prisma.
* Use `handleApiError` (`src/lib/api-helpers.ts`) para não vazar detalhes
  internos; não adicione `console.log` de dados sensíveis.
* O projeto não implementa CSRF próprio — depende do mecanismo padrão do
  NextAuth; não o desative.

## 7. Testes

**Não foi encontrada nenhuma infraestrutura de testes automatizados no
repositório** (sem Jest/Vitest/Playwright/Cypress configurados, sem
ficheiros `*.test.*`/`*.spec.*`, sem scripts de teste no `package.json`).
Isto está marcado explicitamente como **não identificado** — não invente
comandos de teste.

Até que uma framework de testes seja introduzida (decisão do utilizador,
não do agente):

* Não afirme que "os testes passaram" — não existem testes para correr.
* A validação de uma tarefa deve, no mínimo, incluir:
  `npm run lint` e `npx tsc --noEmit` (type-check — não há script dedicado,
  ver secção de comandos).
* Para lógica pura e crítica (`src/lib/calc.ts`, `src/lib/resumo.ts`), se o
  utilizador pedir testes ou se o agente propuser adicioná-los, pergunte
  primeiro qual framework instalar (ex.: Vitest) — não adicione uma
  dependência de testes sem autorização, pois isto violaria a regra de "não
  adicionar dependências sem necessidade justificada".

Para bugs, siga sempre:

```
BUG → TESTE QUE REPRODUZ (se houver framework disponível) → CORREÇÃO → TESTE PASSANDO
```

Se não houver framework de testes disponível, substitua "teste que
reproduz" por uma verificação manual documentada (passos exatos para
reproduzir e confirmar a correção).

## 8. Git

* Não faça commit automaticamente — só quando o utilizador pedir
  explicitamente.
* Não faça push automaticamente.
* Não altere histórico (`rebase`, `amend`, `push --force`) sem autorização
  explícita.
* Mantenha commits pequenos e focados numa única alteração lógica.
* Antes de finalizar, reveja `git diff` e `git status` para confirmar que
  só ficheiros relacionados com a tarefa foram alterados.
* Nunca inclua `.env`, `.env.local` ou qualquer ficheiro com segredos num
  commit.
* Convenção de commits observada no histórico real do projeto (não
  formalizada em nenhum ficheiro de configuração):
  `tipo: descrição em inglês, minúsculas, no imperativo`, com tipos como
  `feat:` (a descrição está sempre em inglês, mesmo a app sendo em
  português). Não existe um ficheiro `commitlint`/`husky` que a imponha —
  é uma convenção **sugerida**, seguindo o padrão já usado, não uma regra
  obrigatória.

Mais detalhes em [`.claude/rules/git.md`](.claude/rules/git.md).

## 9. Definition of Done

Uma tarefa só está concluída quando:

* [ ] A implementação cobre o pedido, sem mais nem menos.
* [ ] O escopo foi respeitado (nenhum ficheiro não relacionado tocado).
* [ ] `npm run lint` foi executado e está limpo (ou os avisos restantes
      foram explicados).
* [ ] Type-check (`npx tsc --noEmit`) foi executado e está limpo.
* [ ] Testes foram executados, **apenas se existirem** — caso não existam,
      isso foi dito explicitamente, não omitido.
* [ ] `git diff` foi revisto manualmente.
* [ ] Nenhum secret foi exposto (código, logs, mensagens de commit).
* [ ] Nenhuma alteração não relacionada ao pedido foi introduzida.
* [ ] Problemas ou decisões pendentes foram documentados na resposta final.

## Comandos

Apenas comandos reais, confirmados em `package.json` e nos ficheiros de
configuração do projeto.

### Desenvolvimento

* `npm run dev` — inicia o servidor de desenvolvimento Next.js
  (`next dev`).

### Build

* `npm run build` — corre `prisma generate && prisma migrate deploy && next build`.
  Aplica migrações à base de dados apontada por `DATABASE_URL` antes de
  compilar; **não correr contra a base de dados de produção sem intenção
  explícita**.
* `npm run start` — inicia a app já compilada (`next start`).

### Testes

* Não identificado — não existe script de testes nem framework
  configurada no projeto.

### Lint

* `npm run lint` — `next lint` (ESLint com `eslint-config-next`; não existe
  ficheiro `.eslintrc*` próprio no projeto, usa a configuração por omissão
  do Next.js).

### Type-check

* Não existe script dedicado no `package.json`. Use diretamente
  `npx tsc --noEmit` (o `tsconfig.json` já define `"noEmit": true`).

### Formatação

* Não identificado — não há Prettier nem outro formatter configurado no
  projeto.

### Banco de dados

* `npm run prisma:migrate` — `prisma migrate dev` (cria/aplica migração em
  desenvolvimento; pede confirmação e pode ser destrutivo — **nunca correr
  sem o utilizador pedir explicitamente**).
* `npm run prisma:studio` — `prisma studio` (interface visual da BD).
* `npx prisma migrate deploy` — aplica migrações pendentes (usado também no
  `build`; é o comando documentado no `README.md` para aplicar migrações em
  produção manualmente).
* `npx prisma generate` — regenera o Prisma Client após alterar
  `schema.prisma`.

### E2E

* Não identificado — não há Playwright/Cypress nem configuração
  equivalente no projeto.

### Outros

* `npm run import:xlsx -- --email=... --file="..."` — corre
  `scripts/import-xlsx.ts` (via `tsx`) para importar dados de uma folha
  Excel existente para a base de dados.

## Alterações seguras

* Modifique apenas os ficheiros necessários para a tarefa.
* Evite alterações em massa (ex.: reescrever vários ficheiros só por
  estilo).
* Não altere `package.json`, `tsconfig.json`, `next.config.js`,
  `tailwind.config.ts` ou ficheiros de configuração sem justificar
  explicitamente o motivo ao utilizador.
* Não remova código sem confirmar que não é usado (procure referências no
  repositório antes de apagar).
* Verifique imports e dependências afetadas por qualquer alteração.
* Considere efeitos colaterais, em particular em `src/lib/calc.ts` e
  `src/lib/resumo.ts` (motor de cálculo de notas) e em `src/lib/auth.ts`
  (autenticação/autorização) — alterações aí afetam múltiplas rotas e
  páginas.
* Preserve compatibilidade dos contratos de API existentes
  (`src/app/api/**/route.ts`) e dos tipos em `src/lib/types.ts`, salvo
  pedido explícito de alteração.
* Revise sempre o diff final antes de apresentar o resultado.

Antes de alterações grandes (novo modelo no schema, nova área da aplicação,
mudança na lógica de cálculo de notas):

1. Explique o plano.
2. Identifique os ficheiros afetados.
3. Explique os riscos (ex.: migração de dados, quebra de contrato de API).
4. Só depois implemente.

## Checklist de revisão (antes de finalizar qualquer tarefa)

### Arquitetura

* A alteração segue a arquitetura existente (App Router, Route Handlers em
  `src/app/api`, acesso à BD via Prisma em `src/lib/prisma.ts`)?
* Criou alguma abstração desnecessária?
* Duplicou lógica já existente em `src/lib/`?

### Next.js

* A escolha Server/Client Component está correta e justificada?
* `"use client"` é realmente necessário no componente onde foi colocado?
* O data fetching está no local apropriado (server, quando possível)?
* Alguma rota nova precisa de ser adicionada ao `matcher` de
  `src/middleware.ts` para ficar protegida?

### React

* O estado novo é realmente necessário ou pode ser derivado/obtido do
  servidor?
* Existem re-renders ou efeitos desnecessários?
* As regras de hooks foram respeitadas?

### TypeScript

* Existem `any` novos?
* Existem casts (`as X`) desnecessários?
* Os tipos batem com `src/lib/types.ts` e com os tipos gerados pelo Prisma?

### Segurança

* Existe input de API sem validação Zod?
* Algum secret foi exposto (código, log, commit)?
* A rota verifica autenticação (`requireUserId`) e, se aplicável,
  autorização (`requireAdminId`, `assertTurmaOwnership`)?
* Algum dado sensível (`passwordHash`, etc.) pode chegar ao cliente?

### Testes

* Não há framework de testes no projeto — confirme que isso foi
  comunicado, em vez de omitido.
* Casos de erro foram considerados manualmente?

### Git

* O diff contém apenas alterações relacionadas com a tarefa?
* Algum ficheiro sensível (`.env*`) foi acidentalmente incluído?
* Existem alterações acidentais a ficheiros não relacionados?
