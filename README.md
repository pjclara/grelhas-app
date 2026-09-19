# Grelhas de Avaliação

Aplicação web para substituir a folha de Excel de avaliação de turmas:
turmas → alunos → critérios de avaliação (pesos configuráveis) →
instrumentos (testes, outros instrumentos, atitudes) → notas por
pergunta/item → cálculo automático da nota final, nível e estatísticas de
turma, com exportação para PDF e Excel.

Stack: **Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL +
NextAuth**, pronta a alojar na **Vercel** com uma base de dados **Neon**
(ou qualquer Postgres).

## 1. Configurar localmente

```bash
npm install
cp .env.example .env
# edite .env com o DATABASE_URL da sua base de dados Postgres
# gere um segredo com: openssl rand -base64 32

npx prisma migrate dev --name init
npm run dev
```

Abra http://localhost:3000, crie uma conta em `/register` e comece a criar
turmas.

## 2. Criar a base de dados (Neon, gratuito)

1. Crie uma conta em https://neon.tech e um projeto novo.
2. Copie a "connection string" (formato `postgresql://...`) para
   `DATABASE_URL` no seu `.env` (local) e nas variáveis de ambiente da
   Vercel (produção).

## 3. Importar os dados do Excel existente

Depois de criar a sua conta em `/register`:

```bash
npm run import:xlsx -- --email=SEU_EMAIL --file="Grelha avaliação 9F_2.xlsx"
```

Isto cria a turma, alunos, critérios de avaliação (com os mesmos pesos:
45% testes, 30% outros instrumentos, 5×5% atitudes), os instrumentos de
avaliação de cada semestre e todas as notas já lançadas na folha original.
Reveja depois a turma importada em `/turmas/[id]` — os critérios são
editáveis em `/turmas/[id]/criterios`.

## 4. Deploy na Vercel

1. Suba este projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. Em https://vercel.com → "Add New Project" → importe o repositório.
3. Nas variáveis de ambiente do projeto na Vercel, defina:
   - `DATABASE_URL` — a mesma connection string do Neon
   - `NEXTAUTH_URL` — o domínio final (ex.: `https://a-sua-app.vercel.app`)
   - `NEXTAUTH_SECRET` — o mesmo segredo gerado acima
4. Deploy. O `build` corre automaticamente `prisma generate` e
   `next build` (ver `package.json`).
5. Depois do primeiro deploy, corra as migrações contra a base de dados de
   produção (uma vez, a partir da sua máquina, com o `DATABASE_URL` de
   produção no `.env`):
   ```bash
   npx prisma migrate deploy
   ```

## Notas sobre o cálculo da nota final

Cada **critério** (ex.: "Testes de avaliação" 45%, "Responsabilidade..."
5%) tem um peso configurável em `/turmas/[id]/criterios` — os pesos devem
somar 100%. Cada critério é alimentado por um ou mais **instrumentos**
(testes, fichas, trabalhos, itens de atitude), cada um com perguntas/itens
com pontuação máxima própria. A nota final de um aluno num período é a
soma ponderada da percentagem média de cada critério, só calculada quando
todos os critérios com peso têm pelo menos uma nota lançada.

> Na folha de Excel original a fórmula da nota final somava médias em
> escalas diferentes (0-20 pontos vs. 0-25 na soma das atitudes) sem as
> normalizar — o que a própria grelha assinalava com um "??" na folha de
> resumo. Esta aplicação normaliza todas as componentes para 0-100% antes
> de aplicar o peso, o que corrige essa inconsistência mantendo a mesma
> lógica de cálculo. Os limiares de nível (1 a 5) são configuráveis por
> turma (campo em `Turma`), com o valor por omissão igual ao da grelha
> original (20% / 50% / 70% / 90%).

## Estrutura do projeto

```
prisma/schema.prisma        modelo de dados
src/lib/calc.ts             motor de cálculo de médias e níveis
src/lib/resumo.ts           agrega turma + notas para a folha de resumo
src/app/api/...             rotas da API (Route Handlers)
src/app/...                 páginas (App Router)
scripts/import-xlsx.ts      importador do Excel original
```
