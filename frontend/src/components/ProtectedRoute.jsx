import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PageLoader } from './Feedback.jsx';

/**
 * Etapa 5 — Rotas protegidas no frontend.
 * (A proteção de verdade está na API; esta só evita mostrar telas sem acesso.)
 */
export function ProtectedRoute({ permission }) {
  const { status, can } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <PageLoader label="Verificando sessão..." />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  if (permission && !can(permission)) return <Navigate to="/" replace />;

  return <Outlet />;
}
