export const formatMoney = (n, currency = 'DA') =>
  `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} ${currency}`;

export const formatDate = (iso, opts = { dateStyle: 'medium', timeStyle: 'short' }) =>
  iso ? new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso)) : '';

export const slugify = (s = '') =>
  s
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** ISO string -> value for <input type="datetime-local"> in the user's timezone */
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
