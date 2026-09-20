# Regras de Git

## Convenções observadas no histórico real

O histórico de commits (`git log`) segue o padrão
`tipo: descrição em português, minúsculas, no imperativo`, por exemplo:

```
feat: add disciplinas CRUD page and sidebar navigation
feat: restrict nível de ensino to fixed options, hide níveis for Secundário
feat: allow editing existing students
```

O prefixo e a descrição estão sempre em **inglês** (mesmo a app sendo em
português) — não misture idiomas nem escreva a descrição em português.

Não existe `commitlint`, `husky` ou qualquer hook de Git configurado no
projeto para impor esta convenção — é uma **sugestão opcional** baseada no
padrão já usado, não uma regra obrigatória. Não invente uma convenção mais
rígida (ex.: Conventional Commits completo com `scope`) que o projeto não
usa.

## Branch strategy

Não identificado — o repositório tem apenas a branch `main` neste momento,
sem evidência de uma estratégia de branches (`develop`, `release/*`, etc.)
documentada ou em uso.

## Regras obrigatórias para o agente

* Nunca faça `git commit` sem o utilizador pedir explicitamente.
* Nunca faça `git push` sem o utilizador pedir explicitamente.
* Nunca reescreva histórico (`git rebase`, `git commit --amend`,
  `git push --force`) sem autorização explícita e específica para essa
  ação.
* Prefira sempre criar um novo commit a alterar um commit existente.
* Mantenha commits pequenos e focados numa alteração lógica coesa.
* Antes de commitar, corra `git status` e `git diff` (ou `git diff
  --staged`) e confirme que só ficheiros relacionados com a tarefa estão
  incluídos.
* Nunca use `git add -A` ou `git add .` às cegas — adicione ficheiros
  específicos por nome.

## Ficheiros que nunca devem ser commitados

Já cobertos por `.gitignore`, mas reforce esta verificação sempre que
revir um `git status`:

* `.env`, `.env*.local` (segredos: `DATABASE_URL`, `NEXTAUTH_SECRET`)
* `/node_modules`
* `/.next/`, `/out/`
* `*.tsbuildinfo`

Se `.env.local` ou `.env` aparecerem como "untracked" prontos a serem
adicionados, alerte o utilizador antes de continuar — nunca os inclua num
commit mesmo que peçam para "adicionar tudo".

## Pull requests

Não identificado nenhum template de PR (`.github/PULL_REQUEST_TEMPLATE.md`)
nem workflow de CI associado a PRs neste repositório. Ao abrir uma PR (só
quando pedido explicitamente), descreva o "porquê" da mudança, não apenas
o "o quê", e liste os comandos de validação realmente executados
(`npm run lint`, `npx tsc --noEmit`).
