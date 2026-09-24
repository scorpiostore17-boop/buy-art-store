export default function ColorSelector({ colors, value, onChange, isAvailable = () => true }) {
  if (!colors.length) return null;
  return (
    <div className="selector" role="radiogroup" aria-label="Color">
      <div className="selector-label">Color: <strong>{value || 'Choose'}</strong></div>
      <div className="swatches">
        {colors.map((c) => {
          const ok = isAvailable(c.name);
          return (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={value === c.name}
              aria-label={`${c.name}${ok ? '' : ' (out of stock)'}`}
              title={ok ? c.name : `${c.name} - out of stock`}
              disabled={!ok}
              className={`swatch${value === c.name ? ' is-active' : ''}${ok ? '' : ' is-off'}`}
              style={{ '--swatch': c.hex }}
              onClick={() => onChange(c.name)}
            />
          );
        })}
      </div>
    </div>
  );
}
