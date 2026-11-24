import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDataChanged } from '../hooks/useDataChanged.js';
import { api } from '../services/api.js';
import { connectRealtime } from '../services/realtime.js';

/**
 * Saldo global, visível em todas as telas e atualizado em tempo real:
 * - ao abrir o app;
 * - quando esta aba cria/edita/exclui algo (notifyDataChanged);
 * - quando outra aba ou outro usuário altera algo (evento SSE da API).
 */
const BalanceContext = createContext(null);

export function BalanceProvider({ children }) {
  const [summary, setSummary] = useState(null);
  const [live, setLive] = useState('connecting');
  const [pulse, setPulse] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.summary();
      setSummary(data);
      setPulse((value) => value + 1);
    } catch {
      // erros de rede já aparecem nas telas; o saldo mantém o último valor
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => connectRealtime({ onStatus: setLive }), []);
  useDataChanged(refresh);

  const value = useMemo(() => ({ summary, live, pulse, refresh }), [summary, live, pulse, refresh]);
  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBalance() {
  return useContext(BalanceContext);
}
