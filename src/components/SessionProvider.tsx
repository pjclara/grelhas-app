'use client';

import { useEffect } from 'react';
import { SessionProvider as NextAuthSessionProvider, signOut, useSession } from 'next-auth/react';
import type { ReactNode } from 'react';

const INATIVIDADE_MAX_MS = 60 * 60 * 1000;
const VERIFICAR_CADA_MS = 30 * 1000;
const GRAVAR_NO_MAXIMO_CADA_MS = 5 * 1000;
const CHAVE = 'grelhas:ultimaAtividade';
const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

// Termina a sessão após 1 hora sem atividade. O último instante de atividade
// é partilhado entre separadores via localStorage, para que um separador
// esquecido em segundo plano não termine a sessão de quem está a trabalhar
// noutro.
function LogoutPorInatividade() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    function ler(): number {
      try {
        const v = Number(localStorage.getItem(CHAVE));
        return Number.isFinite(v) && v > 0 ? v : Date.now();
      } catch {
        return Date.now();
      }
    }
    let ultimoRegisto = 0;
    function registar() {
      const agora = Date.now();
      if (agora - ultimoRegisto < GRAVAR_NO_MAXIMO_CADA_MS) return;
      ultimoRegisto = agora;
      try {
        localStorage.setItem(CHAVE, String(agora));
      } catch {}
    }
    function verificar() {
      if (Date.now() - ler() >= INATIVIDADE_MAX_MS) {
        try {
          localStorage.removeItem(CHAVE);
        } catch {}
        signOut({ callbackUrl: '/login' });
      }
    }

    registar();
    EVENTOS.forEach((e) => window.addEventListener(e, registar, { passive: true }));
    const id = setInterval(verificar, VERIFICAR_CADA_MS);
    document.addEventListener('visibilitychange', verificar);
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, registar));
      clearInterval(id);
      document.removeEventListener('visibilitychange', verificar);
    };
  }, [status]);

  return null;
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider refetchInterval={5 * 60}>
      <LogoutPorInatividade />
      {children}
    </NextAuthSessionProvider>
  );
}
