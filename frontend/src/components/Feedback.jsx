import { Component } from 'react';

/** Etapa 8 — Componentes de feedback: loaders, estados vazios e falhas. */

export function Spinner({ size = 18, label = 'Carregando' }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label={label} />;
}

export function PageLoader({ label = 'Carregando...' }) {
  return (
    <div className="page-loader">
      <Spinner size={28} />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ width = '100%', height = 16, radius = 6 }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <rect x="8" y="12" width="40" height="32" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M8 22h40M16 32h10M16 37h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <strong>Não foi possível carregar.</strong>
      <p>{error?.message ?? 'Erro inesperado.'}</p>
      {error?.requestId && <small>Código para suporte: {error.requestId}</small>}
      {onRetry && <button type="button" className="btn btn--ghost" onClick={onRetry}>Tentar de novo</button>}
    </div>
  );
}

/** Captura erros de renderização para a tela não ficar branca. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro de interface:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-error">
          <h1>Algo deu errado nesta tela.</h1>
          <p>Seus dados estão seguros. Recarregue a página para continuar.</p>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
