/**
 * Cliente HTTP único da aplicação.
 * - injeta o token JWT;
 * - converte respostas de erro em ApiError com o mesmo formato da API;
 * - avisa a aplicação quando a sessão expira (401).
 */
const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'safecash.token';

export class ApiError extends Error {
  constructor({ status, code, message, details, requestId }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details ?? [];
    this.requestId = requestId;
  }

  /** Mensagens de validação por campo: { amount: 'O valor deve...' } */
  get fieldErrors() {
    return Object.fromEntries(this.details.filter((d) => d.field).map((d) => [d.field, d.message]));
  }
}

export const tokenStorage = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (token) => {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* modo privado */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* modo privado */ }
  },
};

export const SESSION_EXPIRED_EVENT = 'safecash:session-expired';

function buildUrl(path, query) {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request(path, { method = 'GET', body, query, headers = {}, signal, raw = false } = {}) {
  const token = tokenStorage.get();
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor. Verifique sua internet.' });
  }

  if (response.status === 401 && token) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError({
      status: response.status,
      code: payload.error?.code ?? 'HTTP_ERROR',
      message: payload.error?.message ?? `Erro ${response.status}`,
      details: payload.error?.details,
      requestId: payload.error?.requestId,
    });
  }

  if (raw) return response;
  return response.status === 204 ? null : response.json();
}

export const api = {
  baseUrl: BASE_URL,

  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  me: () => request('/auth/me'),

  listTransactions: (query, signal) => request('/transactions', { query, signal }),
  getCategories: () => request('/transactions/categories'),
  createTransaction: (data, idempotencyKey) => request('/transactions', {
    method: 'POST', body: data, headers: { 'Idempotency-Key': idempotencyKey },
  }),
  updateTransaction: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: data }),
  deleteTransaction: (id, reason) => request(`/transactions/${id}`, { method: 'DELETE', body: { reason } }),
  restoreTransaction: (id) => request(`/transactions/${id}/restore`, { method: 'PATCH' }),
  transactionHistory: (id) => request(`/transactions/${id}/history`),

  summary: (query) => request('/dashboard/summary', { query }),
  monthly: (months = 6) => request('/dashboard/monthly', { query: { months } }),
  categories: (query) => request('/dashboard/categories', { query }),

  listAudit: (query) => request('/audit', { query }),

  listUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PATCH', body: data }),

  async downloadCsv(query) {
    const response = await request('/reports/transactions.csv', { query, raw: true });
    const blob = await response.blob();
    const name = /filename="(.+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'extrato.csv';
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    link.click();
    URL.revokeObjectURL(url);
  },
};
