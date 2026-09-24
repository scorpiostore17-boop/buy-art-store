const STORAGE_KEY = 'buy-art-local-db-v1';
const IMAGE_KEY = 'buy-art-images-v1';
let cachedState = null;
let imageCache = null;
let adminLoaded = false;

const emptyState = () => ({
  store_settings: [{}], categories: [], products: [], product_variants: [], product_images: [],
  landing_sections: [], sliders: [], shipping_rates: [], coupons: [], coupon_products: [], coupon_categories: [],
  orders: [], order_items: [], drops: [], drop_products: [],
});

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export async function initializeLocalDb() {
  cachedState = { ...emptyState(), ...await request('/api/storefront') };
}

export async function loadAdminDb() {
  cachedState = { ...emptyState(), ...await request('/api/admin/state') };
  adminLoaded = true;
  return cachedState;
}

export const ensureLocalDb = () => cachedState || emptyState();

export async function saveLocalDb(state) {
  if (!adminLoaded) throw new Error('Admin sign in is required to save store data.');
  const saved = await request('/api/admin/state', { method: 'PUT', body: JSON.stringify(state) });
  cachedState = state;
  return saved;
}

export function getLocalImages() {
  if (imageCache) return imageCache;
  try { imageCache = JSON.parse(localStorage.getItem(IMAGE_KEY) || '{}'); }
  catch { imageCache = {}; }
  return imageCache;
}

export function saveLocalImages(images) {
  imageCache = images;
  localStorage.setItem(IMAGE_KEY, JSON.stringify(images));
}

export const LOCAL_DB_KEY = STORAGE_KEY;
export const LOCAL_IMAGE_KEY = IMAGE_KEY;
export function uid(prefix = 'id') { return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`; }
export function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
