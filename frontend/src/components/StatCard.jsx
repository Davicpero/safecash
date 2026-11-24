import { memo } from 'react';
import { formatCents } from '../utils/format.js';
import { Skeleton } from './Feedback.jsx';

export const StatCard = memo(function StatCard({ label, cents, hint, tone = 'neutral', icon, highlight }) {
  return (
    <article className={`stat stat--${tone} ${highlight ? 'stat--highlight' : ''}`}>
      <header className="stat__header">
        <span>{label}</span>
        {icon && <span className="stat__icon" aria-hidden="true">{icon}</span>}
      </header>
      {cents === undefined
        ? <Skeleton width="70%" height={30} />
        : <strong className={`stat__value ${cents < 0 ? 'is-negative' : ''}`}>{formatCents(cents)}</strong>}
      {hint && <small className="stat__hint">{hint}</small>}
    </article>
  );
});
