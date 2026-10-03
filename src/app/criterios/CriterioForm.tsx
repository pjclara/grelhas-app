'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import type { AnoLetivo, Ciclo, CriterioCatalogo, GrupoDisciplinar, TipoCriterio } from '@/lib/types';

interface SubFormValues {
  id?: string; // presente ao editar um sub-instrumento já existente
  nome: string;
  peso: string; // percentagem; vazio = sem peso
}

interface InstrumentoFormValues {
  id?: string; // presente ao editar um instrumento de recolha já existente
  nome: string;
  peso: string; // percentagem; vazio = sem peso
  subInstrumentos: SubFormValues[];
}

export interface CriterioFormValues {
  anoLetivoId: string;
  cicloId: string;
  nome: string;
  peso: string; // percentagem
  tipo: TipoCriterio;
  grupoDisciplinarId: string;
  instrumentosRecolha: InstrumentoFormValues[];
}

/** Corpo enviado à API (pesos em 0..1). */
export interface CriterioPayload {
  anoLetivoId: string;
  cicloId: string;
  nome: string;
  peso: number;
  tipo: TipoCriterio;
  grupoDisciplinarId: string | null;
  instrumentosRecolha: Array<{
    id?: string;
    nome: string;
    peso: number | null;
    subInstrumentos: Array<{ id?: string; nome: string; peso: number | null }>;
  }>;
}

interface CriterioFormProps {
  valoresIniciais?: CriterioFormValues;
  aoSubmeter: (payload: CriterioPayload) => void | Promise<void>;
  aEnviar: boolean;
  erro: string | null;
  textoSubmeter: string;
  cancelarHref?: string;
}

const TOLERANCIA = 0.1; // pontos percentuais

function paraPercent(fracao: number | null): string {
  return fracao === null ? '' : String(Math.round(fracao * 10000) / 100);
}

function paraFracao(percent: string): number | null {
  if (percent.trim() === '') return null;
  return Number((Number(percent.replace(',', '.')) / 100).toFixed(4));
}

/** Converte um critério da API nos valores (em %) do formulário. */
export function valoresDeCriterio(c: CriterioCatalogo): CriterioFormValues {
  return {
    anoLetivoId: c.anoLetivoId,
    cicloId: c.cicloId,
    nome: c.nome,
    peso: paraPercent(c.peso),
    tipo: c.tipo,
    grupoDisciplinarId: c.grupoDisciplinarId ?? '',
    instrumentosRecolha: c.instrumentosRecolha.map((ir) => ({
      id: ir.id,
      nome: ir.nome,
      peso: paraPercent(ir.peso),
      subInstrumentos: ir.subInstrumentos.map((s) => ({ id: s.id, nome: s.nome, peso: paraPercent(s.peso) })),
    })),
  };
}

function estadoVazio(): CriterioFormValues {
  return {
    anoLetivoId: '',
    cicloId: '',
    nome: '',
    peso: '',
    tipo: 'GERAL',
    grupoDisciplinarId: '',
    instrumentosRecolha: [],
  };
}

function numeroValido(percent: string): boolean {
  const n = Number(percent.replace(',', '.'));
  return percent.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 100;
}

function paraNumero(percent: string): number {
  return Number(percent.replace(',', '.'));
}

/**
 * Irmãos: ou nenhum tem peso (média simples) ou todos têm e somam o peso do
 * item pai (`totalPai`, em %). Instrumentos somam o peso do critério;
 * sub-instrumentos somam o peso do instrumento.
 */
function erroPesosIrmaos(itens: { peso: string }[], totalPai: string): string | null {
  const comPeso = itens.filter((i) => i.peso.trim() !== '');
  if (comPeso.length === 0) return null;
  if (!numeroValido(totalPai)) return 'Defina primeiro o peso do item pai para poder dar peso a estes itens.';
  if (comPeso.length !== itens.length) return 'Ou todos os itens têm peso, ou nenhum tem.';
  if (comPeso.some((i) => !numeroValido(i.peso))) return 'Os pesos têm de estar entre 0 e 100.';
  const soma = comPeso.reduce((acc, i) => acc + paraNumero(i.peso), 0);
  const total = paraNumero(totalPai);
  if (Math.abs(soma - total) > TOLERANCIA) {
    return `Os pesos somam ${Math.round(soma * 100) / 100}% e têm de somar ${total}%.`;
  }
  return null;
}

function SomaPesos({ itens, totalPai }: { itens: { peso: string }[]; totalPai: string }) {
  const comPeso = itens.filter((i) => i.peso.trim() !== '');
  if (comPeso.length === 0) return null;
  const soma = comPeso.reduce((acc, i) => acc + (paraNumero(i.peso) || 0), 0);
  const certo =
    numeroValido(totalPai) && Math.abs(soma - paraNumero(totalPai)) <= TOLERANCIA && comPeso.length === itens.length;
  return (
    <span className={certo ? 'text-xs text-emerald-700' : 'text-xs text-amber-700'}>
      Soma: {Math.round(soma * 100) / 100}%{numeroValido(totalPai) ? ` de ${paraNumero(totalPai)}%` : ''}
    </span>
  );
}

/** Formulário de critério partilhado entre /criterios/novo e /criterios/[id]/editar. */
export default function CriterioForm({
  valoresIniciais,
  aoSubmeter,
  aEnviar,
  erro,
  textoSubmeter,
  cancelarHref = '/criterios',
}: CriterioFormProps) {
  const [form, setForm] = useState<CriterioFormValues>(valoresIniciais ?? estadoVazio());
  const [anos, setAnos] = useState<AnoLetivo[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [grupos, setGrupos] = useState<GrupoDisciplinar[]>([]);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/anos-letivos').then((r) => r.json()),
      fetch('/api/ciclos').then((r) => r.json()),
      fetch('/api/grupos-disciplinares').then((r) => r.json()),
    ]).then(([a, c, g]: [AnoLetivo[], Ciclo[], GrupoDisciplinar[]]) => {
      setAnos(a);
      setCiclos(c);
      setGrupos(g);
      if (!valoresIniciais) {
        setForm((f) => ({ ...f, anoLetivoId: f.anoLetivoId || a[0]?.id || '' }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (valoresIniciais) setForm(valoresIniciais);
  }, [valoresIniciais]);

  const especifico = form.tipo === 'ESPECIFICO';

  function mudarTipo(tipo: TipoCriterio) {
    setForm((f) => ({
      ...f,
      tipo,
      grupoDisciplinarId: tipo === 'GERAL' ? '' : f.grupoDisciplinarId,
      // sub-instrumentos só existem em critérios específicos
      instrumentosRecolha:
        tipo === 'GERAL' ? f.instrumentosRecolha.map((ir) => ({ ...ir, subInstrumentos: [] })) : f.instrumentosRecolha,
    }));
  }

  function mudarInstrumento(i: number, parcial: Partial<InstrumentoFormValues>) {
    setForm((f) => ({
      ...f,
      instrumentosRecolha: f.instrumentosRecolha.map((ir, idx) => (idx === i ? { ...ir, ...parcial } : ir)),
    }));
  }

  function mudarSub(i: number, j: number, parcial: Partial<SubFormValues>) {
    setForm((f) => ({
      ...f,
      instrumentosRecolha: f.instrumentosRecolha.map((ir, idx) =>
        idx === i
          ? { ...ir, subInstrumentos: ir.subInstrumentos.map((s, sIdx) => (sIdx === j ? { ...s, ...parcial } : s)) }
          : ir
      ),
    }));
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErroLocal(null);

    if (!form.anoLetivoId) return setErroLocal('Escolha o ano letivo.');
    if (!form.cicloId) return setErroLocal('Escolha o ciclo.');
    if (form.nome.trim().length < 2) return setErroLocal('Indique o nome do critério.');
    if (!numeroValido(form.peso)) return setErroLocal('Indique o peso do critério (0 a 100%).');
    if (especifico && !form.grupoDisciplinarId) return setErroLocal('Escolha o grupo disciplinar do critério específico.');

    for (const [i, ir] of form.instrumentosRecolha.entries()) {
      if (!ir.nome.trim()) return setErroLocal(`Indique o nome do instrumento ${i + 1}.`);
      for (const s of ir.subInstrumentos) {
        if (!s.nome.trim()) return setErroLocal(`Indique o nome de todos os sub-instrumentos de "${ir.nome}".`);
      }
      const erroSub = erroPesosIrmaos(ir.subInstrumentos, ir.peso);
      if (erroSub) return setErroLocal(`Sub-instrumentos de "${ir.nome}": ${erroSub}`);
    }
    const erroInstrumentos = erroPesosIrmaos(form.instrumentosRecolha, form.peso);
    if (erroInstrumentos) return setErroLocal(`Instrumentos de recolha: ${erroInstrumentos}`);

    aoSubmeter({
      anoLetivoId: form.anoLetivoId,
      cicloId: form.cicloId,
      nome: form.nome.trim(),
      peso: paraFracao(form.peso) ?? 0,
      tipo: form.tipo,
      grupoDisciplinarId: especifico ? form.grupoDisciplinarId : null,
      instrumentosRecolha: form.instrumentosRecolha.map((ir) => ({
        id: ir.id,
        nome: ir.nome.trim(),
        peso: paraFracao(ir.peso),
        subInstrumentos: especifico
          ? ir.subInstrumentos.map((s) => ({ id: s.id, nome: s.nome.trim(), peso: paraFracao(s.peso) }))
          : [],
      })),
    });
  }

  return (
    <Card as="form" onSubmit={submeter} className="flex flex-col gap-5 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ano-letivo">Ano letivo</Label>
          <Select
            id="ano-letivo"
            value={form.anoLetivoId}
            onChange={(e) => setForm((f) => ({ ...f, anoLetivoId: e.target.value }))}
          >
            <option value="">Selecione…</option>
            {anos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ciclo">Ciclo</Label>
          <Select
            id="ciclo"
            value={form.cicloId}
            onChange={(e) => setForm((f) => ({ ...f, cicloId: e.target.value }))}
          >
            <option value="">Selecione…</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <Label htmlFor="nome-criterio">Nome do critério</Label>
          <Input
            id="nome-criterio"
            placeholder="ex: Conhecimentos e Capacidades"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="peso-criterio">Peso (%)</Label>
          <Input
            id="peso-criterio"
            inputMode="decimal"
            placeholder="ex: 70"
            value={form.peso}
            onChange={(e) => setForm((f) => ({ ...f, peso: e.target.value }))}
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Âmbito</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="tipo"
              checked={form.tipo === 'GERAL'}
              onChange={() => mudarTipo('GERAL')}
            />
            Geral (todo o ciclo)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="tipo"
              checked={form.tipo === 'ESPECIFICO'}
              onChange={() => mudarTipo('ESPECIFICO')}
            />
            Específico (um grupo disciplinar)
          </label>
        </div>
      </fieldset>

      {especifico && (
        <div className="sm:max-w-sm">
          <Label htmlFor="grupo-disciplinar">Grupo disciplinar</Label>
          <Select
            id="grupo-disciplinar"
            value={form.grupoDisciplinarId}
            onChange={(e) => setForm((f) => ({ ...f, grupoDisciplinarId: e.target.value }))}
          >
            <option value="">Selecione…</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </Select>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Instrumentos de recolha</h2>
            <p className="text-xs text-slate-500">
              Deixe o peso em branco para média simples. Se indicar pesos, têm de somar o peso do critério.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SomaPesos itens={form.instrumentosRecolha} totalPai={form.peso} />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  instrumentosRecolha: [...f.instrumentosRecolha, { nome: '', peso: '', subInstrumentos: [] }],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Instrumento
            </Button>
          </div>
        </div>

        {form.instrumentosRecolha.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
            Ainda sem instrumentos de recolha. Pode guardar o critério agora e acrescentá-los depois.
          </p>
        )}

        {form.instrumentosRecolha.map((ir, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-3">
            <div className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
              <div>
                <Label htmlFor={`ir-nome-${i}`}>Nome do instrumento</Label>
                <Input
                  id={`ir-nome-${i}`}
                  placeholder="ex: Testes"
                  value={ir.nome}
                  onChange={(e) => mudarInstrumento(i, { nome: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`ir-peso-${i}`}>Peso (%)</Label>
                <Input
                  id={`ir-peso-${i}`}
                  inputMode="decimal"
                  value={ir.peso}
                  onChange={(e) => mudarInstrumento(i, { peso: e.target.value })}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remover instrumento ${ir.nome || i + 1}`}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    instrumentosRecolha: f.instrumentosRecolha.filter((_, idx) => idx !== i),
                  }))
                }
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            {especifico && (
              <div className="mt-3 border-l-2 border-slate-200 pl-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Sub-instrumentos
                  </span>
                  <div className="flex items-center gap-3">
                    <SomaPesos itens={ir.subInstrumentos} totalPai={ir.peso} />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        mudarInstrumento(i, { subInstrumentos: [...ir.subInstrumentos, { nome: '', peso: '' }] })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Sub-instrumento
                    </Button>
                  </div>
                </div>
                {ir.subInstrumentos.map((s, j) => (
                  <div key={j} className="mb-2 grid grid-cols-[1fr_6rem_auto] items-center gap-2">
                    <Input
                      aria-label={`Nome do sub-instrumento ${j + 1} de ${ir.nome || `instrumento ${i + 1}`}`}
                      placeholder="ex: Ficha 1"
                      value={s.nome}
                      onChange={(e) => mudarSub(i, j, { nome: e.target.value })}
                    />
                    <Input
                      aria-label={`Peso (%) do sub-instrumento ${j + 1}`}
                      inputMode="decimal"
                      placeholder="%"
                      value={s.peso}
                      onChange={(e) => mudarSub(i, j, { peso: e.target.value })}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remover sub-instrumento ${s.nome || j + 1}`}
                      onClick={() =>
                        mudarInstrumento(i, { subInstrumentos: ir.subInstrumentos.filter((_, sIdx) => sIdx !== j) })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={aEnviar}>
          {textoSubmeter}
        </Button>
        <Link href={cancelarHref}>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
      {(erro ?? erroLocal) && <Alert tone="danger">{erro ?? erroLocal}</Alert>}
    </Card>
  );
}
