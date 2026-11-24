import { useEffect, useState } from 'react';

/** Atrasa a atualização de um valor: a busca só dispara quando o usuário para de digitar. */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
