import { Link } from 'react-router-dom';

/** Button-styled link that handles internal routes and external URLs. */
export default function CtaLink({ href, className = 'btn btn-primary', children }) {
  if (!href || !children) return null;
  return /^https?:\/\//.test(href)
    ? <a className={className} href={href} target="_blank" rel="noreferrer">{children}</a>
    : <Link className={className} to={href}>{children}</Link>;
}
