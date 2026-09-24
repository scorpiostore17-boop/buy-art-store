import { Link } from 'react-router-dom';
import { FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, TikTokIcon, WhatsAppIcon } from './Icons';
import { useSettings } from '../context/SettingsContext';

export const whatsappLink = (n) => (n ? `https://wa.me/${String(n).replace(/[^\d]/g, '')}` : '');

export default function Footer() {
  const { settings: s, logoSrc } = useSettings();
  const socials = [
    [s.instagram, InstagramIcon, 'Instagram'],
    [s.facebook, FacebookIcon, 'Facebook'],
    [s.tiktok, TikTokIcon, 'TikTok'],
    [whatsappLink(s.whatsapp), WhatsAppIcon, 'WhatsApp'],
  ].filter(([href]) => href);

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <img className="footer-logo" src={logoSrc} alt={s.store_name} width="110" height="108" loading="lazy" />
          {socials.length > 0 && (
            <div className="socials">
              {socials.map(([href, Icon, label]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}><Icon /></a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4>Explore</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/shop">Shop</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul className="footer-contact">
            {s.phone && <li><PhoneIcon width={16} height={16} /> <a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a></li>}
            {s.email && <li><MailIcon width={16} height={16} /> <a href={`mailto:${s.email}`}>{s.email}</a></li>}
            {s.working_hours && <li className="pre">{s.working_hours}</li>}
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} {s.store_name}. All rights reserved.</div>
    </footer>
  );
}
