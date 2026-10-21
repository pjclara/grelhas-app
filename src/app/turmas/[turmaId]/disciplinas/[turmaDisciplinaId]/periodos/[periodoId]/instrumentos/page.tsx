'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Table2, ExternalLink, Eye } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/Spinner';
import { useAutoGuardar } from '@/lib/auto-guardar';
import type { Criterio, Instrumento, ModoAvaliacao } from '@/lib/types';

interface PerguntaForm {
  id?: string;
  codigo: string;
  valorMax: string;
}

interface DraftInstrumento {
  nome: string;
  criterioId: string;
  modo: ModoAvaliacao;
  escalaMax: string;
  tema: string;
  data: string;
  perguntas: PerguntaForm[];
}

function estadoVazioInstrumento(): DraftInstrumento {
  return {
    nome: '',
    criterioId: '',
    modo: 'PONTOS',
    escalaMax: '5',
    tema: '',
    data: new Date().toISOString().slice(0, 10),
    perguntas: [{ codigo: '1.', valorMax: '' }],
  };
}

export default function InstrumentosPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string; periodoId: string };
}) {
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nomes, setNomes] = useState<{ turma: string; disciplina: string } | null>(null);

  const [nome, setNome] = useState('');
  const [criterioId, setCriterioId] = useState('');
  const [modo, setModo] = useState<ModoAvaliacao>('PONTOS');
  const [escalaMax, setEscalaMax] = useState('5');
  const [tema, setTema] = useState('');
  const [data, setData] = useState('');
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>([{ codigo: '1.', valorMax: '' }]);
  const [colagem, setColagem] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  const disciplinaBase = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`;
  // Guarda o id do instrumento depois da primeira gravação automática em segundo
  // plano, para que as gravações seguintes (incluindo a submissão manual) atualizem
  // o mesmo registo em vez de criar um duplicado.
  const idCriadoRef = useRef<string | null>(null);

  // Critérios gerais e sub-instrumentos avaliam-se em grelhas (tabela alunos × colunas);
  // os instrumentos de recolha específicos sem sub-instrumentos, em instrumentos com perguntas.
  const criteriosUtilizaveis = criterios.filter((c) => !c.semInstrumentos && c.avaliacao !== 'GRELHA');
  const grelhas = Array.from(
    criterios
      .filter((c) => c.avaliacao === 'GRELHA' && c.bloco)
      .reduce((mapa, c) => {
        const bloco = c.bloco as string;
        const atual = mapa.get(bloco) ?? { chave: bloco, nome: c.blocoNome ?? c.grupo, colunas: [] as string[] };
        atual.colunas.push(c.nome);
        return mapa.set(bloco, atual);
      }, new Map<string, { chave: string; nome: string; colunas: string[] }>())
      .values()
  );
  const instrumentosListados = instrumentos.filter((i) => i.criterio?.avaliacao !== 'GRELHA');
  const grelhaHref = (chave: string) =>
    `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/grelhas/${encodeURIComponent(chave)}`;

  async function carregar() {
    setACarregar(true);
    const [ri, rc, rtd] = await Promise.all([
      fetch(`${disciplinaBase}/instrumentos?periodoId=${params.periodoId}`),
      fetch(`${disciplinaBase}/criterios`),
      fetch(disciplinaBase),
    ]);
    if (!ri.ok || !rc.ok) {
      setErroCarregar('Não foi possível carregar os instrumentos.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setInstrumentos(await ri.json());
    setCriterios(await rc.json());
    if (rtd.ok) {
      const td = await rtd.json();
      setNomes({ turma: td.turma?.nome ?? '…', disciplina: td.disciplina.nome });
    }
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId, params.turmaDisciplinaId, params.periodoId]);

  function atualizarPergunta(i: number, campo: keyof PerguntaForm, valor: string) {
    setPerguntas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  function adicionarPergunta() {
    setPerguntas((prev) => [...prev, { codigo: '', valorMax: '' }]);
  }

  function removerPergunta(i: number) {
    setPerguntas((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Aceita o formato colado de uma folha de cálculo: linha de itens + linha de pontos
  // ("Item 1 2a 2b Total" / "Pontos 40 50 10 100"), ou uma linha "item<TAB>pontos" por pergunta.
  function aplicarColagem() {
    const linhas = colagem
      .split(/\r?\n/)
      .map((l) => l.split(/\t|;/).map((c) => c.trim()))
      .filter((cels) => cels.some((c) => c !== ''));
    const numero = (s: string) => {
      const n = Number(s.replace(',', '.'));
      return s !== '' && Number.isFinite(n) ? n : null;
    };
    let novas: PerguntaForm[] = [];
    if (linhas.length === 2 && linhas[0].length > 2) {
      const [itens, pontos] = linhas.map((l) => l.slice(1));
      novas = itens
        .map((codigo, i) => ({ codigo, valor: numero(pontos[i] ?? '') }))
        .filter((p) => p.codigo !== '' && p.valor !== null && p.codigo.toLowerCase() !== 'total')
        .map((p) => ({ codigo: p.codigo, valorMax: String(p.valor) }));
    } else {
      novas = linhas
        .map(([codigo, valor]) => ({ codigo, valor: numero(valor ?? '') }))
        .filter((p) => p.codigo !== '' && p.valor !== null && p.codigo.toLowerCase() !== 'total')
        .map((p) => ({ codigo: p.codigo, valorMax: String(p.valor) }));
    }
    if (novas.length === 0) {
      setErro('Não foi possível ler as linhas coladas. Cole uma linha de itens e uma linha de pontos, copiadas do Excel.');
      return;
    }
    setErro(null);
    setPerguntas(novas);
    setColagem('');
  }

  function abrirNovo() {
    const base = estadoVazioInstrumento();
    setNome(base.nome);
    setCriterioId(base.criterioId);
    setModo(base.modo);
    setEscalaMax(base.escalaMax);
    setTema(base.tema);
    setData(base.data);
    setPerguntas(base.perguntas);
    idCriadoRef.current = null;
    setErro(null);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
  }

  /** `null` se os campos mínimos para gravar ainda não estiverem preenchidos. */
  function perguntasValidas(): PerguntaForm[] | null {
    if (!nome || !criterioId || !data || perguntas.length === 0) return null;
    const validas = perguntas.filter((p) => p.codigo && p.valorMax);
    return validas.length > 0 ? validas : null;
  }

  async function salvarInstrumento(
    validas: PerguntaForm[]
  ): Promise<{ ok: boolean; dados?: Instrumento; erro?: string }> {
    const corpo = {
      periodoId: params.periodoId,
      criterioId,
      nome,
      modo,
      escalaMax: Number(escalaMax) || 5,
      tema: tema || null,
      data,
      ordem: instrumentos.length,
      perguntas: validas.map((p, idx) => ({
        id: p.id,
        codigo: p.codigo,
        valorMax: Number(p.valorMax),
        ordem: idx,
      })),
    };
    const res = await fetch(
      idCriadoRef.current ? `${disciplinaBase}/instrumentos/${idCriadoRef.current}` : `${disciplinaBase}/instrumentos`,
      {
        method: idCriadoRef.current ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      }
    );
    if (!res.ok) return { ok: false, erro: 'Não foi possível guardar o instrumento.' };
    const dados: Instrumento = await res.json();
    idCriadoRef.current = dados.id;
    return { ok: true, dados };
  }

  /** Repõe no formulário os ids que o servidor atribuiu às perguntas novas, por posição
   * entre as perguntas válidas enviadas — evita duplicá-las (ou apagar as já existentes,
   * já que o PATCH sincroniza pelas ids recebidas) na gravação automática seguinte. */
  function mesclarIdsPerguntas(validas: PerguntaForm[], respostaOrdenada: Array<{ id: string }>) {
    const porId = new Map(validas.map((p, i) => [p, respostaOrdenada[i]?.id]));
    setPerguntas((prev) => prev.map((p) => (porId.has(p) ? { ...p, id: porId.get(p) ?? p.id } : p)));
  }

  async function guardarInstrumento(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const validas = perguntasValidas();
    if (!validas) {
      setErro('Preencha nome, critério, data da avaliação e pelo menos uma pergunta/item com valor máximo.');
      return;
    }
    setAGravar(true);
    const resultado = await salvarInstrumento(validas);
    setAGravar(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Não foi possível criar o instrumento.');
      return;
    }
    idCriadoRef.current = null;
    fecharForm();
    carregar();
  }

  async function autoGuardarInstrumento() {
    const validas = perguntasValidas();
    if (!validas) return;
    const resultado = await salvarInstrumento(validas);
    if (resultado.ok && resultado.dados) {
      mesclarIdsPerguntas(
        validas,
        [...resultado.dados.perguntas].sort((a, b) => a.ordem - b.ordem)
      );
    }
  }

  useAutoGuardar(
    { nome, criterioId, modo, escalaMax, tema, data, perguntas },
    mostrarForm && perguntasValidas() !== null,
    autoGuardarInstrumento
  );

  async function remover(id: string) {
    if (!confirm('Remover este instrumento e todas as notas lançadas nele?')) return;
    await fetch(`${disciplinaBase}/instrumentos/${id}`, { method: 'DELETE' });
    carregar();
  }

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: 'As minhas turmas', href: '/dashboard' },
          { label: nomes?.turma ?? '…', href: `/turmas/${params.turmaId}` },
          {
            label: nomes?.disciplina ?? '…',
            href: `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`,
          },
          { label: 'Instrumentos' },
        ]}
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Instrumentos de avaliação</h1>
        <Button onClick={() => (mostrarForm ? fecharForm() : abrirNovo())}>
          <Plus className="h-4 w-4" />
          Novo instrumento
        </Button>
      </div>

      {mostrarForm && (
        <Card as="form" onSubmit={guardarInstrumento} className="mb-8 space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nome-instrumento">Nome</Label>
              <Input
                id="nome-instrumento"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex: Teste de Avaliação 1"
              />
            </div>
            <div>
              <Label htmlFor="criterio">Critério</Label>
              <Select id="criterio" value={criterioId} onChange={(e) => setCriterioId(e.target.value)}>
                <option value="">Selecionar…</option>
                {criteriosUtilizaveis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grupo} — {c.nome}
                    {c.pesoDefinido === false ? '' : ` (${Math.round(c.peso * 1000) / 10}%)`}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                A média dos instrumentos deste critério conta para a nota final com o peso indicado.
                {criteriosUtilizaveis.length === 0 &&
                  (grelhas.length > 0
                    ? ' Os critérios desta disciplina avaliam-se nas grelhas de notas, listadas abaixo.'
                    : ' Não há critérios com instrumentos de recolha para esta disciplina: peça a um administrador para os definir em Critérios de Avaliação (e confirme que a turma tem ciclo).')}
              </p>
            </div>
            <div>
              <Label htmlFor="modo">Modo de avaliação</Label>
              <Select id="modo" value={modo} onChange={(e) => setModo(e.target.value as ModoAvaliacao)}>
                <option value="PONTOS">Pontos por pergunta (ex.: teste)</option>
                <option value="ESCALA">Escala (ex.: 1 a 5)</option>
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                {modo === 'PONTOS'
                  ? 'Cada pergunta tem uma pontuação máxima; a nota do aluno é a soma em percentagem.'
                  : 'Cada item é avaliado de 1 até à escala máxima.'}
              </p>
            </div>
            {modo === 'ESCALA' && (
              <div>
                <Label htmlFor="escala-max">Escala máxima</Label>
                <Input id="escala-max" type="number" value={escalaMax} onChange={(e) => setEscalaMax(e.target.value)} />
              </div>
            )}
            <div>
              <Label htmlFor="data-instrumento">Data da avaliação</Label>
              <Input
                id="data-instrumento"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tema">Tema (opcional)</Label>
              <Input id="tema" value={tema} onChange={(e) => setTema(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>{modo === 'PONTOS' ? 'Perguntas' : 'Itens da escala'}</Label>
            <div className="mb-3">
              <Label htmlFor="colagem">Colar da folha de cálculo (opcional)</Label>
              <Textarea
                id="colagem"
                rows={3}
                value={colagem}
                onChange={(e) => setColagem(e.target.value)}
                placeholder={'Item\t1\t2a\t2b\t3\t4\tTotal\nPontos\t40\t50\t10\t30\t70\t200'}
                className="font-mono"
              />
              <p className="mt-1 text-xs text-slate-500">
                Substitui as linhas abaixo; pode rever e corrigir antes de criar o instrumento.
              </p>
              <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={aplicarColagem} disabled={!colagem.trim()}>
                Preencher linhas
              </Button>
            </div>
            <div className="space-y-2">
              {perguntas.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Código (ex: 2.1.)"
                    value={p.codigo}
                    onChange={(e) => atualizarPergunta(i, 'codigo', e.target.value)}
                    className="w-40"
                  />
                  <Input
                    type="number"
                    placeholder={modo === 'PONTOS' ? 'Pontos máx.' : 'Escala máx.'}
                    value={p.valorMax}
                    onChange={(e) => atualizarPergunta(i, 'valorMax', e.target.value)}
                    className="w-32"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removerPergunta(i)} aria-label="Remover linha">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={adicionarPergunta}>
              <Plus className="h-4 w-4" />
              Adicionar linha
            </Button>
          </div>

          {erro && <Alert tone="danger">{erro}</Alert>}
          <Button type="submit" loading={aGravar}>
            Criar instrumento
          </Button>
        </Card>
      )}

      {erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : (
        <div className="space-y-2">
          {grelhas.map((g) => (
            <Card key={g.chave} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                  <Table2 className="h-4 w-4" />
                </span>
                <div>
                  <Link href={grelhaHref(g.chave)} className="font-medium text-slate-900 hover:text-brand-700">
                    {g.nome}
                  </Link>
                  <p className="text-xs text-slate-500">Grelha de notas · {g.colunas.join(', ')}</p>
                </div>
              </div>
              <Link href={grelhaHref(g.chave)}>
                <Button size="sm" variant="secondary">
                  <ExternalLink className="h-4 w-4" />
                  Abrir grelha
                </Button>
              </Link>
            </Card>
          ))}
          {instrumentosListados.map((i) => (
            <Card key={i.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link
                  href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/instrumentos/${i.id}`}
                  className="font-medium text-slate-900 hover:text-brand-700"
                >
                  {i.nome}
                </Link>
                <p className="text-xs text-slate-500">
                  {i.criterio?.nome} · {i.perguntas.length} {i.modo === 'PONTOS' ? 'perguntas' : 'itens'} ·{' '}
                  {new Date(i.data).toLocaleDateString('pt-PT')}
                </p>
              </div>
              <div className="flex gap-1">
                <Link
                  href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/instrumentos/${i.id}?ver=1`}
                >
                  <Button size="sm" variant="ghost" aria-label="Ver" title="Ver notas sem editar">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/instrumentos/${i.id}`}
                >
                  <Button size="sm" variant="ghost" aria-label="Editar tabela" title="Editar tabela de notas">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remover(i.id)}
                  aria-label="Apagar instrumento"
                  title="Apaga também todas as notas lançadas neste instrumento"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
          {instrumentosListados.length === 0 && grelhas.length === 0 && (
            <Card>
              <div className="py-8 text-center text-sm text-slate-400">
                <p>Ainda não há grelhas nem instrumentos neste período.</p>
                <p className="mt-1">
                  Crie um instrumento (teste, trabalho…) e depois abra-o para lançar as notas dos alunos.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
