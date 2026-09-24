import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const { logoSrc, settings } = useSettings();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) { setError('Enter your password'); return; }
    setBusy(true);
    setError('');
    try {
      await signIn(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup">
      <form className="setup-card login" onSubmit={submit} noValidate>
        <img src={logoSrc} alt={settings.store_name} width="120" />
        <h1>Admin sign in</h1>
        <label className="field">Admin password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus /></label>
        {error && <p className="notice error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="link-btn">← Back to the store</Link>
      </form>
    </div>
  );
}
