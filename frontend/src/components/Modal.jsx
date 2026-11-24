import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from './Feedback.jsx';

/** Modal acessível: fecha com Esc e clique fora, devolve o foco ao fechar. */
export function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  const titleId = useId();
  const panelRef = useRef(null);
  // Guarda o onClose mais recente sem refazer o efeito a cada render (o que roubaria o foco)
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const onKey = (event) => { if (event.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Foca o primeiro campo do modal
    requestAnimationFrame(() => {
      panelRef.current?.querySelector('input, select, textarea, button:not(.modal__close)')?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panelRef} className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmação para ações sensíveis, com campo de motivo opcional (vai para a auditoria). */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', tone = 'danger', askReason, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setReason(''); }, [open]);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(reason.trim() || undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onClose}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className={`btn btn--${tone}`} onClick={handleConfirm} disabled={busy}>
            {busy && <Spinner size={14} />} {confirmLabel}
          </button>
        </>
      )}
    >
      <p className="confirm__message">{message}</p>
      {askReason && (
        <label className="field">
          <span className="field__label">Motivo (fica registrado na auditoria)</span>
          <input
            className="input"
            value={reason}
            maxLength={255}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: lançamento em duplicidade"
          />
        </label>
      )}
    </Modal>
  );
}
