import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { BalanceProvider, useBalance } from '../contexts/BalanceContext.jsx';
import { ROLE_LABEL, formatCents } from '../utils/format.js';
import { PageLoader, Skeleton } from './Feedback.jsx';
import { IconDashboard, IconList, IconLogout, IconShield, IconUsers } from './Icons.jsx';
import { Logo } from './Logo.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/transacoes', label: 'Transações', icon: IconList },
  { to: '/auditoria', label: 'Auditoria', icon: IconShield, permission: 'audit:read' },
  { to: '/usuarios', label: 'Usuários', icon: IconUsers, permission: 'user:manage' },
];

function LiveBalance() {
  const { summary, live, pulse } = useBalance();
  const cents = summary?.balance.amountCents;

  return (
    <div className="live-balance" title={live === 'online' ? 'Atualizando em tempo real' : 'Reconectando...'}>
      <span className="live-balance__label">
        <span className={`live-dot live-dot--${live}`} aria-hidden="true" />
        Saldo atual
      </span>
      {summary ? (
        // key={pulse}: reinicia a animação de destaque sempre que o saldo é recalculado
        <strong key={pulse} className={`live-balance__value ${cents < 0 ? 'is-negative' : ''} flash`}>
          {formatCents(cents)}
        </strong>
      ) : (
        <Skeleton width={120} height={22} />
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, can, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

  return (
    <BalanceProvider>
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar__brand"><Logo variant="light" size={34} /></div>
          <nav className="sidebar__nav" aria-label="Menu principal">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className="nav-link">
                <Icon /> <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar__user">
            <div className="avatar" aria-hidden="true">{user.name.slice(0, 1)}</div>
            <div className="sidebar__user-info">
              <strong>{user.name}</strong>
              <span>{ROLE_LABEL[user.role]}</span>
            </div>
            <button type="button" className="icon-btn icon-btn--light" onClick={() => logout()} aria-label="Sair" title="Sair">
              <IconLogout />
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar__brand-mobile"><Logo size={28} /></div>
            <LiveBalance />
            <button type="button" className="icon-btn topbar__logout" onClick={() => logout()} aria-label="Sair">
              <IconLogout />
            </button>
          </header>
          <main className="content">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        {/* Navegação inferior no celular */}
        <nav className="bottom-nav" aria-label="Menu">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="bottom-nav__link">
              <Icon /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </BalanceProvider>
  );
}
