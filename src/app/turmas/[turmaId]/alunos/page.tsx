'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { Aluno } from '@/lib/types';

// A Web Speech API não está nos tipos padrão do TS DOM; usamos `any` para o objeto de reconhecimento.
type SpeechRecognitionInstance = any;

const PALAVRAS_PARAR = ['parar', 'terminar', 'sair', 'para'];
const PALAVRAS_DESFAZER = ['apagar último', 'apagar ultimo', 'remover último', 'remover ultimo', 'desfazer'];

/** Extrai "número/aluno número N ..." do início de uma frase ditada, devolvendo [número, resto] ou null. */
function extrairNumeroExplicito(transcript: string): [number, string] | null {
  const m = transcript.match(/^(?:aluno\s*)?n[uú]mero\s*(\d+)\s*(.*)$/i);
  if (!m) return null;
  return [Number(m[1]), m[2].trim()];
}

/** Capitaliza cada palavra do nome (o reconhecimento de voz costuma devolver tudo em minúsculas). */
function capitalizarNome(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export default function AlunosPage({ params }: { params: { turmaId: string } }) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [medidas, setMedidas] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [numeroEdit, setNumeroEdit] = useState('');
  const [nomeEdit, setNomeEdit] = useState('');
  const [medidasEdit, setMedidasEdit] = useState('');
  const [erroEdit, setErroEdit] = useState<string | null>(null);

  const [aDitar, setADitar] = useState(false);
  const [ultimoOuvido, setUltimoOuvido] = useState<string | null>(null);
  const [ultimoAdicionado, setUltimoAdicionado] = useState<string | null>(null);
  const [avisoDitado, setAvisoDitado] = useState<string | null>(null);
  const [ditadoSuportado, setDitadoSuportado] = useState(true);
  const ditandoRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  const alunosRef = useRef<Aluno[]>([]);
  const ultimoAdicionadoIdRef = useRef<string | null>(null);

  async function carregar() {
    setACarregar(true);
    const r = await fetch(`/api/turmas/${params.turmaId}/alunos`);
    if (!r.ok) {
      setErroCarregar('Não foi possível carregar os alunos.');
      setACarregar(false);
      return [];
    }
    setErroCarregar(null);
    const lista: Aluno[] = await r.json();
    setAlunos(lista);
    alunosRef.current = lista;
    setACarregar(false);
    return lista;
  }

  useEffect(() => {
    carregar();
  }, [params.turmaId]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setDitadoSuportado(Boolean(SpeechRecognitionCtor));
  }, []);

  useEffect(() => {
    return () => {
      ditandoRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero || !nome) {
      setErro('Indique número e nome.');
      return;
    }
    const res = await fetch(`/api/turmas/${params.turmaId}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: Number(numero), nome, medidas: medidas || null }),
    });
    if (!res.ok) {
      setErro('Não foi possível adicionar (número já usado?).');
      return;
    }
    setNumero('');
    setNome('');
    setMedidas('');
    carregar();
  }

  function proximoNumero(): number {
    const maior = alunosRef.current.reduce((max, a) => Math.max(max, a.numero), 0);
    return maior + 1;
  }

  async function adicionarAlunoViaVoz(numeroExplicito: number | null, nomeTexto: string) {
    const nomeFinal = capitalizarNome(nomeTexto.trim());
    if (!nomeFinal) return;
    const numeroFinal = numeroExplicito ?? proximoNumero();

    const res = await fetch(`/api/turmas/${params.turmaId}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: numeroFinal, nome: nomeFinal, medidas: null }),
    });
    if (!res.ok) {
      setAvisoDitado(`Não foi possível adicionar "${nomeFinal}" (nº ${numeroFinal} já usado?).`);
      return;
    }
    const novo = await res.json();
    ultimoAdicionadoIdRef.current = novo.id;
    setUltimoAdicionado(`Nº ${numeroFinal} — ${nomeFinal}`);
    setAvisoDitado(null);
    await carregar();
  }

  async function desfazerUltimoDitado() {
    const id = ultimoAdicionadoIdRef.current;
    if (!id) {
      setAvisoDitado('Não há nenhum aluno adicionado por voz nesta sessão para desfazer.');
      return;
    }
    await fetch(`/api/turmas/${params.turmaId}/alunos/${id}`, { method: 'DELETE' });
    ultimoAdicionadoIdRef.current = null;
    setUltimoAdicionado(null);
    setAvisoDitado('Último aluno removido.');
    await carregar();
  }

  function processarTranscript(transcriptBruto: string) {
    const transcript = transcriptBruto.trim();
    setUltimoOuvido(transcriptBruto);
    if (!transcript) return;
    const minusculas = transcript.toLowerCase();

    if (PALAVRAS_PARAR.some((p) => minusculas === p || minusculas.startsWith(p + ' '))) {
      pararDitado();
      return;
    }
    if (PALAVRAS_DESFAZER.some((p) => minusculas.includes(p))) {
      desfazerUltimoDitado();
      return;
    }

    const explicito = extrairNumeroExplicito(transcript);
    if (explicito) {
      const [numeroExplicito, resto] = explicito;
      if (resto) adicionarAlunoViaVoz(numeroExplicito, resto);
      else setAvisoDitado('Diga o número seguido do nome, ex.: "número 5 Maria Silva".');
      return;
    }

    adicionarAlunoViaVoz(null, transcript);
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
    setUltimoOuvido(null);
    setUltimoAdicionado(null);
    setAvisoDitado(null);
    ultimoAdicionadoIdRef.current = null;
    recognition.start();
  }

  function pararDitado() {
    ditandoRef.current = false;
    setADitar(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  async function remover(id: string) {
    if (!confirm('Remover este aluno e todas as suas notas?')) return;
    await fetch(`/api/turmas/${params.turmaId}/alunos/${id}`, { method: 'DELETE' });
    carregar();
  }

  async function alternarAtivo(aluno: Aluno) {
    await fetch(`/api/turmas/${params.turmaId}/alunos/${aluno.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !aluno.ativo }),
    });
    carregar();
  }

  function iniciarEdicao(aluno: Aluno) {
    setEditandoId(aluno.id);
    setNumeroEdit(String(aluno.numero));
    setNomeEdit(aluno.nome);
    setMedidasEdit(aluno.medidas ?? '');
    setErroEdit(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setErroEdit(null);
  }

  async function guardarEdicao(id: string) {
    setErroEdit(null);
    if (!numeroEdit || !nomeEdit) {
      setErroEdit('Indique número e nome.');
      return;
    }
    const res = await fetch(`/api/turmas/${params.turmaId}/alunos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: Number(numeroEdit),
        nome: nomeEdit,
        medidas: medidasEdit || null,
      }),
    });
    if (!res.ok) {
      setErroEdit('Não foi possível guardar (número já usado?).');
      return;
    }
    setEditandoId(null);
    carregar();
  }

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href={`/turmas/${params.turmaId}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
          ← Voltar à turma
        </Link>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Alunos</h1>
          {ditadoSuportado && (
            <button
              type="button"
              onClick={() => (aDitar ? pararDitado() : iniciarDitado())}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                aDitar
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {aDitar ? '⏹ Parar ditado' : '🎤 Ditar alunos'}
            </button>
          )}
        </div>

        {aDitar && (
          <div className="mb-4 space-y-1">
            <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
              A ouvir… diga o nome do aluno para o adicionar com o número seguinte automático, ou
              "número 5 Maria Silva" para indicar o número. Diga "apagar último" para desfazer ou
              "parar" para terminar.
              {ultimoOuvido && <span className="ml-2 text-brand-500">Ouvido: "{ultimoOuvido}"</span>}
            </p>
            {ultimoAdicionado && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Adicionado: {ultimoAdicionado}
              </p>
            )}
            {avisoDitado && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{avisoDitado}</p>
            )}
          </div>
        )}

        <form onSubmit={adicionar} className="mb-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nº</label>
            <input
              type="number"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Medidas (Dec-Lei 54)
            </label>
            <input
              value={medidas}
              onChange={(e) => setMedidas(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Adicionar
          </button>
          {erro && <p className="w-full text-sm text-red-600">{erro}</p>}
        </form>

        {erroCarregar ? (
          <p className="text-sm text-red-600">{erroCarregar}</p>
        ) : aCarregar ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : (
        <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Nº</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Medidas</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {alunos.map((a) =>
              editandoId === a.id ? (
                <tr key={a.id} className="border-t border-slate-100 bg-slate-50">
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={numeroEdit}
                      onChange={(e) => setNumeroEdit(e.target.value)}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={nomeEdit}
                      onChange={(e) => setNomeEdit(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={medidasEdit}
                      onChange={(e) => setMedidasEdit(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-400">{a.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => guardarEdicao(a.id)}
                        className="text-emerald-600 hover:underline"
                      >
                        Guardar
                      </button>
                      <button onClick={cancelarEdicao} className="text-slate-500 hover:underline">
                        Cancelar
                      </button>
                    </div>
                    {erroEdit && <p className="mt-1 text-xs text-red-600">{erroEdit}</p>}
                  </td>
                </tr>
              ) : (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{a.numero}</td>
                  <td className="px-3 py-2">{a.nome}</td>
                  <td className="px-3 py-2 text-slate-500">{a.medidas ?? '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => alternarAtivo(a)} className="text-brand-600 hover:underline">
                      {a.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => iniciarEdicao(a)} className="text-brand-600 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => remover(a.id)} className="text-red-600 hover:underline">
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {alunos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Ainda não tem alunos. Adicione o primeiro acima.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </main>
    </div>
  );
}
