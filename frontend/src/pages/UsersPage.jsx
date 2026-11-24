import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, Skeleton, Spinner } from '../components/Feedback.jsx';
import { IconPlus } from '../components/Icons.jsx';
import { Modal } from '../components/Modal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ApiError, api } from '../services/api.js';
import { ROLE_LABEL } from '../utils/format.js';

const ROLE_HELP = {
  ADMIN: 'Tudo, inclusive restaurar excluídos e gerenciar usuários',
  OPERATOR: 'Cria, edita e exclui lançamentos',
  AUDITOR: 'Somente leitura, vê excluídos e a trilha de auditoria',
};

/** Etapa 5 — Gestão de usuários e perfis (RBAC). Somente ADMIN. */
export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.listUsers();
      setUsers(data);
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function update(user, change) {
    try {
      await api.updateUser(user.id, change);
      toast.success('Usuário atualizado.');
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Usuários e perfis</h1>
          <p className="page__subtitle">Quem acessa a tesouraria e o que cada um pode fazer.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
          <IconPlus width={18} height={18} /> Novo usuário
        </button>
      </header>

      <section className="roles">
        {Object.entries(ROLE_HELP).map(([role, help]) => (
          <div key={role} className="role-card"><strong>{ROLE_LABEL[role]}</strong><span>{help}</span></div>
        ))}
      </section>

      <article className="card card--flush">
        {state.error && <ErrorState error={state.error} onRetry={load} />}
        {state.loading && <div className="card__pad"><Skeleton height={120} /></div>}
        {users.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={user.active ? undefined : 'is-deleted'}>
                    <td data-label="Nome">{user.name} {user.id === me.id && <span className="badge">você</span>}</td>
                    <td data-label="E-mail">{user.email}</td>
                    <td data-label="Perfil">
                      <select className="input input--compact" value={user.role} disabled={user.id === me.id}
                        onChange={(event) => update(user, { role: event.target.value })} aria-label={`Perfil de ${user.name}`}>
                        {Object.keys(ROLE_HELP).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
                      </select>
                    </td>
                    <td data-label="Situação">
                      <button type="button" className={`switch ${user.active ? 'is-on' : ''}`} disabled={user.id === me.id}
                        onClick={() => update(user, { active: !user.active })} aria-pressed={user.active}>
                        <span /> {user.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <Modal open={creating} title="Novo usuário" onClose={() => setCreating(false)}>
        {creating && <UserForm onDone={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}
      </Modal>
    </div>
  );
}

function UserForm({ onDone, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OPERATOR' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api.createUser(form);
      toast.success('Usuário criado.');
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') setErrors(error.fieldErrors);
      else setErrors({ form: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {[['name', 'Nome', 'text'], ['email', 'E-mail', 'email'], ['password', 'Senha inicial (8+ caracteres, letras e números)', 'password']]
        .map(([field, label, type]) => (
          <label key={field} className={`field ${errors[field] ? 'has-error' : ''}`}>
            <span className="field__label">{label}</span>
            <input className="input" type={type} value={form[field]} onChange={set(field)} autoComplete="off" />
            {errors[field] && <span className="field__error">{errors[field]}</span>}
          </label>
        ))}
      <label className="field">
        <span className="field__label">Perfil</span>
        <select className="input" value={form.role} onChange={set('role')}>
          {Object.entries(ROLE_HELP).map(([role, help]) => <option key={role} value={role}>{ROLE_LABEL[role]} — {help}</option>)}
        </select>
      </label>
      {errors.form && <p className="form__error" role="alert">{errors.form}</p>}
      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving && <Spinner size={14} />} Criar usuário</button>
      </div>
    </form>
  );
}
