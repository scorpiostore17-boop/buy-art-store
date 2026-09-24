import { MinusIcon, PlusIcon } from './Icons';

export default function QuantitySelector({ value, max = 99, onChange, small = false }) {
  return (
    <div className={`qty${small ? ' qty-sm' : ''}`}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)}><MinusIcon width={16} height={16} /></button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)}><PlusIcon width={16} height={16} /></button>
    </div>
  );
}
