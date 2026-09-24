import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import initSqlJs from 'sql.js';
import { v2 as cloudinary } from 'cloudinary';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(ROOT, 'storage', 'store.sqlite'));
const SESSION_SECRET = process.env.SESSION_SECRET || 'development-only-change-before-deploy';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@local').trim().toLowerCase();
const isProduction = process.env.NODE_ENV === 'production';
const developmentOrigins = new Set(
  (process.env.DEV_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (isProduction && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12)) {
  throw new Error('Set ADMIN_PASSWORD to a unique password with at least 12 characters.');
}
if (isProduction && !process.env.SESSION_SECRET) throw new Error('Set SESSION_SECRET before deploying.');

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const seedState = () => ({
  store_settings: [{ id: 1, store_name: 'Buy Art', logo_url: '', primary_color: '#013294', secondary_color: '#F2140F', accent_color: '#F9E6C7', background_color: '#FFFFFF', text_color: '#0A1330', phone: '', email: '', whatsapp: '', instagram: '', facebook: '', tiktok: '', address: '', neighborhood_note: '', municipality: '', wilaya: '', maps_embed_url: '', working_hours: '', currency: 'DA', low_stock_threshold: 5, emailjs_service_id: '', emailjs_template_id: '', emailjs_public_key: '', emailjs_contact_template_id: '', cloudinary_cloud_name: '', cloudinary_api_key: '', cloudinary_api_secret: '', updated_at: now() }],
  categories: [], products: [], product_variants: [], product_images: [], landing_sections: [], sliders: [],
  shipping_rates: [], coupons: [], coupon_products: [], coupon_categories: [], orders: [], order_items: [], drops: [], drop_products: [],
});

const SQL = await initSqlJs({ locateFile: (file) => path.join(ROOT, 'node_modules', 'sql.js', 'dist', file) });
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
let db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
db.run('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)');
db.run('CREATE TABLE IF NOT EXISTS secrets (name TEXT PRIMARY KEY, value TEXT NOT NULL)');
const existing = db.exec('SELECT data FROM app_state WHERE id = 1');
let state;
try { state = existing[0]?.values?.[0]?.[0] ? { ...seedState(), ...JSON.parse(existing[0].values[0][0]) } : seedState(); }
catch { state = seedState(); }
state.store_settings ||= seedState().store_settings;
state.store_settings[0] = { ...seedState().store_settings[0], ...state.store_settings[0] };

function persist() {
  db.run('INSERT OR REPLACE INTO app_state (id, data) VALUES (1, ?)', [JSON.stringify(state)]);
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, Buffer.from(db.export()));
  fs.renameSync(tempPath, DB_PATH);
}

function makePasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function checkPassword(password, stored) {
  if (!stored) return false;
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
function readSecret(name) {
  const stmt = db.prepare('SELECT value FROM secrets WHERE name = ?');
  stmt.bind([name]);
  const value = stmt.step() ? stmt.getAsObject().value : null;
  stmt.free();
  return value;
}
function writeSecret(name, value) {
  db.run('INSERT OR REPLACE INTO secrets (name, value) VALUES (?, ?)', [name, value]);
}

for (const key of ['cloudinary_api_key', 'cloudinary_api_secret']) {
  const legacyValue = state.store_settings[0][key];
  if (legacyValue && !readSecret(key)) writeSecret(key, legacyValue);
  delete state.store_settings[0][key];
}

if (!readSecret('admin_password_hash')) {
  writeSecret('admin_password_hash', makePasswordHash(process.env.ADMIN_PASSWORD || 'admin123'));
  writeSecret('admin_email', ADMIN_EMAIL);
  persist();
} else if (!readSecret('admin_email')) {
  writeSecret('admin_email', ADMIN_EMAIL);
  persist();
}
persist();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.origin) {
    const expected = `${req.protocol}://${req.get('host')}`;
    const isAllowedDevelopmentOrigin = !isProduction && developmentOrigins.has(req.headers.origin);
    if (req.headers.origin !== expected && !isAllowedDevelopmentOrigin) {
      return res.status(403).json({ error: 'Request origin is not allowed' });
    }
  }
  next();
});

const loginAttempts = new Map();
function rateLimitLogin(req, res, next) {
  const key = req.ip;
  const record = loginAttempts.get(key) || { count: 0, start: Date.now() };
  if (Date.now() - record.start > 15 * 60 * 1000) { record.count = 0; record.start = Date.now(); }
  if (record.count >= 12) return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  record.count += 1;
  loginAttempts.set(key, record);
  next();
}
function signSession() {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email: readSecret('admin_email'), exp: expires })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function requireAdmin(req, res, next) {
  const token = (req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith('buyart_session='))?.slice('buyart_session='.length);
  if (!token) return res.status(401).json({ error: 'Sign in required' });
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return res.status(401).json({ error: 'Invalid session' });
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest();
  let provided;
  try { provided = Buffer.from(signature, 'base64url'); } catch { return res.status(401).json({ error: 'Invalid session' }); }
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return res.status(401).json({ error: 'Invalid session' });
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (session.exp < Date.now() || session.email !== readSecret('admin_email')) return res.status(401).json({ error: 'Session expired' });
    req.admin = session;
    next();
  } catch { res.status(401).json({ error: 'Invalid session' }); }
}

const publicSettings = () => {
  const { cloudinary_api_key, cloudinary_api_secret, ...settings } = state.store_settings[0] || {};
  return settings;
};
const publicState = () => ({
  store_settings: [publicSettings()],
  categories: state.categories,
  products: state.products,
  product_variants: state.product_variants,
  product_images: state.product_images,
  landing_sections: state.landing_sections,
  sliders: state.sliders,
  shipping_rates: state.shipping_rates,
  coupons: state.coupons,
  coupon_products: state.coupon_products || [],
  coupon_categories: state.coupon_categories || [],
  drops: state.drops,
  drop_products: state.drop_products,
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/storefront', (_req, res) => res.json(publicState()));
app.get('/api/integrations/emailjs', (_req, res) => {
  const s = state.store_settings[0] || {};
  res.json({ service_id: s.emailjs_service_id || '', template_id: s.emailjs_template_id || '', contact_template_id: s.emailjs_contact_template_id || '', public_key: s.emailjs_public_key || '' });
});

app.post('/api/admin/login', rateLimitLogin, (req, res) => {
  const password = String(req.body?.password || '');
  if (!checkPassword(password, readSecret('admin_password_hash'))) return res.status(401).json({ error: 'Incorrect admin password' });
  loginAttempts.delete(req.ip);
  res.cookie('buyart_session', signSession(), { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: { id: 'admin', email: readSecret('admin_email') } });
});
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ user: { id: 'admin', email: req.admin.email } }));
app.post('/api/admin/logout', requireAdmin, (_req, res) => { res.clearCookie('buyart_session', { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/' }); res.json({ ok: true }); });
app.post('/api/admin/password', requireAdmin, (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 12) return res.status(400).json({ error: 'Use a password with at least 12 characters.' });
  writeSecret('admin_password_hash', makePasswordHash(password));
  persist();
  res.json({ ok: true });
});
app.get('/api/admin/state', requireAdmin, (_req, res) => res.json({ ...state, store_settings: [{ ...state.store_settings[0], cloudinary_api_key: readSecret('cloudinary_api_key') || '', cloudinary_api_secret: readSecret('cloudinary_api_secret') || '' }], admin_email: readSecret('admin_email') }));
app.put('/api/admin/state', requireAdmin, (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || !Array.isArray(incoming.products) || !Array.isArray(incoming.orders)) return res.status(400).json({ error: 'Invalid store data' });
  const settings = { ...(incoming.store_settings?.[0] || {}) };
  for (const key of ['cloudinary_api_key', 'cloudinary_api_secret']) {
    if (Object.hasOwn(settings, key)) {
      if (settings[key]) writeSecret(key, String(settings[key]));
      else db.run('DELETE FROM secrets WHERE name = ?', [key]);
      delete settings[key];
    }
  }
  state = { ...seedState(), ...incoming, store_settings: [{ ...seedState().store_settings[0], ...settings }] };
  delete state.admin_password;
  delete state.admin_email;
  persist();
  res.json({ ok: true });
});
app.post('/api/admin/import-browser', requireAdmin, async (req, res, next) => {
  try {
    const database = String(req.body?.database || '');
    const localImages = req.body?.images && typeof req.body.images === 'object' ? req.body.images : {};
    let imported;
    if (database.startsWith('U1FMaXRl')) {
      const oldDb = new SQL.Database(Buffer.from(database, 'base64'));
      const rows = oldDb.exec('SELECT data FROM app_state WHERE id = 1');
      imported = rows[0]?.values?.[0]?.[0] ? JSON.parse(rows[0].values[0][0]) : null;
      oldDb.close();
    } else imported = JSON.parse(database);
    if (!imported || !Array.isArray(imported.products) || !Array.isArray(imported.orders)) return res.status(400).json({ error: 'The selected browser backup is not a recognized store database.' });

    const keys = new Map();
    const findImages = (value) => {
      if (Array.isArray(value)) { value.forEach(findImages); return; }
      if (!value || typeof value !== 'object') {
        const ref = typeof value === 'string' && value.startsWith('local-image:') ? value.slice('local-image:'.length) : null;
        const data = ref ? localImages[ref]?.url : typeof value === 'string' && value.startsWith('data:image/') ? value : null;
        if (data) keys.set(value, data);
        return;
      }
      Object.values(value).forEach(findImages);
    };
    findImages(imported);

    const currentSettings = { ...(state.store_settings[0] || {}), cloudinary_api_key: readSecret('cloudinary_api_key') || '', cloudinary_api_secret: readSecret('cloudinary_api_secret') || '' };
    const importedSettings = imported.store_settings?.[0] || {};
    let importedState = { ...seedState(), ...imported, store_settings: [{ ...seedState().store_settings[0], ...importedSettings }] };
    delete importedState.admin_password;
    importedState.store_settings[0].cloudinary_cloud_name = currentSettings.cloudinary_cloud_name || '';
    delete importedState.store_settings[0].cloudinary_api_key;
    delete importedState.store_settings[0].cloudinary_api_secret;
    importedState.store_settings[0].emailjs_service_id = currentSettings.emailjs_service_id || '';
    importedState.store_settings[0].emailjs_template_id = currentSettings.emailjs_template_id || '';
    importedState.store_settings[0].emailjs_contact_template_id = currentSettings.emailjs_contact_template_id || '';
    importedState.store_settings[0].emailjs_public_key = currentSettings.emailjs_public_key || '';

    const uploaded = new Map();
    const cloud = importedState.store_settings[0];
    const cloudApiKey = readSecret('cloudinary_api_key');
    const cloudApiSecret = readSecret('cloudinary_api_secret');
    if (keys.size && cloud.cloudinary_cloud_name && cloudApiKey && cloudApiSecret) {
      cloudinary.config({ cloud_name: cloud.cloudinary_cloud_name, api_key: cloudApiKey, api_secret: cloudApiSecret, secure: true });
      const entries = [...keys.entries()];
      for (let i = 0; i < entries.length; i += 3) {
        const group = await Promise.all(entries.slice(i, i + 3).map(async ([oldRef, data]) => {
          const result = await cloudinary.uploader.upload(data, { folder: 'buy-art/imported' });
          return [oldRef, result.secure_url];
        }));
        group.forEach(([oldRef, url]) => uploaded.set(oldRef, url));
      }
    }
    const replaceImages = (value) => {
      if (Array.isArray(value)) return value.map(replaceImages);
      if (!value || typeof value !== 'object') {
        if (uploaded.has(value)) return uploaded.get(value);
        if (typeof value === 'string' && value.startsWith('local-image:')) return localImages[value.slice('local-image:'.length)]?.url || '';
        return value;
      }
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceImages(child)]));
    };
    state = replaceImages(importedState);
    persist();
    res.json({ ok: true, imported_products: state.products.length, imported_orders: state.orders.length, images_uploaded: uploaded.size, images_kept_local: keys.size - uploaded.size });
  } catch (error) { next(error); }
});

app.post('/api/coupons/validate', (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const coupon = (state.coupons || []).find((entry) => entry.code?.toUpperCase() === code && entry.is_active);
  if (!coupon) return res.json({ valid: false, message: 'Coupon code not found' });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return res.json({ valid: false, message: 'This coupon has expired' });
  if (coupon.usage_limit != null && Number(coupon.used_count || 0) >= Number(coupon.usage_limit)) return res.json({ valid: false, message: 'This coupon has reached its usage limit' });
  let subtotal = 0;
  for (const item of items) {
    const variant = state.product_variants.find((entry) => entry.id === item.variantId);
    const product = variant && state.products.find((entry) => entry.id === variant.product_id && entry.is_visible);
    if (!product) return res.json({ valid: false, message: 'A product in your cart is no longer available' });
    subtotal += Number(product.discount_price || product.price || 0) * Math.max(1, Number(item.quantity || 1));
  }
  if (subtotal < Number(coupon.min_order || 0)) return res.json({ valid: false, message: `Minimum order for this coupon is ${coupon.min_order}` });
  const discount = coupon.discount_type === 'percentage' ? subtotal * Number(coupon.discount_value || 0) / 100 : Math.min(Number(coupon.discount_value || 0), subtotal);
  res.json({ valid: true, code: coupon.code, discount, message: 'Coupon applied' });
});

app.post('/api/orders', (req, res) => {
  const customer = req.body?.customer || {};
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (customer.customer_name?.trim().length < 3 || customer.phone?.trim().length < 8 || customer.address?.trim().length < 5 || !customer.wilaya || !customer.municipality || !items.length) return res.status(400).json({ error: 'Please check the delivery details and cart.' });
  const ordered = [];
  let subtotal = 0;
  for (const item of items) {
    const quantity = Math.floor(Number(item.quantity));
    const variant = state.product_variants.find((entry) => entry.id === item.variantId);
    const product = variant && state.products.find((entry) => entry.id === variant.product_id && entry.is_visible);
    if (!product || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'An item in your cart is no longer available.' });
    if (Number(variant.stock) < quantity) return res.status(409).json({ error: `Only ${variant.stock} available for ${product.name}.` });
    const price = Number(product.discount_price || product.price || 0);
    ordered.push({ item, variant, product, quantity, price });
    subtotal += price * quantity;
  }
  const code = String(req.body?.couponCode || '').trim().toUpperCase();
  const coupon = code ? state.coupons.find((entry) => entry.code?.toUpperCase() === code && entry.is_active) : null;
  if (code && !coupon) return res.status(400).json({ error: 'Coupon code is no longer valid.' });
  if (coupon?.expires_at && new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'This coupon has expired.' });
  if (coupon?.usage_limit != null && Number(coupon.used_count || 0) >= Number(coupon.usage_limit)) return res.status(400).json({ error: 'This coupon has reached its usage limit.' });
  if (coupon && subtotal < Number(coupon.min_order || 0)) return res.status(400).json({ error: `Minimum order for this coupon is ${coupon.min_order}.` });
  const discount = !coupon ? 0 : coupon.discount_type === 'percentage' ? subtotal * Number(coupon.discount_value || 0) / 100 : Math.min(Number(coupon.discount_value || 0), subtotal);
  const rate = state.shipping_rates.find((entry) => entry.name === customer.wilaya && entry.is_active);
  const shipping = Number(rate?.price || 0);
  const orderId = id('order');
  const order = { id: orderId, order_number: String(Date.now()).slice(-6), ...customer, subtotal, discount, shipping, total: Math.max(subtotal - discount + shipping, 0), coupon_code: coupon?.code || null, status: 'pending', created_at: now() };
  state.orders.push(order);
  for (const { item, variant, product, quantity, price } of ordered) {
    variant.stock = Math.max(0, Number(variant.stock) - quantity);
    state.order_items.push({ id: id('order-item'), order_id: orderId, product_id: product.id, variant_id: variant.id, product_name: product.name, size: variant.size || 'One size', color_name: variant.color_name || '', quantity, unit_price: price, created_at: now() });
  }
  if (coupon) coupon.used_count = Number(coupon.used_count || 0) + 1;
  persist();
  res.status(201).json({ ...order, items: ordered.map(({ item, variant, product, quantity, price }) => ({ variant_id: variant.id, qty: quantity, name: product.name, size: variant.size, color_name: variant.color_name, unit_price: price })) });
});

app.get('/api/admin/cloudinary/signature', requireAdmin, (req, res) => {
  const settings = state.store_settings[0] || {};
  const apiKey = readSecret('cloudinary_api_key');
  const apiSecret = readSecret('cloudinary_api_secret');
  if (!settings.cloudinary_cloud_name || !apiKey || !apiSecret) return res.status(400).json({ error: 'Add Cloudinary credentials in Admin → Store settings first.' });
  const folder = `buy-art/${String(req.query.folder || 'store').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80)}`;
  const timestamp = Math.floor(Date.now() / 1000);
  cloudinary.config({ cloud_name: settings.cloudinary_cloud_name, api_key: apiKey, api_secret: apiSecret, secure: true });
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);
  res.json({ cloud_name: settings.cloudinary_cloud_name, api_key: apiKey, folder, timestamp, signature });
});

app.use(express.static(path.join(ROOT, 'dist'), {
  maxAge: isProduction ? '1y' : 0,
  immutable: isProduction,
  setHeaders(res, filePath) { if (filePath.endsWith(`${path.sep}index.html`)) res.setHeader('Cache-Control', 'no-cache'); },
}));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(ROOT, 'dist', 'index.html'));
});
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Unexpected server error' }); });

app.listen(PORT, '0.0.0.0', () => console.log(`Buy Art server listening on 0.0.0.0:${PORT}; SQLite: ${DB_PATH}`));
