'use client';

import { useEffect } from 'react';

/**
 * Lê um rascunho previamente guardado em localStorage para `key`. Devolve
 * `valorPadrao` se não existir rascunho, se `key` não for indicada, ou se o
 * localStorage não estiver acessível (SSR, modo privado, etc.).
 */
export function lerRascunho<T>(key: string | undefined, valorPadrao: T): T {
  if (!key || typeof window === 'undefined') return valorPadrao;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

/** Remove o rascunho guardado para `key` — chamar depois de uma submissão com sucesso. */
export function limparRascunho(key: string | undefined) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // localStorage indisponível — ignora
  }
}

/** Guarda `value` em localStorage para `key` sempre que mudar, como rascunho automático. */
export function useGuardarRascunho<T>(key: string | undefined, value: T) {
  useEffect(() => {
    if (!key || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage indisponível (modo privado, quota excedida, etc.) — ignora
    }
  }, [key, value]);
}
