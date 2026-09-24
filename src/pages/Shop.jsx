import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import Filter from '../components/Filter';
import { CloseIcon, FilterIcon } from '../components/Icons';
import ProductGrid from '../components/ProductGrid';
import SearchBar from '../components/SearchBar';
import Slider from '../components/Slider';
import { useCatalog } from '../context/CatalogContext';
import { useSettings } from '../context/SettingsContext';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import { fetchSliders } from '../services/api';
import { colorsOf, finalPrice, isInStock } from '../utils/product';

const PAGE = 12;
const SORTS = [
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name', 'Name A–Z'],
];
const list = (v) => (v ? v.split(',').filter(Boolean) : []);

export default function Shop() {
  const { products, categories, loading, error, reload } = useCatalog();
  const { settings } = useSettings();
  const slides = useAsync(() => fetchSliders('shop'), []);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounce(search, 250).trim().toLowerCase();
  const [visible, setVisible] = useState(PAGE);
  const [panel, setPanel] = useState(false);

  const values = {
    category: params.get('category') || '',
    sizes: list(params.get('size')),
    colors: list(params.get('color')),
    min: params.get('min') || '',
    max: params.get('max') || '',
    stock: params.get('stock') === '1',
  };
  const sort = params.get('sort') || 'newest';

  const update = (patch) => {
    const next = new URLSearchParams(params);
    const map = { category: 'category', sizes: 'size', colors: 'color', min: 'min', max: 'max', stock: 'stock', sort: 'sort' };
    Object.entries(patch).forEach(([k, v]) => {
      const key = map[k];
      const val = Array.isArray(v) ? v.join(',') : v === true ? '1' : v === false ? '' : v;
      if (val) next.set(key, val); else next.delete(key);
    });
    setParams(next, { replace: true });
  };
  const reset = () => { setSearch(''); setParams({}, { replace: true }); };

  const options = useMemo(() => {
    const sizeSet = new Set();
    const colorMap = new Map();
    let min = Infinity;
    let max = 0;
    products.forEach((p) => {
      p.variants.forEach((v) => sizeSet.add(v.size));
      colorsOf(p).forEach((c) => colorMap.set(c.name, c));
      min = Math.min(min, finalPrice(p));
      max = Math.max(max, finalPrice(p));
    });
    const sizes = [...sizeSet].filter((s) => s !== 'One size');
    return { sizes, colors: [...colorMap.values()], bounds: { min: Number.isFinite(min) ? min : 0, max } };
  }, [products]);

  const filtered = useMemo(() => {
    const min = values.min === '' ? null : Number(values.min);
    const max = values.max === '' ? null : Number(values.max);
    let r = products.filter((p) => {
      if (q && !`${p.name} ${p.description || ''} ${p.category?.name || ''}`.toLowerCase().includes(q)) return false;
      if (values.category && p.category?.slug !== values.category) return false;
      if (values.sizes.length && !p.variants.some((v) => values.sizes.includes(v.size) && v.stock > 0)) return false;
      if (values.colors.length && !p.variants.some((v) => values.colors.includes(v.color_name) && v.stock > 0)) return false;
      const price = finalPrice(p);
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
      if (values.stock && !isInStock(p)) return false;
      return true;
    });
    if (sort === 'price-asc') r = [...r].sort((a, b) => finalPrice(a) - finalPrice(b));
    else if (sort === 'price-desc') r = [...r].sort((a, b) => finalPrice(b) - finalPrice(a));
    else if (sort === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, params.toString()]);

  useEffect(() => { setVisible(PAGE); }, [q, params.toString()]);

  const activeCategory = categories.find((c) => c.slug === values.category);

  return (
    <div className="container shop">
      {slides.data?.length > 0 && <div className="section-tight"><Slider slides={slides.data} /></div>}

      <div className="shop-head">
        <h1>{activeCategory ? activeCategory.name : 'Shop'}</h1>
        <p className="muted">{loading ? 'Loading…' : `${filtered.length} product${filtered.length === 1 ? '' : 's'}`}</p>
      </div>

      <div className="shop-toolbar">
        <SearchBar value={search} onChange={setSearch} />
        <select value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })} aria-label="Sort products">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn btn-outline filter-toggle" onClick={() => setPanel(true)}><FilterIcon width={18} height={18} /> Filters</button>
      </div>

      {categories.length > 0 && (
        <div className="pills" role="tablist" aria-label="Categories">
          <button className={`pill${!values.category ? ' is-active' : ''}`} onClick={() => update({ category: '' })}>All</button>
          {categories.map((c) => (
            <button key={c.id} className={`pill${values.category === c.slug ? ' is-active' : ''}`} onClick={() => update({ category: c.slug })}>{c.name}</button>
          ))}
        </div>
      )}

      <div className="shop-layout">
        <aside className={`filter-panel${panel ? ' is-open' : ''}`}>
          <button className="icon-btn filter-close" onClick={() => setPanel(false)} aria-label="Close filters"><CloseIcon /></button>
          <Filter
            categories={categories}
            sizes={options.sizes}
            colors={options.colors}
            bounds={options.bounds}
            values={values}
            onChange={update}
            onReset={reset}
            currency={settings.currency}
          />
          <button className="btn btn-primary btn-block filter-apply" onClick={() => setPanel(false)}>Show {filtered.length} results</button>
        </aside>
        {panel && <div className="drawer-backdrop is-open filter-backdrop" onClick={() => setPanel(false)} />}

        <section aria-live="polite">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <>
              <ProductGrid
                products={filtered.slice(0, visible)}
                loading={loading}
                emptyTitle={products.length ? 'No products match your filters' : 'No products yet'}
                emptyText={products.length ? 'Try removing a filter or searching for something else.' : 'New pieces will appear here soon.'}
                onReset={products.length ? reset : undefined}
              />
              {visible < filtered.length && (
                <div className="load-more"><button className="btn btn-outline" onClick={() => setVisible((v) => v + PAGE)}>Load more</button></div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
