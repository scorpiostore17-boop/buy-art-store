import { sortSizes } from '../utils/product';

/**
 * Presentational filter panel. State lives in the URL (see Shop.jsx) so filters are shareable.
 * values: { category, sizes[], colors[], min, max, stock }
 */
export default function Filter({ categories, sizes, colors, bounds, values, onChange, onReset, currency }) {
  const toggle = (key, item) => {
    const cur = values[key];
    onChange({ [key]: cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item] });
  };
  return (
    <div className="filter">
      <div className="filter-head">
        <h2>Filters</h2>
        <button type="button" className="link-btn" onClick={onReset}>Reset</button>
      </div>

      <fieldset>
        <legend>Category</legend>
        <label className="radio"><input type="radio" name="cat" checked={!values.category} onChange={() => onChange({ category: '' })} /> All</label>
        {categories.map((c) => (
          <label key={c.id} className="radio">
            <input type="radio" name="cat" checked={values.category === c.slug} onChange={() => onChange({ category: c.slug })} /> {c.name}
          </label>
        ))}
      </fieldset>

      {sizes.length > 0 && (
        <fieldset>
          <legend>Size</legend>
          <div className="chips">
            {sortSizes(sizes).map((s) => (
              <button type="button" key={s} className={`chip${values.sizes.includes(s) ? ' is-active' : ''}`} aria-pressed={values.sizes.includes(s)} onClick={() => toggle('sizes', s)}>{s}</button>
            ))}
          </div>
        </fieldset>
      )}

      {colors.length > 0 && (
        <fieldset>
          <legend>Color</legend>
          <div className="swatches">
            {colors.map((c) => (
              <button type="button" key={c.name} title={c.name} aria-label={c.name} aria-pressed={values.colors.includes(c.name)}
                className={`swatch${values.colors.includes(c.name) ? ' is-active' : ''}`} style={{ '--swatch': c.hex }} onClick={() => toggle('colors', c.name)} />
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Price ({currency})</legend>
        <div className="price-range">
          <input type="number" inputMode="numeric" min={0} placeholder={String(bounds.min)} value={values.min} onChange={(e) => onChange({ min: e.target.value })} aria-label="Minimum price" />
          <span>–</span>
          <input type="number" inputMode="numeric" min={0} placeholder={String(bounds.max)} value={values.max} onChange={(e) => onChange({ max: e.target.value })} aria-label="Maximum price" />
        </div>
      </fieldset>

      <fieldset>
        <legend>Availability</legend>
        <label className="check"><input type="checkbox" checked={values.stock} onChange={(e) => onChange({ stock: e.target.checked })} /> In stock only</label>
      </fieldset>
    </div>
  );
}
