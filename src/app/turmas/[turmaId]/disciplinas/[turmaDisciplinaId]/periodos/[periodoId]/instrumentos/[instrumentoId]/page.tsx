'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mic, Square, CheckCircle2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/Spinner';
import type { AlunoTurma, Instrumento } from '@/lib/types';

interface NotaValor {
  [perguntaId: string]: string; // string para permitir campo vazio no input
}

interface CelulaGrelha {
  alunoId: string;
  perguntaId: string;
}

interface Inscricao {
  alunoId: string;
  ativo: boolean;
  aluno: AlunoTurma;
}

// A Web Speech API não está nos tipos padrão do TS DOM; usamos `any` para o objeto de reconhecimento.
type SpeechRecognitionInstance = any;

const PALAVRAS_AVANCAR = ['seguinte', 'próximo', 'próxima', 'avançar'];
const PALAVRAS_RECUAR = ['anterior', 'voltar', 'recuar'];
const PALAVRAS_PARAR = ['parar', 'terminar', 'sair', 'para'];
const PALAVRAS_LIMPAR = ['apagar', 'limpar', 'vazio'];

/** Extrai o primeiro número (com vírgula ou ponto decimal) de uma frase ditada. */
function extrairNumero(transcript: string): string | null {
  const normalizado = transcript.replace(',', '.');
  const match = normalizado.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

/** Normaliza um código de pergunta para comparação (minúsculas, sem pontos/espaços). */
function normalizarCodigo(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Extrai "aluno [número] X" de uma frase ditada, ex.: "aluno número 3" -> 3. */
function extrairAlunoNumero(transcript: string): number | null {
  const m = transcript.match(/aluno\s*(?:n[uú]mero)?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Extrai o código de uma pergunta ditada após "pergunta"/"questão"/"item", ex.:
 * "pergunta 2a" -> "2a", ou "pergunta 2 a" (dígito + letra falados em separado) -> "2a".
 */
function extrairPerguntaCodigo(transcript: string): string | null {
  const m = transcript.match(/(?:pergunta|quest[ãa]o|item)\s+([a-zçãáéíóú0-9]+)(?:\s+([a-zçãáéíóú]))?/i);
  if (!m) return null;
  const primeiro = m[1];
  const segundo = m[2];
  if (segundo && /^\d+$/.test(primeiro) && /^[a-zçãáéíóú]$/i.test(segundo)) {
    return primeiro + segundo;
  }
  return primeiro;
}

export default function InstrumentoPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string; periodoId: string; instrumentoId: string };
}) {
  const [instrumento, setInstrumento] = useState<Instrumento | null>(null);
  const [alunos, setAlunos] = useState<AlunoTurma[]>([]);
  const [notas, setNotas] = useState<Record<string, NotaValor>>({});
  const [aGuardar, setAGuardar] = useState(false);
  const [guardadoEm, setGuardadoEm] = useState<Date | null>(null);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [nomes, setNomes] = useState<{ turma: string; disciplina: string } | null>(null);

  const [aDitar, setADitar] = useState(false);
  const [ultimoOuvido, setUltimoOuvido] = useState<string | null>(null);
  const [avisoDitado, setAvisoDitado] = useState<string | null>(null);
  const [ditadoSuportado, setDitadoSuportado] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const ditandoRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  const flatCellsRef = useRef<CelulaGrelha[]>([]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const disciplinaBase = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`;

  async function carregar() {
    const [ri, ra, rtd] = await Promise.all([
      fetch(`${disciplinaBase}/instrumentos/${params.instrumentoId}`),
      fetch(`${disciplinaBase}/alunos`),
      fetch(disciplinaBase),
    ]);
    if (!ri.ok || !ra.ok) {
      setErroCarregar('Não foi possível carregar o instrumento.');
      return;
    }
    if (rtd.ok) {
      const td = await rtd.json();
      setNomes({ turma: td.turma?.nome ?? '…', disciplina: td.disciplina.nome });
    }
    const inst = await ri.json();
    const inscricoes: Inscricao[] = await ra.json();
    const listaAlunos: AlunoTurma[] = inscricoes
      .filter((ins) => ins.ativo && ins.aluno.ativo)
      .map((ins) => ins.aluno)
      .sort((a, b) => a.numero - b.numero);
    setInstrumento(inst);
    setAlunos(listaAlunos);

    const iniciais: Record<string, NotaValor> = {};
    for (const aluno of listaAlunos) {
      iniciais[aluno.id] = {};
      for (const pergunta of inst.perguntas) {
        const nota = pergunta.notas?.find((n: { alunoId: string }) => n.alunoId === aluno.id);
        iniciais[aluno.id][pergunta.id] = nota?.valor != null ? String(nota.valor) : '';
      }
    }
    setNotas(iniciais);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.instrumentoId]);

  function atualizarNota(alunoId: string, perguntaId: string, valor: string) {
    setNotas((prev) => ({ ...prev, [alunoId]: { ...prev[alunoId], [perguntaId]: valor } }));
  }

  // Lista plana de células (aluno × pergunta) pela ordem em que aparecem na grelha,
  // usada para saber qual input preencher/focar a seguir durante o ditado.
  useEffect(() => {
    if (!instrumento) return;
    flatCellsRef.current = alunos.flatMap((aluno) =>
      instrumento.perguntas.map((p) => ({ alunoId: aluno.id, perguntaId: p.id }))
    );
  }, [alunos, instrumento]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setDitadoSuportado(Boolean(SpeechRecognitionCtor));
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (!aDitar) return;
    const cell = flatCellsRef.current[activeIndex];
    if (cell) {
      const input = inputRefs.current[`${cell.alunoId}:${cell.perguntaId}`];
      input?.focus();
      input?.select();
    }
  }, [activeIndex, aDitar]);

  function avancarCelula(delta: number) {
    setActiveIndex((i) => {
      const max = flatCellsRef.current.length - 1;
      if (max < 0) return 0;
      return Math.min(Math.max(i + delta, 0), max);
    });
  }

  /** Salta diretamente para a célula referida por "aluno [número] X" e/ou "pergunta/questão/item Y". */
  function navegarParaCelula(transcript: string) {
    if (!instrumento) return;
    const numPerguntas = instrumento.perguntas.length;
    if (numPerguntas === 0 || alunos.length === 0) return;

    const idxAtual = activeIndexRef.current;
    let alunoIdx = Math.floor(idxAtual / numPerguntas);
    let perguntaIdx = idxAtual % numPerguntas;

    const numeroAluno = extrairAlunoNumero(transcript);
    let alunoEncontrado = true;
    if (numeroAluno !== null) {
      const idx = alunos.findIndex((a) => a.numero === numeroAluno);
      alunoEncontrado = idx !== -1;
      if (alunoEncontrado) alunoIdx = idx;
    }

    const codigoPergunta = extrairPerguntaCodigo(transcript);
    let perguntaEncontrada = true;
    if (codigoPergunta !== null) {
      const alvo = normalizarCodigo(codigoPergunta);
      const idx = instrumento.perguntas.findIndex((p) => normalizarCodigo(p.codigo) === alvo);
      perguntaEncontrada = idx !== -1;
      if (perguntaEncontrada) perguntaIdx = idx;
    }

    if (!alunoEncontrado || !perguntaEncontrada) {
      setAvisoDitado(
        !alunoEncontrado && !perguntaEncontrada
          ? 'Não encontrei esse aluno nem essa pergunta.'
          : !alunoEncontrado
            ? 'Não encontrei esse número de aluno.'
            : 'Não encontrei essa pergunta/item.'
      );
      return;
    }
    setAvisoDitado(null);
    setActiveIndex(alunoIdx * numPerguntas + perguntaIdx);
  }

  function processarTranscript(transcriptBruto: string) {
    const transcript = transcriptBruto.trim().toLowerCase();
    setUltimoOuvido(transcriptBruto);
    if (!transcript) return;

    if (PALAVRAS_PARAR.some((p) => transcript === p || transcript.startsWith(p + ' '))) {
      pararDitado();
      return;
    }
    if (/\baluno\b/.test(transcript) || /\b(pergunta|quest[ãa]o|item)\b/.test(transcript)) {
      navegarParaCelula(transcript);
      return;
    }
    if (PALAVRAS_AVANCAR.some((p) => transcript.includes(p))) {
      avancarCelula(1);
      return;
    }
    if (PALAVRAS_RECUAR.some((p) => transcript.includes(p))) {
      avancarCelula(-1);
      return;
    }
    if (PALAVRAS_LIMPAR.some((p) => transcript.includes(p))) {
      const cell = flatCellsRef.current[activeIndexRef.current];
      if (cell) atualizarNota(cell.alunoId, cell.perguntaId, '');
      avancarCelula(1);
      return;
    }

    const numero = extrairNumero(transcript);
    if (numero !== null) {
      const cell = flatCellsRef.current[activeIndexRef.current];
      if (cell) atualizarNota(cell.alunoId, cell.perguntaId, numero);
      avancarCelula(1);
    }
    // Se não se reconhece número nem comando, ignora-se (mantém-se na mesma célula).
  }

  function iniciarDitado() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setDitadoSuportado(false);
      return;
    }
    const recognition: SpeechRecognitionInstance = new SpeechRecognitionCtor();
    recognition.lang = 'pt-PT';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const ultimo = event.results[event.results.length - 1];
      const transcript = ultimo?.[0]?.transcript ?? '';
      processarTranscript(transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setDitadoSuportado(false);
        pararDitado();
      }
      // outros erros (ex.: 'no-speech') são ignorados; o onend trata do reinício
    };
    recognition.onend = () => {
      if (ditandoRef.current) {
        try {
          recognition.start();
        } catch {
          // já iniciado ou instância inválida; ignora
        }
      }
    };

    recognitionRef.current = recognition;
    ditandoRef.current = true;
    setADitar(true);
    setActiveIndex(0);
    setUltimoOuvido(null);
    setAvisoDitado(null);
    recognition.start();
  }

  function pararDitado() {
    ditandoRef.current = false;
    setADitar(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  useEffect(() => {
    return () => {
      ditandoRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const totais = useMemo(() => {
    if (!instrumento) return {};
    const resultado: Record<string, { soma: number; max: number; preenchido: boolean }> = {};
    const max =
      instrumento.modo === 'ESCALA'
        ? instrumento.escalaMax * instrumento.perguntas.length
        : instrumento.perguntas.reduce((acc, p) => acc + p.valorMax, 0);
    for (const aluno of alunos) {
      let soma = 0;
      let preenchido = false;
      for (const pergunta of instrumento.perguntas) {
        const v = notas[aluno.id]?.[pergunta.id];
        if (v !== undefined && v !== '') {
          preenchido = true;
          soma += Number(v);
        }
      }
      resultado[aluno.id] = { soma, max, preenchido };
    }
    return resultado;
  }, [alunos, instrumento, notas]);

  /** Média de cada pergunta entre os alunos com nota lançada nela; null se nenhum tiver. */
  const mediaPorPergunta = useMemo(() => {
    if (!instrumento) return {};
    const resultado: Record<string, number | null> = {};
    for (const pergunta of instrumento.perguntas) {
      const valores = alunos
        .map((aluno) => notas[aluno.id]?.[pergunta.id])
        .filter((v): v is string => v !== undefined && v !== '')
        .map(Number);
      resultado[pergunta.id] = valores.length > 0 ? valores.reduce((acc, v) => acc + v, 0) / valores.length : null;
    }
    return resultado;
  }, [alunos, instrumento, notas]);

  /** Média da turma (soma/max de cada aluno com pelo menos uma nota lançada). */
  const mediaTurma = useMemo(() => {
    const comNota = Object.values(totais).filter((t) => t.preenchido);
    if (comNota.length === 0) return null;
    return comNota.reduce((acc, t) => acc + t.soma, 0) / comNota.length;
  }, [totais]);

  async function guardar() {
    if (!instrumento) return;
    setAGuardar(true);
    const payload: Record<string, Record<string, number | null>> = {};
    for (const aluno of alunos) {
      payload[aluno.id] = {};
      for (const pergunta of instrumento.perguntas) {
        const v = notas[aluno.id]?.[pergunta.id];
        payload[aluno.id][pergunta.id] = v === '' || v === undefined ? null : Number(v);
      }
    }
    const res = await fetch(`${disciplinaBase}/instrumentos/${instrumento.id}/notas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: payload }),
    });
    setAGuardar(false);
    if (res.ok) setGuardadoEm(new Date());
  }

  const voltarHref = `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/instrumentos`;

  if (erroCarregar) {
    return (
      <AppShell width="full">
        <Link href={voltarHref} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar aos instrumentos
        </Link>
        <Alert tone="danger">{erroCarregar}</Alert>
      </AppShell>
    );
  }

  if (!instrumento) {
    return (
      <AppShell width="full">
        <PageLoading />
      </AppShell>
    );
  }

  return (
    <AppShell width="full">
      <div className="mx-auto max-w-6xl">
        <Breadcrumbs
          items={[
            { label: 'As minhas turmas', href: '/dashboard' },
            { label: nomes?.turma ?? '…', href: `/turmas/${params.turmaId}` },
            {
              label: nomes?.disciplina ?? '…',
              href: `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`,
            },
            { label: 'Instrumentos', href: voltarHref },
            { label: instrumento.nome },
          ]}
        />
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{instrumento.nome}</h1>
          <div className="flex items-center gap-2">
            <ExportButtons
              pdfHref={`${disciplinaBase}/instrumentos/${instrumento.id}/export/pdf`}
              xlsxHref={`${disciplinaBase}/instrumentos/${instrumento.id}/export/xlsx`}
            />
            {ditadoSuportado && (
              <Button variant={aDitar ? 'danger' : 'primary'} onClick={() => (aDitar ? pararDitado() : iniciarDitado())}>
                {aDitar ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {aDitar ? 'Parar ditado' : 'Ditar notas'}
              </Button>
            )}
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          {instrumento.criterio?.nome} ·{' '}
          {instrumento.modo === 'PONTOS' ? 'pontos por pergunta' : `escala de 1 a ${instrumento.escalaMax}`}
        </p>

        {aDitar && (
          <div className="mb-4 space-y-2">
            <Alert tone="info">
              A ouvir… diga um número para preencher a célula selecionada e avançar. Diga "aluno número 3
              pergunta 2a" para saltar diretamente para essa célula, ou "seguinte", "anterior", "apagar",
              "parar" para navegar.
              {ultimoOuvido && <span className="ml-2 text-brand-500">Ouvido: "{ultimoOuvido}"</span>}
            </Alert>
            {avisoDitado && <Alert tone="warning">{avisoDitado}</Alert>}
          </div>
        )}
        {!ditadoSuportado && (
          <p className="mb-4 text-xs text-slate-400">
            Ditado por voz não suportado neste navegador (funciona no Chrome/Edge).
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="grelha min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Nº</th>
                <th className="px-3 py-2 text-left">Nome</th>
                {instrumento.perguntas.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center">
                    {p.codigo}
                    <div className="text-xs font-normal normal-case text-slate-400">/{p.valorMax}</div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alunos.map((aluno) => {
                const total = totais[aluno.id];
                return (
                  <tr key={aluno.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-1.5 tabular-nums text-slate-500">{aluno.numero}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">{aluno.nome}</td>
                    {instrumento.perguntas.map((p, pIdx) => {
                      const cellKey = `${aluno.id}:${p.id}`;
                      const cellIndex = alunos.indexOf(aluno) * instrumento.perguntas.length + pIdx;
                      const ativa = aDitar && cellIndex === activeIndex;
                      const valorNota = notas[aluno.id]?.[p.id];
                      const excedeu = valorNota != null && String(valorNota) !== '' && Number(valorNota) > p.valorMax;
                      return (
                        <td key={p.id} className="px-1 py-1">
                          <input
                            ref={(el) => {
                              inputRefs.current[cellKey] = el;
                            }}
                            type="number"
                            min={0}
                            max={p.valorMax}
                            step="0.5"
                            value={notas[aluno.id]?.[p.id] ?? ''}
                            onChange={(e) => atualizarNota(aluno.id, p.id, e.target.value)}
                            aria-label={`Nota de ${aluno.nome} na pergunta ${p.codigo}`}
                            aria-invalid={excedeu}
                            title={excedeu ? `Acima do máximo da pergunta (${p.valorMax})` : undefined}
                            className={`w-16 rounded-md border px-1 py-1 text-center text-sm transition-colors duration-150 focus:outline-none focus:ring-2 ${
                              excedeu
                                ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500/30'
                                : `focus:ring-brand-500/30 ${
                                    ativa ? 'border-brand-500 ring-2 ring-brand-300' : 'border-slate-200'
                                  }`
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-center font-medium text-slate-900">
                      {total?.preenchido ? `${total.soma}/${total.max}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {alunos.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td className="px-3 py-1.5" />
                  <td className="px-3 py-1.5 font-medium text-slate-700">Média</td>
                  {instrumento.perguntas.map((p) => (
                    <td key={p.id} className="px-2 py-1.5 text-center tabular-nums text-slate-700">
                      {mediaPorPergunta[p.id] != null ? mediaPorPergunta[p.id]!.toFixed(1) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center font-semibold text-slate-900">
                    {mediaTurma != null
                      ? `${mediaTurma.toFixed(1)}/${instrumento.perguntas.reduce(
                          (acc, p) => acc + (instrumento.modo === 'ESCALA' ? instrumento.escalaMax : p.valorMax),
                          0
                        )}`
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={guardar} loading={aGuardar}>
            {aGuardar ? 'A guardar…' : 'Guardar notas'}
          </Button>
          {guardadoEm && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Guardado às {guardadoEm.toLocaleTimeString('pt-PT')}
            </span>
          )}
        </div>
      </div>
    </AppShell>
  );
}
