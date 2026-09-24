import { useState } from 'react';
import ErrorState from '../components/ErrorState';
import Img from '../components/Img';
import Loading from '../components/Loading';
import { PlusIcon } from '../components/Icons';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import useConfirm from '../hooks/useConfirm';
import { deleteSlider, listSlidersAdmin, saveSlider, swapSliders } from '../services/adminApi';
import ImageUploader from './ImageUploader';
import { Modal, PageHead, Switch } from './ui';

const BLANK = { title: '', description: '', image_url: '', button_text: '', button_link: '', placement: 'home', is_active: true, sort_order: 0 };

function SlideForm({ slide, nextOrder, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(slide || { ...BLANK, sort_order: nextOrder });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.image_url) return setError('Upload an image for the slide.');
    if (f.button_text && !f.button_link) return setError('Add a link for the button (e.g. /shop).');
    setBusy(true);
    try { await saveSlider(f); toast.success('Slide saved'); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={slide ? 'Edit slide' : 'New slide'} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="slide-form" disabled={busy}>{busy ? 'Saving…' : 'Save slide'}</button></>}>
      <form id="slide-form" className="form-stack" onSubmit={submit} noValidate>
        {error && <p className="notice error" role="alert">{error}</p>}
        <ImageUploader label="Image *" value={f.image_url} onChange={(url) => setF((s) => ({ ...s, image_url: url }))} folder="sliders" ratio="21 / 9" />
        <label className="field">Title<input value={f.title || ''} onChange={set('title')} /></label>
        <label className="field">Description<textarea rows={2} value={f.description || ''} onChange={set('description')} /></label>
        <div className="form-row">
          <label className="field">Button text<input value={f.button_text || ''} onChange={set('button_text')} /></label>
          <label className="field">Button link<input value={f.button_link || ''} onChange={set('button_link')} placeholder="/shop or https://…" /></label>
        </div>
        <label className="field">Show on
          <select value={f.placement} onChange={set('placement')}><option value="home">Home page</option><option value="shop">Shop page</option></select>
        </label>
        <Switch checked={f.is_active} onChange={(v) => setF((s) => ({ ...s, is_active: v }))} label="Enabled" />
      </form>
    </Modal>
  );
}

export default function Sliders() {
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const slides = useAsync(listSlidersAdmin, []);
  const [editing, setEditing] = useState(null);

  const group = (p) => (slides.data || []).filter((s) => s.placement === p);
  const nextOrder = (slides.data || []).reduce((m, s) => Math.max(m, s.sort_order), 0) + 1;

  const move = async (list, i, d) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    try {
      // make sure orders are distinct before swapping
      const a = list[i]; const b = list[j];
      if (a.sort_order === b.sort_order) { await saveSlider({ ...b, sort_order: b.sort_order + (d > 0 ? 1 : -1) }); } else { await swapSliders(a, b); }
      slides.reload(true);
    } catch (e) { toast.error(e.message); }
  };
  const toggle = async (s, v) => { try { await saveSlider({ ...s, is_active: v }); slides.reload(true); } catch (e) { toast.error(e.message); } };
  const remove = async (s) => {
    if (!(await confirm({ title: 'Delete slide?', message: 'This slide will be removed from the store.', confirmLabel: 'Delete slide' }))) return;
    try { await deleteSlider(s.id); toast.success('Slide deleted'); slides.reload(true); } catch (e) { toast.error(e.message); }
  };

  const renderGroup = (title, list) => (
    <section className="panel" key={title}>
      <h2>{title}</h2>
      {list.length === 0 ? <p className="muted">No slides yet.</p> : (
        <ul className="slide-list">
          {list.map((s, i) => (
            <li key={s.id}>
              <div className="order-btns">
                <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(list, i, -1)}>↑</button>
                <button className="icon-btn" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(list, i, 1)}>↓</button>
              </div>
              <div className="slide-thumb"><Img src={s.image_url} alt="" ratio="21 / 9" sizes="160px" width={320} /></div>
              <div className="grow"><strong>{s.title || 'Untitled slide'}</strong><br /><small className="muted">{s.button_text ? `${s.button_text} → ${s.button_link}` : 'No button'}</small></div>
              <Switch checked={s.is_active} onChange={(v) => toggle(s, v)} />
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(s)}>Edit</button>
              <button className="btn btn-ghost btn-sm danger" onClick={() => remove(s)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
      <PageHead title="Sliders" subtitle="Banner slides for the home page and the shop page.">
        <button className="btn btn-primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> Add slide</button>
      </PageHead>
      {slides.loading ? <Loading /> : slides.error ? <ErrorState message={slides.error} onRetry={slides.reload} /> : (
        <>{renderGroup('Home page', group('home'))}{renderGroup('Shop page', group('shop'))}</>
      )}
      {editing && <SlideForm slide={editing === 'new' ? null : editing} nextOrder={nextOrder} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); slides.reload(true); }} />}
      {dialog}
    </>
  );
}
