import { useMemo, useState } from 'react';
import { ApiError } from '../services/api.js';
import { centsToApiAmount, maskCurrencyInput, todayIso } from '../utils/format.js';
import { Spinner } from './Feedback.jsx';

const DEFAULT_CATEGORIES = ['Aluguel', 'Clientes', 'Impostos', 'Investimentos', 'Marketing',
  'Pessoal', 'Tarifas bancárias', 'Tecnologia', 'Utilidades'];

/**
 * Formulário de criação/edição.
 * Validação no cliente para resposta imediata + a validação definitiva da API,
 * cujos erros por campo aparecem embaixo de cada input.
 */
export function TransactionForm({ initial, categories = [], onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({
    description: initial?.description ?? '',
    type: initial?.type ?? 'EXPENSE',
    category: initial?.category ?? '',
    date: initial?.date ?? todayIso(),
    notes: initial?.notes ?? '',
  }));
  const [amount, setAmount] = useState(() => maskCurrencyInput(initial ? String(initial.amountCents) : ''));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(
    () => [...new Set([...categories, ...DEFAULT_CATEGORIES])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [categories],
  );

  const set = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function validateLocally() {
    const found = {};
    if (values.description.trim().length < 2) found.description = 'Descreva o lançamento (mín. 2 caracteres).';
    if (amount.cents <= 0) found.amount = 'Informe um valor maior que zero.';
    if (values.category.trim().length < 2) found.category = 'Informe a categoria.';
    if (!values.date) found.date = 'Informe a data.';
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const localErrors = validateLocally();
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        description: values.description.trim(),
        amount: centsToApiAmount(amount.cents),
        type: values.type,
        category: values.category.trim(),
        date: values.date,
        notes: values.notes.trim() || null,
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        setErrors(error.fieldErrors);
        setFormError('Revise os campos destacados.');
      } else {
        setFormError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="segmented" role="radiogroup" aria-label="Tipo do lançamento">
        {[['EXPENSE', 'Saída'], ['INCOME', 'Entrada']].map(([type, label]) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={values.type === type}
            className={`segmented__option segmented__option--${type.toLowerCase()} ${values.type === type ? 'is-active' : ''}`}
            onClick={() => setValues((current) => ({ ...current, type }))}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="Descrição" error={errors.description}>
        <input className="input" value={values.description} onChange={set('description')}
          maxLength={140} placeholder="Ex.: Pagamento de Aluguel" autoComplete="off" />
      </Field>

      <div className="form__row">
        <Field label="Valor" error={errors.amount}>
          <div className={`money-input money-input--${values.type.toLowerCase()}`}>
            <span>R$</span>
            <input
              className="input"
              inputMode="numeric"
              value={amount.display}
              placeholder="0,00"
              onChange={(event) => {
                setAmount(maskCurrencyInput(event.target.value));
                setErrors((current) => ({ ...current, amount: undefined }));
              }}
              aria-describedby="amount-hint"
            />
          </div>
          <small id="amount-hint" className="field__hint">Digite só números: 200000 → 2.000,00</small>
        </Field>

        <Field label="Data" error={errors.date}>
          <input className="input" type="date" value={values.date} onChange={set('date')} />
        </Field>
      </div>

      <Field label="Categoria" error={errors.category}>
        <input className="input" list="category-options" value={values.category} onChange={set('category')}
          maxLength={60} placeholder="Escolha ou digite uma nova" autoComplete="off" />
        <datalist id="category-options">
          {categoryOptions.map((category) => <option key={category} value={category} />)}
        </datalist>
      </Field>

      <Field label="Observações (opcional)" error={errors.notes}>
        <textarea className="input" rows={2} value={values.notes} onChange={set('notes')} maxLength={500} />
      </Field>

      {formError && <p className="form__error" role="alert">{formError}</p>}

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving && <Spinner size={14} />} {initial ? 'Salvar alterações' : 'Lançar'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}
