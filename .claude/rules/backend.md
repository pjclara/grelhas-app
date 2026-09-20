# Regras de backend (Route Handlers)

Baseado no código real em `src/app/api/**/route.ts` e `src/lib/`.

## Estrutura de uma rota

Todas as rotas seguem o mesmo esqueleto (ver `src/app/api/turmas/route.ts`,
`src/app/api/admin/users/route.ts`):

```ts
export async function GET(/* req */) {
  try {
    const userId = await requireUserId(); // ou requireAdminId()
    // ... lógica com prisma ...
    return NextResponse.json(dados);
  } catch (error) {
    return handleApiError(error);
  }
}
```

Ao criar uma rota nova:

1. Procure uma rota existente com forma semelhante (mesma entidade, mesmo
   tipo de operação) e siga a mesma estrutura.
2. Chame sempre `requireUserId()` ou `requireAdminId()`
   (`src/lib/auth.ts`) logo no início do `try`.
3. Valide o corpo do pedido com um schema Zod de `src/lib/validation.ts`
   (crie um novo schema lá se não existir um adequado).
4. Delegue tratamento de erros a `handleApiError`
   (`src/lib/api-helpers.ts`) — não escreva `NextResponse.json({error...})`
   manualmente para os casos já cobertos (`UnauthorizedError`,
   `ForbiddenError`, `ZodError`, `NotFoundError`).
5. Para recursos aninhados a uma turma (`turmas/[turmaId]/...`), confirme a
   posse com `assertTurmaOwnership` (`src/lib/turma-access.ts`) antes de
   ler/alterar dados relacionados.

## Autorização

* Rotas normais: `requireUserId()` — o utilizador só vê/altera os seus
  próprios dados (filtro `where: { userId }` nas queries Prisma).
* Rotas de administração (`src/app/api/admin/**`): `requireAdminId()`, que
  lança `ForbiddenError` (403) se o utilizador não for `ADMIN`.
* Nunca aceite um `userId` vindo do corpo do pedido, de query params ou de
  headers — o único `userId` de confiança é o devolvido por
  `requireUserId()`/`requireAdminId()`, que vem da sessão validada no
  servidor.

## Validação

* Todo `req.json()` deve passar por `.parse()` de um schema Zod antes de
  ser usado. `ZodError` já é tratado por `handleApiError` (400 com
  `issues`).
* Não confie em tipos TypeScript sozinhos para validar payloads — eles não
  protegem contra dados reais vindos do cliente.

## Erros

* Use as classes já existentes em `src/lib/auth.ts`
  (`UnauthorizedError`, `ForbiddenError`) e `src/lib/api-helpers.ts`
  (`NotFoundError`) em vez de criar novas classes de erro equivalentes.
* Erros não previstos caem no `500` genérico de `handleApiError`, que já
  regista com `console.error` — não adicione tratamento duplicado.

## Services / lógica de negócio

* Não há uma camada "services" separada; lógica de negócio pura vive em
  `src/lib/calc.ts` (cálculo de médias e níveis) e `src/lib/resumo.ts`
  (agregação para a folha de resumo). Route Handlers ficam finos, chamando
  Prisma diretamente e, quando aplicável, essas funções de `src/lib`.
* Ao adicionar lógica de negócio nova e reutilizável, prefira colocá-la em
  `src/lib/` (novo ficheiro ou um existente relacionado) em vez de dentro
  do Route Handler.
