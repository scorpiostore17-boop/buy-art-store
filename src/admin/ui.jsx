import { useEffect, useMemo, useState } from 'react';
import { CloseIcon } from '../components/Icons';

export function Modal({ title, onClose, children, wide = false, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
      <div className="page-head-actions">{children}</div>
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className={`switch${disabled ? ' disabled' : ''}`}>
      <input type="checkbox" role="switch" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-ui" aria-hidden="true" />
      {label && <span>{label}</span>}
    </label>
  );
}

export const STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const StatusBadge = ({ status }) => <span className={`status status-${status}`}>{cap(status)}</span>;

/** Searchable checklist. options: [{id,label}]. selected: array of ids. */
export function Picker({ options, selected, onChange, placeholder = 'Search…', empty = 'Nothing to show' }) {
  const [q, setQ] = useState('');
  const set = useMemo(() => new Set(selected), [selected]);
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id) => onChange(set.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="picker">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <div className="picker-list">
        {shown.length === 0 && <p className="muted small">{empty}</p>}
        {shown.map((o) => (
          <label key={o.id} className="check"><input type="checkbox" checked={set.has(o.id)} onChange={() => toggle(o.id)} /> {o.label}</label>
        ))}
      </div>
      <small className="muted">{selected.length} selected</small>
    </div>
  );
}
