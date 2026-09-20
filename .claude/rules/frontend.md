# Regras de frontend

Baseado no código real em `src/app/**/page.tsx` e `src/components/`.

## Componentes

* Componentes partilhados vivem em `src/components/` (hoje:
  `SessionProvider.tsx`, `Sidebar.tsx`, `TopNav.tsx`). Não existe pasta
  `components/ui` — não crie uma biblioteca de componentes genéricos sem
  necessidade real.
* Antes de criar um componente novo:
  1. procure em `src/components/` se já existe algo semelhante;
  2. procure na mesma página/feature (muitas páginas definem sub-blocos
     inline, como as linhas da tabela em `disciplinas/page.tsx`);
  3. só crie um componente novo partilhado se for reutilizado em mais do
     que um lugar.
* Não crie componentes genéricos excessivamente abstratos (ex.: um
  `<DataTable>` configurável) para um único caso de uso.

## Server vs Client Components

* O padrão do App Router é Server Component por omissão. **Estado real**:
  todas as páginas com dados de negócio são Client Components
  (`'use client'` na primeira linha) porque buscam dados via `fetch` no
  cliente. Existem, no entanto, dois Server Components reais no projeto,
  ambos de *auth-gating* sem dados de negócio: `src/app/page.tsx` (home) e
  `src/app/admin/layout.tsx` — ambos fazem `getServerSession` e
  `redirect()` num componente `async` sem `'use client'`. Use
  `admin/layout.tsx` como referência ao escrever uma Server Component nova
  que precise de verificar sessão/papel.
* Para páginas/componentes **novos**, avalie primeiro se os dados podem ser
  obtidos diretamente no servidor (Server Component chamando Prisma, ou
  Route Handler) antes de assumir `'use client'` por hábito.
* Nunca marque um componente pai como `'use client'` só porque um filho
  precisa de interatividade — isole o filho interativo e mantenha o pai
  como Server Component sempre que possível.
* `src/components/SessionProvider.tsx` é `'use client'` por necessidade
  (usa o `SessionProvider` do `next-auth/react`, que depende de Context) —
  isto é um caso legítimo de fronteira cliente.

## Lacuna de proteção conhecida (não replicar)

* `src/middleware.ts` só protege `/dashboard`, `/turmas` e `/admin`
  (ver `.claude/rules/authentication.md`). As páginas `/disciplinas` e
  `/criterios-avaliacao` — linkadas na `Sidebar` para qualquer utilizador
  autenticado — **não estão no `matcher`** nem fazem `getServerSession`
  própria, ao contrário de `admin/layout.tsx`. Isto é uma lacuna real do
  projeto, não um padrão a seguir: não seguir a proteção dessas duas
  páginas como exemplo, e sinalizar ao utilizador se for pedido para
  trabalhar nelas.

## Data fetching

* Padrão atual: Client Component com `useState` + `useEffect` + `fetch()`
  contra as próprias rotas em `src/app/api/**` (ver `carregar()` em
  `disciplinas/page.tsx`).
* Antes de replicar esse padrão numa página nova, pergunte-se se os dados
  podem ser lidos diretamente no servidor (Server Component com
  `prisma.*.findMany` e passados como props), evitando o "loading flash" e
  o `useEffect`.
* Não use `useEffect` como mecanismo padrão de fetch sem essa análise.
* Ao alterar uma página existente, mantenha o padrão já usado nela salvo
  pedido explícito de migração — não misture os dois estilos na mesma
  página sem necessidade.

## Estado

* Antes de adicionar `useState`, determine se o valor:
  * pode ser derivado de outro estado/prop (não duplique estado);
  * pode ficar no servidor (props vindas de uma Server Component);
  * já existe um estado equivalente na mesma página.
* Formulários no projeto usam estado local simples (`useState` por campo),
  sem biblioteca de forms (não há `react-hook-form`, `formik`, etc. nas
  dependências) — siga esse padrão em vez de introduzir uma biblioteca
  nova sem necessidade.

## UI / estilos

* Tailwind CSS é o único sistema de estilos do projeto
  (`tailwind.config.ts`). Não introduza CSS Modules, styled-components ou
  outra abordagem.
* Cor de marca customizada: `brand-*` (ver `tailwind.config.ts`) — reutilize
  em vez de hardcodar cores hex novas.
* Mensagens de erro/confirmação usam texto simples em português (ex.:
  `confirm(...)` nativo do browser em `remover()`), sem biblioteca de
  toasts/modais — siga o padrão existente.

## Acessibilidade

* Não existe nenhum ficheiro `.eslintrc*` no projeto (`next lint` pede
  para criar um interativamente na primeira execução) — não há lint de
  acessibilidade ativo hoje, mesmo `eslint-config-next` trazendo
  `eslint-plugin-jsx-a11y` transitivamente, porque não há configuração
  nenhuma a resolver essas regras. Não assuma proteção automática de a11y.
  Mantenha `label` associados a inputs (como já é feito) e não remova
  atributos semânticos existentes.
