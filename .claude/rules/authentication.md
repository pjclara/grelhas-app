# Regras de autenticação e autorização

Baseado em `src/lib/auth.ts`, `src/middleware.ts` e
`src/app/api/auth/[...nextauth]/route.ts`.

## Mecanismo

* **NextAuth 4.24.7**, com um único provider: `CredentialsProvider`
  (email + palavra-passe), configurado em `authOptions`
  (`src/lib/auth.ts`).
* Sessão: estratégia **JWT** (`session: { strategy: 'jwt' }`), não sessão
  em base de dados.
* Palavras-passe: hash com `bcryptjs` (`bcrypt.compare` no `authorize`,
  `bcrypt.hash(..., 10)` ao criar utilizador — ver
  `src/app/api/admin/users/route.ts` e `src/app/api/register/route.ts`).
* Página de login customizada: `/login` (`pages: { signIn: '/login' }`).

## Onde ocorre a autenticação

* Rota do NextAuth: `src/app/api/auth/[...nextauth]/route.ts` (padrão
  Next.js — não modifique a não ser para mudar `authOptions`).
* Registo de novos utilizadores: `src/app/api/register/route.ts`, validado
  por `registerSchema` (`src/lib/validation.ts`).

## Autorização (papéis)

* Enum `Role` no Prisma: `PROFESSOR` (default) e `ADMIN`
  (`prisma/schema.prisma`).
* O papel (`role`) é sempre lido da base de dados no callback `session`
  de `authOptions`, nunca confiado ao token — isto garante que uma
  promoção/despromoção de papel feita por um admin tem efeito imediato,
  mesmo com uma sessão JWT já emitida (ver comentário em
  `src/lib/auth.ts`).
* Helpers para usar em Route Handlers:
  * `requireUserId()` — exige sessão válida e utilizador existente na BD;
    lança `UnauthorizedError` (→ 401) caso contrário.
  * `requireAdminId()` — como acima, mas exige `role === 'ADMIN'`; lança
    `ForbiddenError` (→ 403) caso contrário.
* Nunca implemente uma verificação de papel manual duplicando esta lógica
  — reutilize sempre `requireUserId`/`requireAdminId`.

## Proteção de rotas (páginas)

* `src/middleware.ts` usa `withAuth` do `next-auth/middleware` com
  `matcher: ['/dashboard/:path*', '/turmas/:path*', '/admin/:path*']`.
* Ao adicionar uma página nova que exija sessão, adicione o respetivo
  padrão ao `matcher` — caso contrário a página fica acessível sem login
  (a proteção de dados continua a existir nas rotas de API via
  `requireUserId`, mas a página em si renderizaria sem redirecionar para
  `/login`).
* O `matcher` não distingue `PROFESSOR` de `ADMIN` — a restrição a
  `ADMIN` para `/admin/**` é feita ao nível dos Route Handlers
  (`requireAdminId`) e/ou verificação de sessão dentro da própria página
  (`src/app/admin/layout.tsx`/`page.tsx`), não pelo middleware.
* **Lacuna real, não corrigida**: `/disciplinas` e `/criterios-avaliacao`
  são páginas protegidas na prática apenas porque as suas chamadas a
  `/api/disciplinas` e `/api/grupos-avaliacao` exigem `requireUserId()` —
  mas as próprias páginas **não estão no `matcher`** e não fazem
  `getServerSession` como `src/app/admin/layout.tsx` faz. Um visitante não
  autenticado consegue abrir essas duas páginas diretamente (só os dados
  é que falham a carregar, sem redirecionar para `/login`). Não replicar
  essa omissão em páginas novas — use `admin/layout.tsx` como referência
  de como proteger uma página no servidor — e sinalizar isto ao
  utilizador se a tarefa tocar nessas páginas, em vez de assumir que já
  estão corretamente protegidas.

## Utilizador não autenticado

* Em páginas: redireciona para `/login` (via middleware, para as rotas no
  `matcher`).
* Em rotas de API: `handleApiError` devolve `401` com
  `{ error: 'Não autenticado' }` para `UnauthorizedError`, e `403` com a
  mensagem de `ForbiddenError` para falta de permissões de admin.

## Segurança

* `NEXTAUTH_SECRET` é obrigatório e vem de variável de ambiente — nunca
  hardcode nem log este valor.
* Nunca devolva `passwordHash` em nenhuma resposta de API.
* Emails são normalizados (`toLowerCase().trim()`) antes de comparar/gravar
  — siga este padrão em qualquer novo fluxo que use email como
  identificador.
