# Regras de layout, navegação e responsividade

Baseado no código real em `src/components/Sidebar.tsx`,
`src/components/TopNav.tsx` e `tailwind.config.ts`.

## Estado real do código (ler antes de tudo)

* `Sidebar.tsx` é uma `<aside className="w-52 shrink-0 ...">` de largura
  fixa, sempre visível, sem `useState`, sem toggle e sem qualquer classe
  `sm:`/`md:`/`lg:`. **Não existe hoje colapso nem drawer mobile.**
* `TopNav.tsx` também não tem nenhum comportamento responsivo (sem menu
  hambúrguer, sem breakpoints).
* `tailwind.config.ts` só define a cor `brand-*` — não define breakpoints
  nem uma escala de espaçamento customizados. Os breakpoints disponíveis
  são os valores por omissão do Tailwind (`sm`, `md`, `lg`, `xl`, `2xl`).
* Um pequeno número de páginas já usa classes responsivas (`sm:`/`md:`/
  `lg:`): `dashboard/page.tsx`, `admin/page.tsx`,
  `turmas/[turmaId]/page.tsx`, `turmas/[turmaId]/periodos/[periodoId]/
  instrumentos/page.tsx` e `.../resumo/page.tsx`. São a referência real
  mais próxima de um padrão de responsividade no projeto — consulte-as
  antes de inventar uma abordagem nova.

Isto significa que grande parte do layout (sidebar/nav) **não é
responsiva hoje**. Não descreva nem implemente um comportamento de
sidebar colapsável/drawer como se já fizesse parte do produto.

## Regra ao alterar uma página existente

Ao modificar uma página existente, não redesenhar o layout do zero.
Primeiro identificar:

* o layout global utilizado — não existe um `layout.tsx` partilhado que
  englobe `Sidebar`/`TopNav`; cada página importa e compõe estes dois
  componentes diretamente (ver `dashboard/page.tsx` como referência);
* os componentes de navegação existentes;
* os breakpoints já usados nas páginas responsivas listadas acima;
* os padrões utilizados por páginas semelhantes.

Depois reutilizar esses elementos em vez de criar uma solução paralela.

Qualquer alteração estrutural significativa deve ser justificada pela
necessidade de melhorar responsividade, usabilidade, acessibilidade ou
consistência com o sistema de design existente — evite alterações
puramente estéticas que introduzam padrões diferentes dos já utilizados
no produto. Tornar a sidebar responsiva/colapsável é uma alteração
estrutural significativa: apresente o plano (ficheiros afetados, risco de
quebrar `Sidebar.tsx`/`TopNav.tsx` noutras páginas) antes de implementar,
seguindo o processo da secção 3 do `claude.md`.

## Diretrizes para quando for pedida responsividade

Estas diretrizes aplicam-se quando uma tarefa pedir explicitamente para
tornar uma página, a sidebar ou a navegação responsiva — não descrevem
comportamento já implementado.

### Geral

* Toda interface deve continuar a funcionar em desktop, tablet e
  telemóvel — não tratar mobile como uma simples redução do desktop.
* Evitar overflow horizontal; garantir que textos, botões, inputs,
  tabelas e cards permanecem utilizáveis em ecrãs pequenos.
* Usar os breakpoints por omissão do Tailwind (não inventar valores
  arbitrários) e seguir o padrão já usado nas páginas responsivas
  existentes.

### Sidebar (se for pedido tornar responsiva)

* Em desktop, manter a sidebar visível como hoje.
* Em ecrãs pequenos, preferir um padrão de drawer (aberto/fechado) em vez
  de a sidebar ocupar permanentemente espaço — com uma forma clara de
  fechar, e idealmente fechando após a seleção de uma rota.
* Se for introduzido um estado colapsado em desktop, preservar os ícones
  das opções principais e usar tooltip para identificar ações quando o
  label ficar oculto.
* Isto é uma funcionalidade nova, não uma migração de um padrão
  existente — implemente apenas o que for pedido, sem adicionar estados
  extra não solicitados.

## Consistência

Antes de criar ou alterar um layout:

1. identificar como as páginas existentes estruturam a sidebar/nav hoje
   (estado real acima, não um estado desejado);
2. identificar os breakpoints já usados nas páginas responsivas
   existentes;
3. identificar componentes de layout já existentes;
4. reutilizar esses padrões sempre que possível.

Não criar uma nova solução de navegação ou layout se já existir uma
solução equivalente no projeto.

## Regra principal

O layout deve adaptar-se ao dispositivo sem perder a identidade visual do
produto. A experiência em PC e telemóvel deve parecer parte do mesmo
produto, e não duas interfaces diferentes — mas isso só se aplica àquilo
que for efetivamente implementado; não presuma que já existe.
