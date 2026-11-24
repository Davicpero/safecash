import { lazy } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';

// Etapa 9 — Code splitting: cada tela é baixada só quando o usuário entra nela
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage.jsx'));
const AuditPage = lazy(() => import('./pages/AuditPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));

function NotFound() {
  return (
    <div className="page empty-state">
      <strong>Página não encontrada</strong>
      <Link to="/" className="btn btn--primary">Voltar ao dashboard</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="transacoes" element={<TransactionsPage />} />
            <Route element={<ProtectedRoute permission="audit:read" />}>
              <Route path="auditoria" element={<AuditPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="user:manage" />}>
              <Route path="usuarios" element={<UsersPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
