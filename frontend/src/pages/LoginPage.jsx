import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../components/Feedback.jsx';
import { Logo } from '../components/Logo.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Administrador', email: 'admin@safecash.dev', password: 'Admin@123' },
  { label: 'Operador', email: 'operador@safecash.dev', password: 'Operador@123' },
  { label: 'Auditor', email: 'auditor@safecash.dev', password: 'Auditor@123' },
];

export default function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'authenticated') return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.email || !form.password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Bem-vindo(a), ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <section className="login__panel">
        <Logo size={44} />
        <h1>Entre na tesouraria</h1>
        <p className="login__subtitle">Fluxo de caixa com precisão bancária e trilha de auditoria completa.</p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">E-mail</span>
            <input className="input" type="email" autoComplete="username" value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Senha</span>
            <input className="input" type="password" autoComplete="current-password" value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          {error && <p className="form__error" role="alert">{error}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading && <Spinner size={14} />} Entrar
          </button>
        </form>

        <div className="demo-accounts">
          <span>Contas de demonstração</span>
          <div>
            {DEMO_ACCOUNTS.map((account) => (
              <button key={account.email} type="button" className="chip chip--button"
                onClick={() => setForm({ email: account.email, password: account.password })}>
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="login__art" aria-hidden="true">
        <div className="login__art-card">
          <span>Saldo atual</span>
          <strong>R$ 48.312,07</strong>
          <div className="login__art-bars">
            {[40, 62, 48, 75, 58, 88].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
          </div>
        </div>
        <ul>
          <li>Valores guardados em centavos: zero erro de arredondamento</li>
          <li>Nada é apagado: exclusão lógica com motivo e autor</li>
          <li>Saldo atualizado em tempo real para toda a equipe</li>
        </ul>
      </aside>
    </div>
  );
}
