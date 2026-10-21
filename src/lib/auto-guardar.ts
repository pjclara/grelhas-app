'use client';

import { useEffect, useRef } from 'react';

const ATRASO_MS = 5 * 60 * 1000; // 5 minutos sem alterações

/**
 * Chama `guardar` automaticamente 5 minutos depois da última alteração a `valor`,
 * desde que `pronto` seja verdadeiro (ex.: dados mínimos válidos para gravar).
 * Não repete para o mesmo `valor` enquanto este não voltar a mudar — por isso é
 * seguro chamar sempre que o componente renderiza.
 */
export function useAutoGuardar<T>(valor: T, pronto: boolean, guardar: () => unknown) {
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoRef = useRef<string | null>(null);
  const aGuardarRef = useRef(false);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!pronto) return undefined;
    const chave = JSON.stringify(valor);
    if (chave === ultimoRef.current) return undefined;
    timeoutRef.current = setTimeout(() => {
      if (aGuardarRef.current) return;
      aGuardarRef.current = true;
      Promise.resolve(guardarRef.current()).finally(() => {
        ultimoRef.current = chave;
        aGuardarRef.current = false;
      });
    }, ATRASO_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, pronto]);
}
