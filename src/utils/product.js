const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];

export const finalPrice = (p) =>
  p.discount_price && Number(p.discount_price) < Number(p.price) ? Number(p.discount_price) : Number(p.price);
export const hasDiscount = (p) => finalPrice(p) < Number(p.price);
export const discountPercent = (p) => (hasDiscount(p) ? Math.round((1 - finalPrice(p) / Number(p.price)) * 100) : 0);
export const totalStock = (p) => (p.variants || []).reduce((s, v) => s + Math.max(v.stock, 0), 0);
export const isInStock = (p) => totalStock(p) > 0;

export function sortSizes(list) {
  return [...list].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

export const sizesOf = (p) => sortSizes([...new Set((p.variants || []).map((v) => v.size))]);

export function colorsOf(p) {
  const seen = new Map();
  (p.variants || []).forEach((v) => {
    if (v.color_name && !seen.has(v.color_name)) seen.set(v.color_name, { name: v.color_name, hex: v.color_hex || '#cccccc' });
  });
  return [...seen.values()];
}

const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

/** Images for a color; falls back to the general images, then to anything. */
export function imagesFor(p, color = '') {
  const imgs = [...(p.images || [])].sort(bySort);
  if (color) {
    const own = imgs.filter((i) => i.color_name === color);
    if (own.length) return own;
  }
  const general = imgs.filter((i) => !i.color_name);
  return general.length ? general : imgs;
}
export const mainImage = (p, color = '') => imagesFor(p, color)[0]?.url || '';

export const findVariant = (p, size, color) =>
  (p.variants || []).find((v) => v.size === size && (v.color_name || '') === (color || ''));
