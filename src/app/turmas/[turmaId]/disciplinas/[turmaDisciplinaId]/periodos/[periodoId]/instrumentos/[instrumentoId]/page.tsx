'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Mic, Square, CheckCircle2, Eye, Settings2, Plus, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/Spinner';
import { lerRascunho, limparRascunho, useGuardarRascunho } from '@/lib/rascunho';
import type { AlunoTurma, Criterio, Instrumento, ModoAvaliacao } from '@/lib/types';

interface NotaValor {
  [perguntaId: string]: string; // string para permitir campo vazio no input
}

interface PerguntaForm {
  id?: string;
  codigo: string;
  valorMax: string;
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

interface DraftEdicaoInstrumento {
  nome: string;
  criterioId: string;
  modo: ModoAvaliacao;
  escalaMax: string;
  tema: string;
  data: string;
  perguntas: PerguntaForm[];
}

// A Web Speech API não está nos tipos padrão do TS DOM; usamos `any` para o objeto de reconhecimento.
type SpeechRecognitionInstance = any;

const PALAVRAS_AVANCAR = ['seguinte', 'próximo', 'próxima', 'avançar'];
const PALAVRAS_RECUAR = ['anterior', 'voltar', 'recuar'];
const PALAVRAS_PARAR = ['parar', 'terminar', 'sair', 'para'];
const PALAVRAS_LIMPAR = ['apagar', 'limpar', 'vazio'];

// Alguns reconhecedores transcrevem números ditados por extenso em vez de
// dígito (ex.: "nove" em vez de "9"). As notas vão de 0 a 50, por isso é
// preciso reconhecer também compostos tipo "quarenta e sete".
const UNIDADES: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
};
const DEZEN_ESPECIAIS: Record<string, number> = {
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezasseis: 16,
  dezesseis: 16,
  dezassete: 17,
  dezessete: 17,
  dezoito: 18,
  dezanove: 19,
  dezenove: 19,
};
const DEZENAS: Record<string, number> = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
};

/** Tenta ler um número ditado por extenso (0 a 50), incluindo compostos como "quarenta e sete". */
function extrairNumeroPorExtenso(transcript: string): string | null {
  // remove pontuação (ex.: "nove." no fim de uma frase ditada) antes de comparar palavras
  const palavras = transcript
    .split(/\s+/)
    .map((p) => p.replace(/[^a-zà-úA-ZÀ-Ú]/g, ''));
  for (let i = 0; i < palavras.length; i++) {
    const palavra = palavras[i];
    if (palavra in DEZENAS) {
      const base = DEZENAS[palavra];
      const unidade = palavras[i + 2];
      if (palavras[i + 1] === 'e' && unidade in UNIDADES) {
        return String(base + UNIDADES[unidade]);
      }
      return String(base);
    }
    if (palavra in DEZEN_ESPECIAIS) return String(DEZEN_ESPECIAIS[palavra]);
    if (palavra in UNIDADES) return String(UNIDADES[palavra]);
  }
  return null;
}

/** Extrai o primeiro número (com vírgula ou ponto decimal) de uma frase ditada. */
function extrairNumero(transcript: string): string | null {
  const normalizado = transcript.replace(',', '.');
  const match = normalizado.match(/-?\d+(?:\.\d+)?/);
  if (match) return match[0];
  return extrairNumeroPorExtenso(normalizado);
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
  const searchParams = useSearchParams();
  const soVer = searchParams.get('ver') === '1';
  const [instrumento, setInstrumento] = useState<Instrumento | null>(null);
  const [alunos, setAlunos] = useState<AlunoTurma[]>([]);
  const [notas, setNotas] = useState<Record<string, NotaValor>>({});
  const [aGuardar, setAGuardar] = useState(false);
  const [guardadoEm, setGuardadoEm] = useState<Date | null>(null);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [nomes, setNomes] = useState<{ turma: string; disciplina: string } | null>(null);
  const [criterios, setCriterios] = useState<Criterio[]>([]);

  const [mostrarEdicao, setMostrarEdicao] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [criterioIdEdicao, setCriterioIdEdicao] = useState('');
  const [modoEdicao, setModoEdicao] = useState<ModoAvaliacao>('PONTOS');
  const [escalaMaxEdicao, setEscalaMaxEdicao] = useState('5');
  const [temaEdicao, setTemaEdicao] = useState('');
  const [dataEdicao, setDataEdicao] = useState('');
  const [perguntasEdicao, setPerguntasEdicao] = useState<PerguntaForm[]>([]);
  const [colagemEdicao, setColagemEdicao] = useState('');
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [aGravarEdicao, setAGravarEdicao] = useState(false);

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
  const celulaSelecionadaRef = useRef(0);

  const disciplinaBase = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`;
  const draftKeyNotas = `draft:notas:${params.instrumentoId}`;
  const draftKeyEdicao = `draft:instrumento-editar:${params.instrumentoId}`;

  useGuardarRascunho(instrumento ? draftKeyNotas : undefined, notas);
  useGuardarRascunho(
    mostrarEdicao ? draftKeyEdicao : undefined,
    {
      nome: nomeEdicao,
      criterioId: criterioIdEdicao,
      modo: modoEdicao,
      escalaMax: escalaMaxEdicao,
      tema: temaEdicao,
      data: dataEdicao,
      perguntas: perguntasEdicao,
    } as DraftEdicaoInstrumento
  );

  async function carregar() {
    const [ri, ra, rtd, rc] = await Promise.all([
      fetch(`${disciplinaBase}/instrumentos/${params.instrumentoId}`),
      fetch(`${disciplinaBase}/alunos`),
      fetch(disciplinaBase),
      fetch(`${disciplinaBase}/criterios`),
    ]);
    if (!ri.ok || !ra.ok) {
      setErroCarregar('Não foi possível carregar o instrumento.');
      return;
    }
    if (rtd.ok) {
      const td = await rtd.json();
      setNomes({ turma: td.turma?.nome ?? '…', disciplina: td.disciplina.nome });
    }
    if (rc.ok) {
      setCriterios(await rc.json());
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
    // Sobrepõe um rascunho local (notas ainda não guardadas) sobre o que vem do servidor.
    const rascunho = lerRascunho<Record<string, NotaValor> | null>(draftKeyNotas, null);
    if (rascunho) {
      for (const alunoId of Object.keys(iniciais)) {
        if (rascunho[alunoId]) iniciais[alunoId] = { ...iniciais[alunoId], ...rascunho[alunoId] };
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

  const criteriosUtilizaveis = criterios.filter((c) => !c.semInstrumentos && c.avaliacao !== 'GRELHA');

  function abrirEdicao() {
    if (!instrumento) return;
    const base: DraftEdicaoInstrumento = lerRascunho<DraftEdicaoInstrumento | null>(draftKeyEdicao, null) ?? {
      nome: instrumento.nome,
      criterioId: instrumento.criterioId,
      modo: instrumento.modo,
      escalaMax: String(instrumento.escalaMax),
      tema: instrumento.tema ?? '',
      data: instrumento.data.slice(0, 10),
      perguntas: instrumento.perguntas.map((p) => ({ id: p.id, codigo: p.codigo, valorMax: String(p.valorMax) })),
    };
    setNomeEdicao(base.nome);
    setCriterioIdEdicao(base.criterioId);
    setModoEdicao(base.modo);
    setEscalaMaxEdicao(base.escalaMax);
    setTemaEdicao(base.tema);
    setDataEdicao(base.data);
    setPerguntasEdicao(base.perguntas);
    setColagemEdicao('');
    setErroEdicao(null);
    setMostrarEdicao(true);
  }

  function fecharEdicao() {
    setMostrarEdicao(false);
  }

  function atualizarPerguntaEdicao(i: number, campo: keyof PerguntaForm, valor: string) {
    setPerguntasEdicao((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  function adicionarPerguntaEdicao() {
    setPerguntasEdicao((prev) => [...prev, { codigo: '', valorMax: '' }]);
  }

  function removerPerguntaEdicao(i: number) {
    setPerguntasEdicao((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Aceita o mesmo formato colado de uma folha de cálculo usado na criação de instrumentos.
  function aplicarColagemEdicao() {
    const linhas = colagemEdicao
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
      setErroEdicao('Não foi possível ler as linhas coladas. Cole uma linha de itens e uma linha de pontos, copiadas do Excel.');
      return;
    }
    setErroEdicao(null);
    setPerguntasEdicao(novas);
    setColagemEdicao('');
  }

  async function guardarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!instrumento) return;
    setErroEdicao(null);
    if (!nomeEdicao || !criterioIdEdicao || !dataEdicao || perguntasEdicao.length === 0) {
      setErroEdicao('Preencha nome, critério, data da avaliação e pelo menos uma pergunta/item.');
      return;
    }
    const perguntasValidas = perguntasEdicao.filter((p) => p.codigo && p.valorMax);
    if (perguntasValidas.length === 0) {
      setErroEdicao('Adicione pelo menos uma pergunta/item com valor máximo.');
      return;
    }
    setAGravarEdicao(true);
    const corpo = {
      periodoId: params.periodoId,
      criterioId: criterioIdEdicao,
      nome: nomeEdicao,
      modo: modoEdicao,
      escalaMax: Number(escalaMaxEdicao) || 5,
      tema: temaEdicao || null,
      data: dataEdicao,
      perguntas: perguntasValidas.map((p, idx) => ({
        id: p.id,
        codigo: p.codigo,
        valorMax: Number(p.valorMax),
        ordem: idx,
      })),
    };
    const res = await fetch(`${disciplinaBase}/instrumentos/${instrumento.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    setAGravarEdicao(false);
    if (!res.ok) {
      setErroEdicao('Não foi possível guardar as alterações.');
      return;
    }
    limparRascunho(draftKeyEdicao);
    fecharEdicao();
    carregar();
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
    const max = flatCellsRef.current.length - 1;
    // Usa activeIndexRef (já sincronizado) em vez do estado, para que números
    // ditados em sequência rápida não leiam um índice desatualizado antes de
    // o React re-renderizar.
    const novo = max < 0 ? 0 : Math.min(Math.max(activeIndexRef.current + delta, 0), max);
    activeIndexRef.current = novo;
    setActiveIndex(novo);
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
    const novo = alunoIdx * numPerguntas + perguntaIdx;
    activeIndexRef.current = novo;
    setActiveIndex(novo);
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
    // Modo contínuo: parar/reiniciar a sessão a cada frase (como "continuous = false"
    // faria) perdia números ditados depressa a seguir uns aos outros, por não haver
    // microfone ativo durante o reinício. O índice da célula atual é mantido em
    // activeIndexRef e atualizado de forma síncrona (ver avancarCelula/navegarParaCelula),
    // para que números repetidos ou em sequência rápida nunca leiam um índice desatualizado.
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
    const max = flatCellsRef.current.length - 1;
    setActiveIndex(Math.min(Math.max(celulaSelecionadaRef.current, 0), Math.max(max, 0)));
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

  const instrumentoMax = useMemo(() => {
    if (!instrumento) return 0;
    return instrumento.modo === 'ESCALA'
      ? instrumento.escalaMax * instrumento.perguntas.length
      : instrumento.perguntas.reduce((acc, p) => acc + p.valorMax, 0);
  }, [instrumento]);

  const totais = useMemo(() => {
    if (!instrumento) return {};
    const resultado: Record<string, { soma: number; max: number; preenchido: boolean }> = {};
    const max = instrumentoMax;
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

  /**
   * Alunos com pelo menos uma nota acima do valor máximo de alguma pergunta
   * (ex.: fez uma versão diferente do teste) — são excluídos por inteiro da
   * Ponderação e da Média da turma, para não distorcerem as estatísticas das
   * restantes perguntas, mesmo nas que responderam normalmente.
   */
  const alunosExcluidos = useMemo(() => {
    const excluidos = new Set<string>();
    if (!instrumento) return excluidos;
    for (const aluno of alunos) {
      for (const pergunta of instrumento.perguntas) {
        const v = notas[aluno.id]?.[pergunta.id];
        if (v !== undefined && v !== '' && Number(v) > pergunta.valorMax) {
          excluidos.add(aluno.id);
          break;
        }
      }
    }
    return excluidos;
  }, [alunos, instrumento, notas]);

  const alunosParaEstatisticas = useMemo(
    () => alunos.filter((aluno) => !alunosExcluidos.has(aluno.id)),
    [alunos, alunosExcluidos]
  );

  /** Média de cada pergunta entre os alunos sem notas inválidas no instrumento. */
  const mediaPorPergunta = useMemo(() => {
    if (!instrumento) return {};
    const resultado: Record<string, { media: number | null }> = {};
    for (const pergunta of instrumento.perguntas) {
      const valores = alunosParaEstatisticas
        .map((aluno) => notas[aluno.id]?.[pergunta.id])
        .filter((v): v is string => v !== undefined && v !== '')
        .map(Number);
      resultado[pergunta.id] = {
        media: valores.length > 0 ? valores.reduce((acc, v) => acc + v, 0) / valores.length : null,
      };
    }
    return resultado;
  }, [alunosParaEstatisticas, instrumento, notas]);

  /** Média da turma (soma/max), só com alunos sem notas inválidas no instrumento. */
  const mediaTurma = useMemo(() => {
    const comNota = alunosParaEstatisticas.map((a) => totais[a.id]).filter((t) => t?.preenchido);
    if (comNota.length === 0) return null;
    return comNota.reduce((acc, t) => acc + t.soma, 0) / comNota.length;
  }, [alunosParaEstatisticas, totais]);

  /** % de alunos da turma com nota negativa (soma abaixo de 50% do máximo), só entre os sem notas inválidas. */
  const percentNegativasTurma = useMemo(() => {
    const comNota = alunosParaEstatisticas.map((a) => totais[a.id]).filter((t) => t?.preenchido);
    if (comNota.length === 0) return null;
    return (comNota.filter((t) => t.soma < t.max / 2).length / comNota.length) * 100;
  }, [alunosParaEstatisticas, totais]);

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
    if (res.ok) {
      limparRascunho(draftKeyNotas);
      setGuardadoEm(new Date());
    }
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
            {soVer ? (
              <span className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                <Eye className="h-4 w-4" />
                Modo de visualização
              </span>
            ) : (
              <>
                <Button variant="secondary" onClick={() => (mostrarEdicao ? fecharEdicao() : abrirEdicao())}>
                  <Settings2 className="h-4 w-4" />
                  Editar instrumento
                </Button>
                {ditadoSuportado && (
                  <Button variant={aDitar ? 'danger' : 'primary'} onClick={() => (aDitar ? pararDitado() : iniciarDitado())}>
                    {aDitar ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {aDitar ? 'Parar ditado' : 'Ditar notas'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          {instrumento.criterio?.nome} ·{' '}
          {instrumento.modo === 'PONTOS' ? 'pontos por pergunta' : `escala de 1 a ${instrumento.escalaMax}`}
        </p>

        {mostrarEdicao && (
          <Card as="form" onSubmit={guardarEdicao} className="mb-6 space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nome-instrumento-edicao">Nome</Label>
                <Input
                  id="nome-instrumento-edicao"
                  value={nomeEdicao}
                  onChange={(e) => setNomeEdicao(e.target.value)}
                  placeholder="ex: Teste de Avaliação 1"
                />
              </div>
              <div>
                <Label htmlFor="criterio-edicao">Critério</Label>
                <Select id="criterio-edicao" value={criterioIdEdicao} onChange={(e) => setCriterioIdEdicao(e.target.value)}>
                  <option value="">Selecionar…</option>
                  {criteriosUtilizaveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grupo} — {c.nome}
                      {c.pesoDefinido === false ? '' : ` (${Math.round(c.peso * 1000) / 10}%)`}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="modo-edicao">Modo de avaliação</Label>
                <Select id="modo-edicao" value={modoEdicao} onChange={(e) => setModoEdicao(e.target.value as ModoAvaliacao)}>
                  <option value="PONTOS">Pontos por pergunta (ex.: teste)</option>
                  <option value="ESCALA">Escala (ex.: 1 a 5)</option>
                </Select>
              </div>
              {modoEdicao === 'ESCALA' && (
                <div>
                  <Label htmlFor="escala-max-edicao">Escala máxima</Label>
                  <Input
                    id="escala-max-edicao"
                    type="number"
                    value={escalaMaxEdicao}
                    onChange={(e) => setEscalaMaxEdicao(e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="data-instrumento-edicao">Data da avaliação</Label>
                <Input
                  id="data-instrumento-edicao"
                  type="date"
                  value={dataEdicao}
                  onChange={(e) => setDataEdicao(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tema-edicao">Tema (opcional)</Label>
                <Input id="tema-edicao" value={temaEdicao} onChange={(e) => setTemaEdicao(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>{modoEdicao === 'PONTOS' ? 'Perguntas' : 'Itens da escala'}</Label>
              <div className="mb-3">
                <Label htmlFor="colagem-edicao">Colar da folha de cálculo (opcional)</Label>
                <Textarea
                  id="colagem-edicao"
                  rows={3}
                  value={colagemEdicao}
                  onChange={(e) => setColagemEdicao(e.target.value)}
                  placeholder={'Item\t1\t2a\t2b\t3\t4\tTotal\nPontos\t40\t50\t10\t30\t70\t200'}
                  className="font-mono"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Substitui as linhas abaixo; pode rever e corrigir antes de guardar.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={aplicarColagemEdicao}
                  disabled={!colagemEdicao.trim()}
                >
                  Preencher linhas
                </Button>
              </div>
              <div className="space-y-2">
                {perguntasEdicao.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="Código (ex: 2.1.)"
                      value={p.codigo}
                      onChange={(e) => atualizarPerguntaEdicao(i, 'codigo', e.target.value)}
                      className="w-40"
                    />
                    <Input
                      type="number"
                      placeholder={modoEdicao === 'PONTOS' ? 'Pontos máx.' : 'Escala máx.'}
                      value={p.valorMax}
                      onChange={(e) => atualizarPerguntaEdicao(i, 'valorMax', e.target.value)}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerPerguntaEdicao(i)}
                      aria-label="Remover linha"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={adicionarPerguntaEdicao}>
                <Plus className="h-4 w-4" />
                Adicionar linha
              </Button>
            </div>

            {erroEdicao && <Alert tone="danger">{erroEdicao}</Alert>}
            <Button type="submit" loading={aGravarEdicao}>
              Guardar alterações
            </Button>
          </Card>
        )}

        {!soVer && aDitar && (
          <div className="mb-4 space-y-2">
            <Alert tone="info">
              A ouvir… diga um número para preencher a célula selecionada e avançar. Diga &quot;aluno número 3
              pergunta 2a&quot; para saltar diretamente para essa célula, ou &quot;seguinte&quot;, &quot;anterior&quot;, &quot;apagar&quot;,
              &quot;parar&quot; para navegar.
              {ultimoOuvido && <span className="ml-2 text-brand-500">Ouvido: &quot;{ultimoOuvido}&quot;</span>}
            </Alert>
            {avisoDitado && <Alert tone="warning">{avisoDitado}</Alert>}
          </div>
        )}
        {!soVer && !ditadoSuportado && (
          <p className="mb-4 text-xs text-slate-400">
            Ditado por voz não suportado neste navegador (funciona no Chrome/Edge).
          </p>
        )}

        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="grelha min-w-full text-sm">
            <thead className="text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left">Nº</th>
                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left">Nome</th>
                {instrumento.perguntas.map((p) => (
                  <th key={p.id} className="sticky top-0 z-20 bg-slate-50 px-2 py-2 text-center">
                    {p.codigo}
                    <div className="text-xs font-normal normal-case text-slate-400">{p.valorMax}</div>
                  </th>
                ))}
                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-center">
                  Total
                  <div className="text-xs font-normal normal-case text-slate-400">{instrumentoMax}</div>
                  {percentNegativasTurma != null && (
                    <div
                      className="mt-0.5 text-xs font-semibold normal-case text-red-600"
                      title="% de alunos da turma com nota negativa neste instrumento"
                    >
                      {percentNegativasTurma.toFixed(0)}% negativas
                    </div>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alunos.map((aluno) => {
                const total = totais[aluno.id];
                const excluido = alunosExcluidos.has(aluno.id);
                return (
                  <tr key={aluno.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-1.5 tabular-nums text-slate-500">{aluno.numero}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                      {aluno.nome}
                      {excluido && (
                        <span
                          className="ml-1.5 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                          title="Tem uma nota acima do valor máximo nalguma pergunta; as suas notas não contam para a Ponderação nem para a Média da turma."
                        >
                          excluído(a)
                        </span>
                      )}
                    </td>
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
                            onFocus={() => {
                              celulaSelecionadaRef.current = cellIndex;
                            }}
                            disabled={soVer}
                            aria-label={`Nota de ${aluno.nome} na pergunta ${p.codigo}`}
                            aria-invalid={excedeu}
                            title={excedeu ? `Acima do máximo da pergunta (${p.valorMax})` : undefined}
                            className={`w-16 rounded-md border px-1 py-1 text-center text-sm transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
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
                    <td
                      className={`px-3 py-1.5 text-center font-medium ${
                        total?.preenchido && total.soma < 100 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {total?.preenchido ? total.soma : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {alunos.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td className="px-3 py-1.5" />
                  <td className="px-3 py-1.5 font-medium text-slate-700">Ponderação</td>
                  {instrumento.perguntas.map((p) => {
                    const info = mediaPorPergunta[p.id];
                    const pct = info?.media != null ? (info.media / p.valorMax) * 100 : null;
                    return (
                      <td
                        key={p.id}
                        className={`px-2 py-1.5 text-center tabular-nums ${pct != null && pct < 50 ? 'font-semibold text-red-600' : 'text-slate-700'}`}
                      >
                        {pct != null ? `${pct.toFixed(1)}%` : '—'}
                      </td>
                    );
                  })}
                  <td
                    className={`px-3 py-1.5 text-center font-semibold ${
                      mediaTurma != null && mediaTurma < 100 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {mediaTurma != null ? mediaTurma.toFixed(1) : '—'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {alunosExcluidos.size > 0 && (
          <p className="mt-1.5 text-xs text-slate-400">
            {alunosExcluidos.size === 1 ? '1 aluno não conta' : `${alunosExcluidos.size} alunos não contam`} para a
            Ponderação nem para a Média da turma, por ter{alunosExcluidos.size === 1 ? '' : 'em'} uma nota acima do
            valor máximo nalguma pergunta (ex.: versão diferente do teste) — assinalado{alunosExcluidos.size === 1 ? '' : 's'} a
            laranja.
          </p>
        )}

        {!soVer && (
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
        )}
      </div>
    </AppShell>
  );
}
