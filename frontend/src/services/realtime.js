import { api, tokenStorage } from './api.js';

/**
 * Saldo em tempo real.
 * Conecta no stream SSE da API (GET /api/events) usando fetch, para poder enviar
 * o token no cabeçalho Authorization (o EventSource nativo não permite).
 * Cada aviso do servidor vira o evento de janela DATA_CHANGED_EVENT.
 */
export const DATA_CHANGED_EVENT = 'safecash:data-changed';

export function notifyDataChanged(detail = {}) {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail }));
}

export function connectRealtime({ onStatus } = {}) {
  let controller = new AbortController();
  let stopped = false;
  let retryDelay = 1000;

  async function connect() {
    const token = tokenStorage.get();
    if (!token || stopped) return;

    try {
      const response = await fetch(`${api.baseUrl}/events`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(`SSE ${response.status}`);

      onStatus?.('online');
      retryDelay = 1000;

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        // Eventos SSE são separados por linha em branco
        let separator;
        while ((separator = buffer.indexOf('\n\n')) !== -1) {
          handleChunk(buffer.slice(0, separator));
          buffer = buffer.slice(separator + 2);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }

    if (!stopped) {
      onStatus?.('offline');
      // Reconexão com espera crescente (1s, 2s, 4s... até 30s)
      setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    }
  }

  function handleChunk(chunk) {
    let event = 'message';
    let data = '';
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (event === 'transactions:changed') {
      notifyDataChanged(data ? JSON.parse(data) : {});
    }
  }

  connect();

  return () => {
    stopped = true;
    controller.abort();
    controller = new AbortController();
  };
}
