import { useMemo, useState } from 'react';
import ErrorState from '../components/ErrorState';
import Img from '../components/Img';
import Loading from '../components/Loading';
import { PlusIcon, TrashIcon } from '../components/Icons';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import useConfirm from '../hooks/useConfirm';
import { deleteProduct, listCategoriesAdmin, listProductsAdmin, saveProduct, setProductFlag } from '../services/adminApi';
import { isHex } from '../utils/color';
import { mainImage, totalStock } from '../utils/product';
import { ImageList } from './ImageUploader';
import { Modal, PageHead, Switch } from './ui';

const BLANK = { name: '', description: '', details: '', price: '', discount_price: '', category_id: '', is_featured: false, is_visible: true };
const blankVariant = () => ({ key: crypto.randomUUID(), size: 'One size', color_name: '', color_hex: '#000000', stock: 0 });

function parseColors(text) {
  // "Black:#000000, White:#ffffff, Red"
  return text.split(',').map((t) => t.trim()).filter(Boolean).map((t) => {
    const [name, hex] = t.split(':').map((x) => x.trim());
    return { name, hex: isHex(hex) ? hex : '#cccccc' };
  });
}

function ProductForm({ product, categories, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => (product ? {
    id: product.id, name: product.name, description: product.description || '', details: product.details || '',
    price: product.price, discount_price: product.discount_price ?? '', category_id: product.category_id || '',
    is_featured: product.is_featured, is_visible: product.is_visible,
  } : BLANK));
  const [variants, setVariants] = useState(() => (product?.variants?.length
    ? product.variants.map((v) => ({ ...v, key: v.id, color_hex: v.color_hex || '#000000' }))
    : [blankVariant()]));
  const [images, setImages] = useState(() => (product?.images || []).map((i) => ({ url: i.url, public_id: i.public_id, color_name: i.color_name || '', sort_order: i.sort_order })).sort((a, b) => a.sort_order - b.sort_order));
  const [gen, setGen] = useState({ sizes: '', colors: '' });
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setV = (key, patch) => setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  const generate = () => {
    const sizes = gen.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    const colors = parseColors(gen.colors);
    if (!sizes.length && !colors.length) return;
    const S = sizes.length ? sizes : ['One size'];
    const C = colors.length ? colors : [{ name: '', hex: '#000000' }];
    setVariants((cur) => {
      const has = (s, c) => cur.some((v) => v.size.trim().toLowerCase() === s.toLowerCase() && v.color_name.trim().toLowerCase() === c.toLowerCase());
      const added = [];
      C.forEach((c) => S.forEach((s) => { if (!has(s, c.name)) added.push({ key: crypto.randomUUID(), size: s, color_name: c.name, color_hex: c.hex, stock: 0 }); }));
      // drop the untouched blank starter row
      const base = cur.filter((v) => !(v.size === 'One size' && !v.color_name && !v.id && Number(v.stock) === 0 && added.length));
      return [...base, ...added];
    });
  };

  const colorNames = [...new Set(variants.map((v) => v.color_name.trim()).filter(Boolean))];
  const groups = ['', ...colorNames];

  const validate = () => {
    const e = [];
    if (!form.name.trim()) e.push('Product name is required.');
    const price = Number(form.price);
    if (!(price > 0)) e.push('Enter a price greater than 0.');
    if (form.discount_price !== '' && !(Number(form.discount_price) > 0 && Number(form.discount_price) < price)) e.push('Discount price must be greater than 0 and lower than the price.');
    if (!variants.length) e.push('Add at least one size/color variant with stock.');
    const seen = new Set();
    variants.forEach((v, i) => {
      const k = `${v.size.trim().toLowerCase()}|${v.color_name.trim().toLowerCase()}`;
      if (seen.has(k)) e.push(`Variant #${i + 1} duplicates another size/color combination.`);
      seen.add(k);
      if (!v.size.trim()) e.push(`Variant #${i + 1} needs a size (use "One size").`);
      if (!(parseInt(v.stock, 10) >= 0)) e.push(`Variant #${i + 1} needs a valid stock number.`);
    });
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (e.length) return;
    setBusy(true);
    try {
      const kept = images.filter((i) => groups.includes(i.color_name));
      await saveProduct(form, variants, kept);
      toast.success('Product saved');
      onSaved();
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={product ? 'Edit product' : 'New product'} wide onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="product-form" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></>}
    >
      <form id="product-form" className="form-stack" onSubmit={submit} noValidate>
        {errors.length > 0 && <div className="notice error" role="alert"><ul>{errors.map((m) => <li key={m}>{m}</li>)}</ul></div>}

        <div className="form-row">
          <label className="field">Name *<input value={form.name} onChange={set('name')} /></label>
          <label className="field">Category
            <select value={form.category_id} onChange={set('category_id')}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label className="field">Price *<input type="number" min="0" step="1" value={form.price} onChange={set('price')} /></label>
          <label className="field">Discount price<input type="number" min="0" step="1" value={form.discount_price} onChange={set('discount_price')} placeholder="Optional" /></label>
        </div>
        <label className="field">Short description<textarea rows={3} value={form.description} onChange={set('description')} /></label>
        <label className="field">Full product information<textarea rows={4} value={form.details} onChange={set('details')} placeholder={'One detail per line, e.g.\n100% cotton\nOversized fit\nMachine wash 30°C'} /></label>
        <div className="switch-row">
          <Switch checked={form.is_visible} onChange={(v) => setForm((f) => ({ ...f, is_visible: v }))} label="Visible in store" />
          <Switch checked={form.is_featured} onChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} label="Featured on home page" />
        </div>

        <fieldset className="box">
          <legend>Sizes, colors & stock</legend>
          <div className="gen">
            <input placeholder="Sizes: S, M, L, XL" value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} aria-label="Sizes to generate" />
            <input placeholder="Colors: Black:#000000, White:#ffffff" value={gen.colors} onChange={(e) => setGen({ ...gen, colors: e.target.value })} aria-label="Colors to generate" />
            <button type="button" className="btn btn-outline btn-sm" onClick={generate}>Generate variants</button>
          </div>
          <div className="variant-table">
            <div className="variant-row head"><span>Size</span><span>Color name</span><span>Hex</span><span>Stock</span><span /></div>
            {variants.map((v) => (
              <div className="variant-row" key={v.key}>
                <input value={v.size} onChange={(e) => setV(v.key, { size: e.target.value })} aria-label="Size" />
                <input value={v.color_name} onChange={(e) => setV(v.key, { color_name: e.target.value })} placeholder="(none)" aria-label="Color name" />
                <input type="color" value={isHex(v.color_hex) ? v.color_hex : '#000000'} onChange={(e) => setV(v.key, { color_hex: e.target.value })} aria-label="Color" disabled={!v.color_name.trim()} />
                <input type="number" min="0" step="1" value={v.stock} onChange={(e) => setV(v.key, { stock: e.target.value })} aria-label="Stock" />
                <button type="button" className="icon-btn" aria-label="Remove variant" onClick={() => setVariants((vs) => vs.filter((x) => x.key !== v.key))}><TrashIcon width={18} height={18} /></button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVariants((vs) => [...vs, blankVariant()])}><PlusIcon width={16} height={16} /> Add variant</button>
        </fieldset>

        <fieldset className="box">
          <legend>Images (Cloudinary)</legend>
          <p className="muted small">"All colors" images show by default. Add images to a specific color and they replace the default set when a shopper picks that color.</p>
          {groups.map((cn) => (
            <ImageList
              key={cn || 'all'}
              label={cn || 'All colors'}
              images={images.filter((i) => i.color_name === cn)}
              onChange={(list) => setImages((prev) => [...prev.filter((i) => i.color_name !== cn), ...list.map((i) => ({ ...i, color_name: cn }))])}
            />
          ))}
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Products() {
  const { money, settings } = useSettings();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const products = useAsync(listProductsAdmin, []);
  const cats = useAsync(listCategoriesAdmin, []);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  const rows = useMemo(() => (products.data || []).filter((p) =>
    (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (!cat || p.category_id === cat)), [products.data, q, cat]);

  const flag = async (p, patch) => {
    try { await setProductFlag(p.id, patch); products.reload(true); } catch (e) { toast.error(e.message); }
  };
  const remove = async (p) => {
    if (!(await confirm({ title: 'Delete product?', message: `"${p.name}" and its variants and images will be removed. Past orders keep their details.`, confirmLabel: 'Delete product' }))) return;
    try { await deleteProduct(p.id); toast.success('Product deleted'); products.reload(true); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHead title="Products & inventory" subtitle={`${products.data?.length || 0} products`}>
        <input type="search" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> Add product</button>
      </PageHead>

      {products.loading ? <Loading /> : products.error ? <ErrorState message={products.error} onRetry={products.reload} /> : (
        <div className="panel table-wrap">
          <table className="table">
            <thead><tr><th /><th>Product</th><th>Price</th><th>Stock</th><th>Visible</th><th>Featured</th><th /></tr></thead>
            <tbody>
              {rows.map((p) => {
                const stock = totalStock(p);
                return (
                  <tr key={p.id}>
                    <td className="thumb-cell"><Img src={mainImage(p)} alt="" ratio="1 / 1" sizes="56px" width={112} /></td>
                    <td><strong>{p.name}</strong><br /><small className="muted">{p.category?.name || 'No category'} · {p.variants.length} variants</small></td>
                    <td>{p.discount_price ? <><strong>{money(p.discount_price)}</strong> <s className="muted">{money(p.price)}</s></> : money(p.price)}</td>
                    <td className={stock <= settings.low_stock_threshold ? 'text-danger' : ''}>{stock}</td>
                    <td><Switch checked={p.is_visible} onChange={(v) => flag(p, { is_visible: v })} /></td>
                    <td><Switch checked={p.is_featured} onChange={(v) => flag(p, { is_featured: v })} /></td>
                    <td className="row-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => setEditing(p)}>Edit</button>
                      <button className="btn btn-ghost btn-sm danger" onClick={() => remove(p)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={7} className="muted">{products.data?.length ? 'No products match your search.' : 'No products yet. Add your first product.'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={cats.data || []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); products.reload(true); }}
        />
      )}
      {dialog}
    </>
  );
}
