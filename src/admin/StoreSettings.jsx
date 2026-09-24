import { useEffect, useState } from 'react';
import ErrorState from '../components/ErrorState';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import { downloadBrowserDatabaseBackup, getAdminSettings, importBrowserDatabase, saveSettings } from '../services/adminApi';
import { isHex, readableOn } from '../utils/color';
import ImageUploader from './ImageUploader';
import { PageHead } from './ui';

const COLORS = [
  ['primary_color', 'Primary'],
  ['secondary_color', 'Secondary'],
  ['accent_color', 'Accent'],
  ['background_color', 'Background'],
  ['text_color', 'Text'],
];

function ColorField({ label, value, onChange }) {
  return (
    <label className="field color-field">
      {label}
      <span>
        <input type="color" value={isHex(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={`${label} color picker`} />
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} maxLength={7} aria-label={`${label} hex`} />
      </span>
    </label>
  );
}

export default function StoreSettings() {
  const toast = useToast();
  const { updatePassword } = useAuth();
  const { reload: reloadTheme } = useSettings();
  const data = useAsync(getAdminSettings, []);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [passwords, setPasswords] = useState({ next: '', confirm: '' });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => { if (data.data) setF({ ...data.data }); }, [data.data]);
  if (data.loading || !f) return data.error ? <ErrorState message={data.error} onRetry={data.reload} /> : <Loading />;

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setColor = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const changePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (passwords.next.length < 12) return setPasswordError('Password must be at least 12 characters.');
    if (passwords.next !== passwords.confirm) return setPasswordError('Passwords do not match.');
    setPasswordBusy(true);
    try {
      await updatePassword(passwords.next);
      setPasswords({ next: '', confirm: '' });
      toast.success('Admin password changed');
    } catch (err) { setPasswordError(err.message); } finally { setPasswordBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    const bad = COLORS.find(([k]) => !isHex(f[k]));
    if (bad) return setError(`${bad[1]} color must be a hex value like #013294.`);
    if (!f.store_name.trim()) return setError('Store name is required.');
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setError('Enter a valid store email.');
    setBusy(true);
    setError('');
    try {
      const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() === '' && !['store_name', 'currency'].includes(k) ? null : v.trim()) : v]));
      clean.low_stock_threshold = Math.max(0, parseInt(f.low_stock_threshold, 10) || 0);
      await saveSettings(clean);
      await reloadTheme();
      toast.success('Store settings saved');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const importPreviousData = async () => {
    setImportBusy(true);
    setError('');
    try {
      const result = await importBrowserDatabase();
      setF({ ...(await getAdminSettings()) });
      await reloadTheme();
      toast.success(`Imported ${result.imported_products} products and ${result.imported_orders} orders`);
    } catch (err) { setError(err.message); } finally { setImportBusy(false); }
  };

  const importBackupFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportBusy(true);
    setError('');
    try {
      const backup = JSON.parse(await file.text());
      const result = await importBrowserDatabase(backup);
      setF({ ...(await getAdminSettings()) });
      await reloadTheme();
      toast.success(`Imported ${result.imported_products} products and ${result.imported_orders} orders`);
    } catch (err) { setError(err instanceof SyntaxError ? 'The selected backup file is invalid.' : err.message); }
    finally { setImportBusy(false); event.target.value = ''; }
  };

  const text = (k, label, props = {}) => <label className="field">{label}<input value={f[k] || ''} onChange={set(k)} {...props} /></label>;

  return (
    <>
      <PageHead title="Store settings" subtitle="Branding, colors, contact details and social links. Changes appear on the storefront immediately." />
      <form className="form-stack settings-form" onSubmit={submit} noValidate>
        {error && <p className="notice error" role="alert">{error}</p>}

        <section className="panel">
          <h2>Import your previous browser data</h2>
          <p className="muted small">To move data between localhost and your published domain, download a backup in the old browser, then select that file here. Configure and save Cloudinary first if you want old local images uploaded there.</p>
          <div className="form-row">
            <button type="button" className="btn btn-outline" onClick={() => { try { downloadBrowserDatabaseBackup(); } catch (err) { setError(err.message); } }}>Download backup from this browser</button>
            <label className="field">Import backup file<input type="file" accept="application/json,.json" onChange={importBackupFile} disabled={importBusy} /></label>
            <button type="button" className="btn btn-outline" onClick={importPreviousData} disabled={importBusy}>{importBusy ? 'Importing…' : 'Import this browser’s store data'}</button>
          </div>
          <p className="muted small">The backup contains store data and customer orders. Keep it private and delete it after confirming the import.</p>
        </section>

        <section className="panel">
          <h2>Admin access</h2>
          <p className="muted small">Change the password used to sign in to this admin panel.</p>
          {passwordError && <p className="notice error" role="alert">{passwordError}</p>}
          <div className="form-row">
            <label className="field">New password<input type="password" value={passwords.next} onChange={(e) => setPasswords((s) => ({ ...s, next: e.target.value }))} autoComplete="new-password" /></label>
            <label className="field">Confirm password<input type="password" value={passwords.confirm} onChange={(e) => setPasswords((s) => ({ ...s, confirm: e.target.value }))} autoComplete="new-password" /></label>
            <div><button type="button" className="btn btn-outline" onClick={changePassword} disabled={passwordBusy}>{passwordBusy ? 'Changing…' : 'Change password'}</button></div>
          </div>
        </section>

        <section className="panel">
          <h2>Brand</h2>
          <div className="form-row">
            {text('store_name', 'Store name *')}
            {text('currency', 'Currency label', { maxLength: 8 })}
          </div>
          <ImageUploader label="Logo" value={f.logo_url} onChange={(url) => setF((s) => ({ ...s, logo_url: url }))} folder="branding" ratio="1 / 1" />
          <p className="muted small">Use a transparent PNG. Without a logo, the bundled default is used.</p>
        </section>

        <section className="panel">
          <h2>Colors</h2>
          <div className="color-grid">
            {COLORS.map(([k, label]) => <ColorField key={k} label={label} value={f[k]} onChange={setColor(k)} />)}
          </div>
          <div className="theme-preview" style={{ background: f.background_color, color: f.text_color }}>
            <strong style={{ color: f.primary_color }}>Preview</strong>
            <span>Body text on your background</span>
            <button type="button" style={{ background: f.primary_color, color: readableOn(f.primary_color) }}>Primary</button>
            <button type="button" style={{ background: f.secondary_color, color: readableOn(f.secondary_color) }}>Secondary</button>
            <i style={{ background: f.accent_color }}>Accent</i>
          </div>
        </section>

        <section className="panel">
          <h2>Contact</h2>
          <div className="form-row">{text('phone', 'Phone')}{text('email', 'Email', { type: 'email' })}</div>
          <div className="form-row">{text('address', 'Address')}{text('neighborhood_note', 'Neighborhood note')}</div>
          <div className="form-row">{text('municipality', 'Municipality')}{text('wilaya', 'Wilaya')}</div>
          <label className="field">Working hours<textarea rows={3} value={f.working_hours || ''} onChange={set('working_hours')} placeholder={'Sat - Thu: 10:00 - 20:00\nFri: closed'} /></label>
          <label className="field">Google Maps embed<textarea rows={3} value={f.maps_embed_url || ''} onChange={set('maps_embed_url')} placeholder="Paste the iframe code from Google Maps > Share > Embed a map (or just its src URL)" /></label>
        </section>

        <section className="panel">
          <h2>Social links</h2>
          <div className="form-row">{text('instagram', 'Instagram URL', { placeholder: 'https://instagram.com/…' })}{text('facebook', 'Facebook URL')}</div>
          <div className="form-row">{text('tiktok', 'TikTok URL')}{text('whatsapp', 'WhatsApp number', { placeholder: '213555123456' })}</div>
        </section>

        <section className="panel">
          <h2>Inventory</h2>
          <label className="field narrow-field">Low-stock threshold<input type="number" min="0" value={f.low_stock_threshold} onChange={set('low_stock_threshold')} /></label>
        </section>

        <section className="panel">
          <h2>Cloudinary</h2>
          <p className="muted small">These credentials are stored on the server. The API secret is used only to sign image uploads.</p>
          <div className="form-row">
            {text('cloudinary_cloud_name', 'Cloud name', { autoComplete: 'off' })}
            {text('cloudinary_api_key', 'API key', { autoComplete: 'off' })}
          </div>
          <label className="field">API secret<input type="password" value={f.cloudinary_api_secret || ''} onChange={set('cloudinary_api_secret')} autoComplete="new-password" /></label>
        </section>

        <section className="panel">
          <h2>EmailJS</h2>
          <p className="muted small">Add the IDs and public key from your EmailJS dashboard.</p>
          <div className="form-row">
            {text('emailjs_service_id', 'Service ID', { autoComplete: 'off' })}
            {text('emailjs_public_key', 'Public key', { autoComplete: 'off' })}
          </div>
          <div className="form-row">
            {text('emailjs_template_id', 'Order confirmation template ID', { autoComplete: 'off' })}
            {text('emailjs_contact_template_id', 'Contact form template ID', { autoComplete: 'off' })}
          </div>
        </section>

        <div><button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </>
  );
}
