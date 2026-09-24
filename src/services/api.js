import { ensureLocalDb } from './localStore';

async function request(path, body) {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const productShape = (product) => {
  const state = ensureLocalDb();
  const category = state.categories.find((c) => c.id === product.category_id) || null;
  const variants = state.product_variants.filter((v) => v.product_id === product.id).sort((a, b) => (a.size || '').localeCompare(b.size || ''));
  const images = state.product_images.filter((i) => i.product_id === product.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return {
    ...product,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    variants,
    images,
  };
};

export const fetchSettings = async () => {
  const db = ensureLocalDb();
  return db.store_settings[0] || {};
};

export const fetchProducts = async () => {
  const db = ensureLocalDb();
  return [...db.products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(productShape);
};

export const fetchCategories = async () => {
  const db = ensureLocalDb();
  return [...db.categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).sort((a, b) => a.name.localeCompare(b.name));
};

export const fetchLandingSections = async () => {
  const db = ensureLocalDb();
  return [...db.landing_sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
};

export const fetchSliders = async (placement) => {
  const db = ensureLocalDb();
  return db.sliders.filter((slide) => slide.placement === placement).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
};

export const fetchShippingRates = async () => {
  const db = ensureLocalDb();
  return [...db.shipping_rates].sort((a, b) => a.name.localeCompare(b.name));
};

export async function fetchDrops() {
  const db = ensureLocalDb();
  return db.drops
    .filter((drop) => drop.is_enabled && drop.status !== 'ended')
    .map((drop) => ({
      ...drop,
      drop_products: db.drop_products.filter((row) => row.drop_id === drop.id).map((row) => row.product_id),
    }))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

let offsetPromise;
export function getServerOffset() {
  if (!offsetPromise) offsetPromise = Promise.resolve(0);
  return offsetPromise;
}

export async function validateCoupon(code, items) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { valid: false, message: 'Enter a coupon code' };
  return request('/api/coupons/validate', { code: clean, items });
}

export async function placeOrder(customer, items, couponCode) {
  return request('/api/orders', { customer, items, couponCode });
}
