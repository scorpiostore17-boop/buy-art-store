import { useState } from 'react';
import ErrorState from '../components/ErrorState';
import Img from '../components/Img';
import Loading from '../components/Loading';
import { PlusIcon } from '../components/Icons';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import useConfirm from '../hooks/useConfirm';
import { deleteCategory, listCategoriesAdmin, saveCategory } from '../services/adminApi';
import { slugify } from '../utils/format';
import ImageUploader from './ImageUploader';
import { Modal, PageHead, Switch } from './ui';

const BLANK = { name: '', slug: '', image_url: '', is_active: true, sort_order: 0 };

function CategoryForm({ category, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(category || BLANK);
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required.');
    if (!slugify(form.slug)) return setError('Slug is required (letters, numbers and dashes).');
    setBusy(true);
    try {
      await saveCategory({ ...form, slug: slugify(form.slug) });
      toast.success('Category saved');
      onSaved();
    } catch (err) {
      setError(/duplicate|unique/i.test(err.message) ? 'Another category already uses this slug.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={category ? 'Edit category' : 'New category'} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="cat-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <form id="cat-form" className="form-stack" onSubmit={submit} noValidate>
        {error && <p className="notice error" role="alert">{error}</p>}
        <label className="field">Name *
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))} />
        </label>
        <label className="field">Slug (used in the URL)<input value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }} /></label>
        <label className="field">Sort order<input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} /></label>
        <ImageUploader label="Image" value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} folder="categories" ratio="1 / 1" />
        <Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} label="Enabled" />
      </form>
    </Modal>
  );
}

export default function Categories() {
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const cats = useAsync(listCategoriesAdmin, []);
  const [editing, setEditing] = useState(null);

  const toggle = async (c, v) => {
    try { await saveCategory({ ...c, is_active: v }); cats.reload(true); } catch (e) { toast.error(e.message); }
  };
  const remove = async (c) => {
    if (!(await confirm({ title: 'Delete category?', message: `"${c.name}" will be removed. Its products stay in the store without a category.`, confirmLabel: 'Delete category' }))) return;
    try { await deleteCategory(c.id); toast.success('Category deleted'); cats.reload(true); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHead title="Categories" subtitle="Group your products and choose which ones show in the store.">
        <button className="btn btn-primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> Add category</button>
      </PageHead>
      {cats.loading ? <Loading /> : cats.error ? <ErrorState message={cats.error} onRetry={cats.reload} /> : (
        <div className="panel table-wrap">
          <table className="table">
            <thead><tr><th /><th>Name</th><th>Slug</th><th>Order</th><th>Enabled</th><th /></tr></thead>
            <tbody>
              {cats.data.map((c) => (
                <tr key={c.id}>
                  <td className="thumb-cell"><Img src={c.image_url} alt="" ratio="1 / 1" sizes="56px" width={112} /></td>
                  <td><strong>{c.name}</strong></td><td className="muted">{c.slug}</td><td>{c.sort_order}</td>
                  <td><Switch checked={c.is_active} onChange={(v) => toggle(c, v)} /></td>
                  <td className="row-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(c)}>Edit</button>
                    <button className="btn btn-ghost btn-sm danger" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!cats.data.length && <tr><td colSpan={6} className="muted">No categories yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {editing && <CategoryForm category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); cats.reload(true); }} />}
      {dialog}
    </>
  );
}
