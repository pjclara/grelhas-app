'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink, Smile } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/Spinner';
import type { Criterio, Instrumento, ModoAvaliacao } from '@/lib/types';

interface PerguntaForm {
  id?: string;
  codigo: string;
  valorMax: string;
}

const ATITUDES_OPTION = '__ATITUDES__';

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
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [criterioId, setCriterioId] = useState('');
  const [modo, setModo] = useState<ModoAvaliacao>('PONTOS');
  const [escalaMax, setEscalaMax] = useState('5');
  const [tema, setTema] = useState('');
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>([{ codigo: '1.', valorMax: '' }]);
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  const disciplinaBase = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`;

  const criteriosAtitude = criterios.filter((c) => c.grupo === 'Atitudes');
  const instrumentosAtitude = instrumentos.filter((i) => i.criterio?.grupo === 'Atitudes');
  const instrumentosOutros = instrumentos.filter((i) => i.criterio?.grupo !== 'Atitudes');
  const grelhaAtitudesJaCriada =
    criteriosAtitude.length > 0 &&
    criteriosAtitude.every((c) => instrumentosAtitude.some((i) => i.criterioId === c.id));
  const atitudesHref = `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/atitudes`;
  const isAtitudes = criterioId === ATITUDES_OPTION;

  async function carregar() {
    setACarregar(true);
    const [ri, rc] = await Promise.all([
      fetch(`${disciplinaBase}/instrumentos?periodoId=${params.periodoId}`),
      fetch(`${disciplinaBase}/criterios`),
    ]);
    if (!ri.ok || !rc.ok) {
      setErroCarregar('Não foi possível carregar os instrumentos.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setInstrumentos(await ri.json());
    setCriterios(await rc.json());
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

  function abrirNovo() {
    setEditandoId(null);
    setNome('');
    setCriterioId('');
    setModo('PONTOS');
    setEscalaMax('5');
    setTema('');
    setPerguntas([{ codigo: '1.', valorMax: '' }]);
    setErro(null);
    setMostrarForm(true);
  }

  function iniciarEdicao(instrumento: Instrumento) {
    setEditandoId(instrumento.id);
    setNome(instrumento.nome);
    setCriterioId(instrumento.criterioId);
    setModo(instrumento.modo);
    setEscalaMax(String(instrumento.escalaMax));
    setTema(instrumento.tema ?? '');
    setPerguntas(
      instrumento.perguntas.map((p) => ({ id: p.id, codigo: p.codigo, valorMax: String(p.valorMax) }))
    );
    setErro(null);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
    setEditandoId(null);
  }

  async function criarGrelhaAtitudes() {
    setErro(null);
    setAGravar(true);
    const resultados = await Promise.all(
      criteriosAtitude.map((c) =>
        fetch(`${disciplinaBase}/instrumentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodoId: params.periodoId,
            criterioId: c.id,
            nome: c.nome,
            modo: 'ESCALA',
            escalaMax: 5,
            ordem: c.ordem,
            perguntas: [{ codigo: 'Nota', valorMax: 5, ordem: 0 }],
          }),
        })
      )
    );
    setAGravar(false);
    if (resultados.some((r) => !r.ok)) {
      setErro('Não foi possível criar a grelha de Atitudes.');
      return;
    }
    fecharForm();
    carregar();
  }

  async function guardarInstrumento(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (criterioId === ATITUDES_OPTION) {
      await criarGrelhaAtitudes();
      return;
    }
    if (!nome || !criterioId || perguntas.length === 0) {
      setErro('Preencha nome, critério e pelo menos uma pergunta/item.');
      return;
    }
    const perguntasValidas = perguntas.filter((p) => p.codigo && p.valorMax);
    if (perguntasValidas.length === 0) {
      setErro('Adicione pelo menos uma pergunta/item com valor máximo.');
      return;
    }
    setAGravar(true);
    const corpo = {
      periodoId: params.periodoId,
      criterioId,
      nome,
      modo,
      escalaMax: Number(escalaMax) || 5,
      tema: tema || null,
      ordem: editandoId ? undefined : instrumentos.length,
      perguntas: perguntasValidas.map((p, idx) => ({
        id: p.id,
        codigo: p.codigo,
        valorMax: Number(p.valorMax),
        ordem: idx,
      })),
    };
    const res = editandoId
      ? await fetch(`${disciplinaBase}/instrumentos/${editandoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
        })
      : await fetch(`${disciplinaBase}/instrumentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
        });
    setAGravar(false);
    if (!res.ok) {
      setErro(editandoId ? 'Não foi possível guardar as alterações.' : 'Não foi possível criar o instrumento.');
      return;
    }
    fecharForm();
    carregar();
  }

  async function remover(id: string) {
    if (!confirm('Remover este instrumento e todas as notas lançadas nele?')) return;
    await fetch(`${disciplinaBase}/instrumentos/${id}`, { method: 'DELETE' });
    carregar();
  }

  async function removerGrelhaAtitudes() {
    if (
      !confirm(
        `Remover a grelha de Atitudes (${instrumentosAtitude.length} critérios) e todas as notas lançadas nela?`
      )
    )
      return;
    await Promise.all(
      instrumentosAtitude.map((i) => fetch(`${disciplinaBase}/instrumentos/${i.id}`, { method: 'DELETE' }))
    );
    carregar();
  }

  return (
    <AppShell>
      <Link
        href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à disciplina
      </Link>
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
            {!isAtitudes && (
              <div>
                <Label htmlFor="nome-instrumento">Nome</Label>
                <Input
                  id="nome-instrumento"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="ex: Teste de Avaliação 1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="criterio">Critério</Label>
              <Select id="criterio" value={criterioId} onChange={(e) => setCriterioId(e.target.value)}>
                <option value="">Selecionar…</option>
                {criterios
                  .filter((c) => c.grupo !== 'Atitudes')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grupo} — {c.nome} ({Math.round(c.peso * 100)}%)
                    </option>
                  ))}
                {criteriosAtitude.length > 0 && !editandoId && (
                  <option value={ATITUDES_OPTION} disabled={grelhaAtitudesJaCriada}>
                    {grelhaAtitudesJaCriada
                      ? 'Atitudes — grelha já criada'
                      : `Atitudes — grelha com todos os critérios (${criteriosAtitude.length})`}
                  </option>
                )}
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                A média dos instrumentos deste critério conta para a nota final com o peso indicado.
                {criterios.length === 0 && ' Ainda não há critérios: defina-os primeiro na disciplina.'}
              </p>
            </div>
            {!isAtitudes && (
              <div>
                <Label htmlFor="modo">Modo de avaliação</Label>
                <Select id="modo" value={modo} onChange={(e) => setModo(e.target.value as ModoAvaliacao)}>
                  <option value="PONTOS">Pontos por pergunta (ex.: teste)</option>
                  <option value="ESCALA">Escala (ex.: 1 a 5, atitudes)</option>
                </Select>
                <p className="mt-1 text-xs text-slate-500">
                  {modo === 'PONTOS'
                    ? 'Cada pergunta tem uma pontuação máxima; a nota do aluno é a soma em percentagem.'
                    : 'Cada item é avaliado de 1 até à escala máxima.'}
                </p>
              </div>
            )}
            {!isAtitudes && modo === 'ESCALA' && (
              <div>
                <Label htmlFor="escala-max">Escala máxima</Label>
                <Input id="escala-max" type="number" value={escalaMax} onChange={(e) => setEscalaMax(e.target.value)} />
              </div>
            )}
            {!isAtitudes && (
              <div>
                <Label htmlFor="tema">Tema (opcional)</Label>
                <Input id="tema" value={tema} onChange={(e) => setTema(e.target.value)} />
              </div>
            )}
          </div>

          {isAtitudes ? (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Vai ser criada uma grelha com uma coluna por critério, com escala de 1 a 5:
              <ul className="mt-1 list-inside list-disc">
                {criteriosAtitude.map((c) => (
                  <li key={c.id}>{c.nome}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <Label>{modo === 'PONTOS' ? 'Perguntas' : 'Itens da escala'}</Label>
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
          )}

          {erro && <Alert tone="danger">{erro}</Alert>}
          <Button type="submit" loading={aGravar} disabled={isAtitudes && grelhaAtitudesJaCriada}>
            {isAtitudes ? 'Criar grelha de Atitudes' : editandoId ? 'Guardar alterações' : 'Criar instrumento'}
          </Button>
        </Card>
      )}

      {erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : (
        <div className="space-y-2">
          {instrumentosOutros.map((i) => (
            <Card key={i.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link
                  href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/instrumentos/${i.id}`}
                  className="font-medium text-slate-900 hover:text-brand-700"
                >
                  {i.nome}
                </Link>
                <p className="text-xs text-slate-500">
                  {i.criterio?.nome} · {i.perguntas.length} {i.modo === 'PONTOS' ? 'perguntas' : 'itens'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => iniciarEdicao(i)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remover(i.id)}
                  aria-label="Remover"
                  title="Apaga também todas as notas lançadas neste instrumento"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
          {instrumentosAtitude.length > 0 && (
            <Card className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                  <Smile className="h-4 w-4" />
                </span>
                <div>
                  <Link href={atitudesHref} className="font-medium text-slate-900 hover:text-brand-700">
                    Atitudes
                  </Link>
                  <p className="text-xs text-slate-500">{instrumentosAtitude.length} critérios · escala de 1 a 5</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link href={atitudesHref}>
                  <Button size="sm" variant="ghost" aria-label="Abrir grelha">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => removerGrelhaAtitudes()} aria-label="Remover">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          )}
          {instrumentos.length === 0 && (
            <Card>
              <div className="py-8 text-center text-sm text-slate-400">
                <p>Ainda não há instrumentos neste período.</p>
                <p className="mt-1">
                  Crie um instrumento (teste, trabalho, atitudes…) e depois abra-o para lançar as notas dos alunos.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
