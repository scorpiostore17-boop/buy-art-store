export default function SizeSelector({ sizes, value, onChange, isAvailable = () => true, hideIfSingle = true }) {
  if (!sizes.length || (hideIfSingle && sizes.length === 1 && sizes[0] === 'One size')) return null;
  return (
    <div className="selector" role="radiogroup" aria-label="Size">
      <div className="selector-label">Size: <strong>{value || 'Choose'}</strong></div>
      <div className="chips">
        {sizes.map((s) => {
          const ok = isAvailable(s);
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={value === s}
              disabled={!ok}
              title={ok ? s : `${s} - out of stock`}
              className={`chip${value === s ? ' is-active' : ''}${ok ? '' : ' is-off'}`}
              onClick={() => onChange(s)}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
