import { useEffect, useState } from 'react';
import ErrorState from '../components/ErrorState';
import Loading from '../components/Loading';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import { listProductOptions, listSectionsAdmin, saveSection, setProductFlag, swapSections } from '../services/adminApi';
import ImageUploader from './ImageUploader';
import { PageHead, Picker, Switch } from './ui';

const ALL = ['title', 'description', 'image', 'cta', 'cta2', 'limit'];
const META = {
  hero: { label: 'Hero', fields: ['title', 'description', 'image', 'cta', 'cta2'] },
  slider: { label: 'Slider strip', fields: [], note: 'The slides themselves are managed under Sliders (placement: Home).' },
  categories: { label: 'Categories', fields: ['title', 'description', 'limit'], note: 'Shows your enabled categories.' },
  featured: { label: 'Featured products', fields: ['title', 'description', 'cta', 'limit'] },
  drop: { label: 'Drop / event', fields: ['cta', 'limit'], note: 'The name, banner and countdown come from the current drop (see Drops). The section hides itself when no drop is live or scheduled.' },
  promo_1: { label: 'Promotion 1', fields: ['title', 'description', 'image', 'cta'] },
  new_arrivals: { label: 'New arrivals', fields: ['title', 'description', 'cta', 'limit'], note: 'Shows the most recently added products.' },
  promo_2: { label: 'Promotion 2', fields: ['title', 'description', 'image', 'cta'] },
  intro: { label: 'Store introduction', fields: ['title', 'description', 'cta'] },
};

function SectionEditor({ section, onSaved }) {
  const toast = useToast();
  const meta = META[section.key] || { label: section.key, fields: ALL };
  const [f, setF] = useState(section);
  const [busy, setBusy] = useState(false);
  const has = (x) => meta.fields.includes(x);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try { await saveSection(f); toast.success(`${meta.label} saved`); onSaved(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="section-editor form-stack">
      {meta.note && <p className="muted small">{meta.note}</p>}
      {has('title') && <label className="field">Title<input value={f.title || ''} onChange={set('title')} /></label>}
      {has('description') && <label className="field">Description<textarea rows={3} value={f.description || ''} onChange={set('description')} /></label>}
      {has('image') && <ImageUploader label="Image" value={f.image_url} onChange={(url) => setF((s) => ({ ...s, image_url: url }))} folder="landing" ratio="4 / 3" />}
      {has('cta') && (
        <div className="form-row">
          <label className="field">Button text<input value={f.cta_text || ''} onChange={set('cta_text')} /></label>
          <label className="field">Button link<input value={f.cta_link || ''} onChange={set('cta_link')} placeholder="/shop or https://…" /></label>
        </div>
      )}
      {has('cta2') && (
        <div className="form-row">
          <label className="field">Second button text<input value={f.cta2_text || ''} onChange={set('cta2_text')} /></label>
          <label className="field">Second button link<input value={f.cta2_link || ''} onChange={set('cta2_link')} /></label>
        </div>
      )}
      {has('limit') && <label className="field">Items to show<input type="number" min="1" max="24" value={f.items_limit} onChange={set('items_limit')} /></label>}
      {meta.fields.length > 0 && <div><button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save section'}</button></div>}
    </div>
  );
}

function FeaturedPicker() {
  const toast = useToast();
  const products = useAsync(listProductOptions, []);
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (products.data) setSel(products.data.filter((p) => p.is_featured).map((p) => p.id)); }, [products.data]);

  const save = async () => {
    setBusy(true);
    try {
      const current = new Set(products.data.filter((p) => p.is_featured).map((p) => p.id));
      const next = new Set(sel);
      const jobs = [];
      products.data.forEach((p) => {
        if (next.has(p.id) && !current.has(p.id)) jobs.push(setProductFlag(p.id, { is_featured: true }));
        if (!next.has(p.id) && current.has(p.id)) jobs.push(setProductFlag(p.id, { is_featured: false }));
      });
      await Promise.all(jobs);
      toast.success('Featured products updated');
      products.reload(true);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (products.loading) return <Loading inline />;
  if (products.error) return <ErrorState message={products.error} onRetry={products.reload} />;
  return (
    <section className="panel">
      <h2>Featured products</h2>
      <p className="muted small">These appear in the "Featured products" section on the home page.</p>
      <Picker options={products.data.map((p) => ({ id: p.id, label: p.name }))} selected={sel} onChange={setSel} placeholder="Search products" empty="No products yet" />
      <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save featured products'}</button>
    </section>
  );
}

export default function LandingEditor() {
  const toast = useToast();
  const sections = useAsync(listSectionsAdmin, []);
  const [open, setOpen] = useState('hero');

  const toggleVisible = async (s, v) => {
    try { await saveSection({ ...s, is_visible: v }); sections.reload(true); } catch (e) { toast.error(e.message); }
  };
  const move = async (i, d) => {
    const list = sections.data;
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    try { await swapSections(list[i], list[j]); sections.reload(true); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHead title="Landing page" subtitle="Edit every section of the home page, show or hide it, and change the order." />
      {sections.loading ? <Loading /> : sections.error ? <ErrorState message={sections.error} onRetry={sections.reload} /> : (
        <div className="section-list">
          {sections.data.map((s, i) => (
            <div key={s.id} className="panel section-item">
              <div className="section-item-head">
                <div className="order-btns">
                  <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button className="icon-btn" aria-label="Move down" disabled={i === sections.data.length - 1} onClick={() => move(i, 1)}>↓</button>
                </div>
                <strong className="grow">{META[s.key]?.label || s.key}</strong>
                <Switch checked={s.is_visible} onChange={(v) => toggleVisible(s, v)} label="Visible" />
                <button className="btn btn-outline btn-sm" onClick={() => setOpen(open === s.key ? '' : s.key)} aria-expanded={open === s.key}>{open === s.key ? 'Close' : 'Edit'}</button>
              </div>
              {open === s.key && <SectionEditor key={`${s.id}-${s.is_visible}`} section={s} onSaved={() => sections.reload(true)} />}
            </div>
          ))}
        </div>
      )}
      <FeaturedPicker />
    </>
  );
}
