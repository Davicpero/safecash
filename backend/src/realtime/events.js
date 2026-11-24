/**
 * Saldo em tempo real (Server-Sent Events).
 * Toda vez que uma transação muda, a API avisa todos os navegadores conectados
 * e eles recarregam o saldo, inclusive em outras abas e outros usuários.
 */
const clients = new Set();

export function subscribe(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // evita buffer em proxies (Nginx/Render)
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

  const client = { res, userId: req.user.id };
  clients.add(client);

  // Comentário a cada 25s mantém a conexão viva atrás de proxies
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
}

export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.res.write(payload);
  }
}

export function connectedClients() {
  return clients.size;
}
