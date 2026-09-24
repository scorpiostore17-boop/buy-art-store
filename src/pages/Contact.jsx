import { useState } from 'react';
import { ClockIcon, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, TikTokIcon, WhatsAppIcon } from '../components/Icons';
import { whatsappLink } from '../components/Footer';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { sendContactMessage } from '../services/emailjs';
import { isEmail, isPhone } from '../utils/validation';

/** Accepts either a full <iframe> snippet or a bare embed URL; only google.com/maps/embed is allowed. */
function mapSrc(settings) {
  const raw = (settings.maps_embed_url || '').trim();
  if (raw) {
    const m = /src=["']([^"']+)["']/.exec(raw);
    const url = (m ? m[1] : raw).trim();
    if (/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(url)) return url;
  }
  const q = [settings.address, settings.municipality, settings.wilaya, 'Algeria'].filter(Boolean).join(', ');
  return settings.address ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed` : '';
}

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', website: '' };

export default function Contact() {
  const { settings: s } = useSettings();
  const isContactConfigured = Boolean(s.emailjs_service_id && s.emailjs_contact_template_id && s.emailjs_public_key);
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const src = mapSrc(s);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.website) return; // honeypot
    const err = {};
    if (form.name.trim().length < 2) err.name = 'Please enter your name';
    if (!isEmail(form.email)) err.email = 'Enter a valid email address';
    if (form.phone && !isPhone(form.phone)) err.phone = 'Enter a valid phone number';
    if (form.message.trim().length < 10) err.message = 'Message must be at least 10 characters';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      await sendContactMessage(form, s);
      setSent(true);
      setForm(EMPTY);
      toast.success('Message sent. We will get back to you soon.');
    } catch (ex) {
      toast.error(ex.message || 'Could not send your message. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    [PinIcon, 'Address', s.address],
    [PinIcon, 'Neighborhood', s.neighborhood_note],
    [PinIcon, 'Municipality', s.municipality],
    [PinIcon, 'Wilaya', s.wilaya],
    [PhoneIcon, 'Phone', s.phone && <a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a>],
    [MailIcon, 'Email', s.email && <a href={`mailto:${s.email}`}>{s.email}</a>],
    [ClockIcon, 'Working hours', s.working_hours && <span className="pre">{s.working_hours}</span>],
  ].filter(([, , v]) => v);

  const socials = [
    [s.instagram, InstagramIcon, 'Instagram'],
    [s.facebook, FacebookIcon, 'Facebook'],
    [s.tiktok, TikTokIcon, 'TikTok'],
    [whatsappLink(s.whatsapp), WhatsAppIcon, 'WhatsApp'],
  ].filter(([href]) => href);

  return (
    <div className="container contact">
      <div className="shop-head">
        <h1>Contact us</h1>
        <p className="muted">Questions about an order or a piece? Send us a message or visit the store.</p>
      </div>

      <div className="contact-grid">
        <div className="contact-info card-box">
          {rows.length === 0 && <p className="muted">Contact details will appear here once they are added in the admin panel.</p>}
          <ul>
            {rows.map(([Icon, label, value]) => (
              <li key={label}><Icon width={18} height={18} /><div><small>{label}</small><div>{value}</div></div></li>
            ))}
          </ul>
          {socials.length > 0 && (
            <div className="social-buttons">
              {socials.map(([href, Icon, label]) => (
                <a key={label} className="btn btn-outline btn-sm" href={href} target="_blank" rel="noreferrer"><Icon width={16} height={16} /> {label}</a>
              ))}
            </div>
          )}
        </div>

        <form className="contact-form card-box" onSubmit={submit} noValidate>
          <h2>Send a message</h2>
          {!isContactConfigured && <p className="notice">The contact form isn't connected yet (EmailJS settings missing).</p>}
          {sent && <p className="notice ok" role="status">Thank you! Your message was sent.</p>}
          <div className="form-row">
            <label className="field">Name *<input value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} />{errors.name && <span className="field-error">{errors.name}</span>}</label>
            <label className="field">Email *<input type="email" value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} />{errors.email && <span className="field-error">{errors.email}</span>}</label>
          </div>
          <div className="form-row">
            <label className="field">Phone<input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={!!errors.phone} />{errors.phone && <span className="field-error">{errors.phone}</span>}</label>
            <label className="field">Subject<input value={form.subject} onChange={set('subject')} /></label>
          </div>
          <label className="field">Message *<textarea rows={5} value={form.message} onChange={set('message')} aria-invalid={!!errors.message} />{errors.message && <span className="field-error">{errors.message}</span>}</label>
          <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} name="website" />
          <button className="btn btn-primary btn-lg" disabled={busy || !isContactConfigured}>{busy ? 'Sending…' : 'Send message'}</button>
        </form>
      </div>

      {src && (
        <div className="map">
          <iframe title="Store location" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      )}
    </div>
  );
}
