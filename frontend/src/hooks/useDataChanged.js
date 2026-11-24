import { useEffect, useRef } from 'react';
import { DATA_CHANGED_EVENT } from '../services/realtime.js';

/** Executa o callback sempre que alguma transação mudar (nesta aba, em outra aba ou por outro usuário). */
export function useDataChanged(callback) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; }, [callback]);

  useEffect(() => {
    const handler = (event) => saved.current(event.detail);
    window.addEventListener(DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
  }, []);
}
