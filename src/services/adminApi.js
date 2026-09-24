import { ensureLocalDb, saveLocalDb, uid } from './localStore';

import { loadAdminDb } from './localStore';

export const getAdminSettings = async () => ensureLocalDb().store_settings?.[0] || {};

export function downloadBrowserDatabaseBackup() {
  const database = localStorage.getItem('buy-art-local-db-v1');
  if (!database) throw new Error('No previous local database was found in this browser.');
  let images = {};
  try { images = JSON.parse(localStorage.getItem('buy-art-images-v1') || '{}'); } catch { /* ignore damaged image cache */ }
  const blob = new Blob([JSON.stringify({ database, images })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'buy-art-browser-backup.json';
  link.click();
  URL.revokeObjectURL(url);
}

export async function importBrowserDatabase(backup) {
  const database = backup?.database || localStorage.getItem('buy-art-local-db-v1');
  if (!database) throw new Error('No previous local database was found in this browser.');
  let images = backup?.images || {};
  if (!backup) {
    try { images = JSON.parse(localStorage.getItem('buy-art-images-v1') || '{}'); } catch { /* ignore damaged image cache */ }
  }
  const response = await fetch('/api/admin/import-browser', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ database, images }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not import the browser database');
  await loadAdminDb();
  return result;
}

export const adminStats = async () => {
  const db = ensureLocalDb();
  const orders = Array.isArray(db.orders) ? db.orders : [];
  const products = Array.isArray(db.products) ? db.products : [];
  const variants = Array.isArray(db.product_variants) ? db.product_variants : [];
  const orderItems = Array.isArray(db.order_items) ? db.order_items : [];
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const byStatus = Object.fromEntries(['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'].map((status) => [status, 0]));
  for (const order of orders) if (Object.hasOwn(byStatus, order.status)) byStatus[order.status] += 1;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 13);
  const daily = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(since);
    date.setDate(since.getDate() + index);
    return { day: date.toISOString().slice(0, 10), revenue: 0, orders: 0 };
  });
  const dailyByDate = new Map(daily.map((day) => [day.day, day]));
  const validOrders = orders.filter((order) => order.status !== 'cancelled');
  for (const order of validOrders) {
    const day = dailyByDate.get(String(order.created_at || '').slice(0, 10));
    if (day) { day.revenue += Number(order.total || 0); day.orders += 1; }
  }

  const salesByProduct = new Map();
  for (const item of orderItems) {
    const order = ordersById.get(item.order_id);
    if (order?.status === 'cancelled') continue;
    const name = item.product_name || products.find((product) => product.id === item.product_id)?.name || 'Product';
    const sale = salesByProduct.get(name) || { name, qty: 0, revenue: 0 };
    const qty = Number(item.quantity || item.qty || 0);
    sale.qty += qty;
    sale.revenue += qty * Number(item.unit_price || item.price || 0);
    salesByProduct.set(name, sale);
  }
  const lowStockThreshold = Number(db.store_settings?.[0]?.low_stock_threshold ?? 5);
  const lowStockItems = variants
    .filter((variant) => Number(variant.stock || 0) <= lowStockThreshold)
    .map((variant) => ({ ...variant, name: products.find((product) => product.id === variant.product_id)?.name || 'Product' }));

  return {
    products: products.length,
    orders: orders.length,
    revenue: validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    units_sold: orderItems.reduce((sum, item) => {
      const order = ordersById.get(item.order_id);
      return sum + (order?.status === 'cancelled' ? 0 : Number(item.quantity || item.qty || 0));
    }, 0),
    low_stock: lowStockItems.length,
    low_stock_items: lowStockItems,
    daily,
    by_status: byStatus,
    top_products: [...salesByProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
  };
};

export async function listOrders({ page = 0, pageSize = 15, status = '', search = '' } = {}) {
  const db = ensureLocalDb();
  let rows = [...db.orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (status) rows = rows.filter((row) => row.status === status);
  const term = String(search || '').trim().replace(/[%,()*]/g, '');
  if (term) {
    rows = rows.filter((row) => {
      const haystack = `${row.customer_name || ''} ${row.phone || ''} ${row.wilaya || ''} ${row.order_number || ''}`.toLowerCase();
      return haystack.includes(term.toLowerCase());
    });
  }
  const start = page * pageSize;
  const end = start + pageSize;
  return { rows: rows.slice(start, end), count: rows.length };
}

export const listOrderItems = async (orderId) => {
  const db = ensureLocalDb();
  return db.order_items.filter((item) => item.order_id === orderId).sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
};

export const updateOrderStatus = async (id, status) => {
  const db = ensureLocalDb();
  db.orders = db.orders.map((order) => (order.id === id ? { ...order, status } : order));
  await saveLocalDb(db);
  return true;
};

export const recentOrders = async (n = 8) => {
  const db = ensureLocalDb();
  return [...db.orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, n).map((order) => ({ id: order.id, order_number: order.order_number, customer_name: order.customer_name, total: order.total, status: order.status, created_at: order.created_at }));
};

export const listProductsAdmin = async () => {
  const db = ensureLocalDb();
  return [...db.products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((product) => ({
    ...product,
    category: db.categories.find((c) => c.id === product.category_id) || null,
    variants: db.product_variants.filter((v) => v.product_id === product.id),
    images: db.product_images.filter((image) => image.product_id === product.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  }));
};

export const listProductOptions = async () => {
  const db = ensureLocalDb();
  return [...db.products].sort((a, b) => a.name.localeCompare(b.name)).map((product) => ({ id: product.id, name: product.name, is_featured: product.is_featured }));
};

export const setProductFlag = async (id, patch) => {
  const db = ensureLocalDb();
  db.products = db.products.map((product) => (product.id === id ? { ...product, ...patch } : product));
  await saveLocalDb(db);
  return true;
};

export async function saveProduct(product, variants, images) {
  const db = ensureLocalDb();
  const payload = {
    name: product.name.trim(),
    description: product.description?.trim() || null,
    details: product.details?.trim() || null,
    price: Number(product.price),
    discount_price: product.discount_price === '' || product.discount_price == null ? null : Number(product.discount_price),
    category_id: product.category_id || null,
    is_featured: !!product.is_featured,
    is_visible: !!product.is_visible,
    updated_at: new Date().toISOString(),
  };

  let id = product.id || uid('product');
  if (product.id) {
    db.products = db.products.map((entry) => (entry.id === product.id ? { ...entry, ...payload } : entry));
  } else {
    db.products.push({ ...payload, id, created_at: new Date().toISOString() });
  }

  const keep = new Set(variants.filter((v) => v.id).map((v) => v.id));
  db.product_variants = db.product_variants.filter((variant) => variant.product_id !== id || keep.has(variant.id));
  for (const v of variants) {
    const row = {
      id: v.id || uid('variant'),
      product_id: id,
      size: (v.size || 'One size').trim() || 'One size',
      color_name: (v.color_name || '').trim(),
      color_hex: (v.color_name || '').trim() ? (v.color_hex || '#cccccc') : null,
      stock: Math.max(0, parseInt(v.stock, 10) || 0),
    };
    if (!db.product_variants.some((variant) => variant.id === row.id)) db.product_variants.push(row);
    else db.product_variants = db.product_variants.map((variant) => (variant.id === row.id ? { ...variant, ...row } : variant));
  }

  db.product_images = db.product_images.filter((image) => image.product_id !== id);
  for (let i = 0; i < images.length; i += 1) {
    const image = images[i];
    db.product_images.push({
      id: image.id || uid('image'),
      product_id: id,
      url: image.url,
      public_id: image.public_id || null,
      color_name: image.color_name || '',
      sort_order: i,
    });
  }

  await saveLocalDb(db);
  return id;
}

export const deleteProduct = async (id) => {
  const db = ensureLocalDb();
  db.products = db.products.filter((product) => product.id !== id);
  db.product_variants = db.product_variants.filter((variant) => variant.product_id !== id);
  db.product_images = db.product_images.filter((image) => image.product_id !== id);
  await saveLocalDb(db);
  return true;
};

export const listCategoriesAdmin = async () => {
  const db = ensureLocalDb();
  return [...db.categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).sort((a, b) => a.name.localeCompare(b.name));
};

export async function saveCategory(c) {
  const db = ensureLocalDb();
  const payload = { name: c.name.trim(), slug: c.slug.trim(), image_url: c.image_url || null, is_active: !!c.is_active, sort_order: parseInt(c.sort_order, 10) || 0 };
  if (c.id) {
    db.categories = db.categories.map((category) => (category.id === c.id ? { ...category, ...payload } : category));
  } else {
    db.categories.push({ ...payload, id: uid('cat'), created_at: new Date().toISOString() });
  }
  await saveLocalDb(db);
  return true;
}

export const deleteCategory = async (id) => {
  const db = ensureLocalDb();
  db.categories = db.categories.filter((category) => category.id !== id);
  db.products = db.products.map((product) => (product.category_id === id ? { ...product, category_id: null } : product));
  await saveLocalDb(db);
  return true;
};

export const listSectionsAdmin = async () => {
  const db = ensureLocalDb();
  return [...db.landing_sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
};

export async function saveSection(s) {
  const db = ensureLocalDb();
  const payload = {
    title: s.title || null,
    description: s.description || null,
    image_url: s.image_url || null,
    cta_text: s.cta_text || null,
    cta_link: s.cta_link || null,
    cta2_text: s.cta2_text || null,
    cta2_link: s.cta2_link || null,
    items_limit: parseInt(s.items_limit, 10) || 0,
    is_visible: !!s.is_visible,
    sort_order: s.sort_order,
  };
  db.landing_sections = db.landing_sections.map((entry) => (entry.id === s.id ? { ...entry, ...payload } : entry));
  await saveLocalDb(db);
  return true;
}

export async function swapSections(a, b) {
  const db = ensureLocalDb();
  const first = db.landing_sections.find((section) => section.id === a.id);
  const second = db.landing_sections.find((section) => section.id === b.id);
  if (!first || !second) return;
  const temp = first.sort_order;
  first.sort_order = second.sort_order;
  second.sort_order = temp;
  await saveLocalDb(db);
}

export async function listDropsAdmin() {
  const db = ensureLocalDb();
  return [...db.drops].sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()).map((drop) => ({ ...drop, drop_products: db.drop_products.filter((row) => row.drop_id === drop.id).map((row) => row.product_id) }));
}

export async function saveDrop(d, productIds) {
  const db = ensureLocalDb();
  const payload = {
    name: d.name.trim(),
    description: d.description?.trim() || null,
    banner_url: d.banner_url || null,
    start_at: d.start_at,
    end_at: d.end_at,
    is_enabled: !!d.is_enabled,
    hide_products_before_start: !!d.hide_products_before_start,
    hide_products_after_end: !!d.hide_products_after_end,
    status: d.status || 'scheduled',
  };
  if (d.id) {
    db.drops = db.drops.map((drop) => (drop.id === d.id ? { ...drop, ...payload } : drop));
  } else {
    const next = { ...payload, id: uid('drop'), created_at: new Date().toISOString() };
    db.drops.push(next);
  }
  const targetId = d.id || db.drops[db.drops.length - 1].id;
  db.drop_products = db.drop_products.filter((row) => row.drop_id !== targetId);
  for (const productId of productIds) {
    db.drop_products.push({ drop_id: targetId, product_id: productId });
  }
  await saveLocalDb(db);
  return targetId;
}

export const deleteDrop = async (id) => {
  const db = ensureLocalDb();
  db.drops = db.drops.filter((drop) => drop.id !== id);
  db.drop_products = db.drop_products.filter((row) => row.drop_id !== id);
  await saveLocalDb(db);
  return true;
};

export const listSlidersAdmin = async () => {
  const db = ensureLocalDb();
  return [...db.sliders].sort((a, b) => a.placement.localeCompare(b.placement) || (a.sort_order || 0) - (b.sort_order || 0));
};

export async function saveSlider(s) {
  const db = ensureLocalDb();
  const payload = {
    title: s.title || null,
    description: s.description || null,
    image_url: s.image_url,
    button_text: s.button_text || null,
    button_link: s.button_link || null,
    placement: s.placement,
    is_active: !!s.is_active,
    sort_order: s.sort_order ?? 0,
  };
  if (s.id) {
    db.sliders = db.sliders.map((slider) => (slider.id === s.id ? { ...slider, ...payload } : slider));
  } else {
    db.sliders.push({ ...payload, id: uid('slider'), created_at: new Date().toISOString() });
  }
  await saveLocalDb(db);
  return true;
}

export const deleteSlider = async (id) => {
  const db = ensureLocalDb();
  db.sliders = db.sliders.filter((slider) => slider.id !== id);
  await saveLocalDb(db);
  return true;
};

export async function swapSliders(a, b) {
  const db = ensureLocalDb();
  const first = db.sliders.find((slider) => slider.id === a.id);
  const second = db.sliders.find((slider) => slider.id === b.id);
  if (!first || !second) return;
  const temp = first.sort_order;
  first.sort_order = second.sort_order;
  second.sort_order = temp;
  await saveLocalDb(db);
}

export default {
  adminStats,
  listOrders,
  listOrderItems,
  updateOrderStatus,
  recentOrders,
  listProductsAdmin,
  listProductOptions,
  setProductFlag,
  saveProduct,
  deleteProduct,
  listCategoriesAdmin,
  saveCategory,
  deleteCategory,
  listSectionsAdmin,
  saveSection,
  swapSections,
  listDropsAdmin,
  saveDrop,
  deleteDrop,
  listSlidersAdmin,
  saveSlider,
  deleteSlider,
  swapSliders,
};

/* ----------------------------------------------------------------- coupons */
export const listCouponsAdmin = async () =>
  ensureLocalDb().coupons.map((coupon) => ({ ...coupon, coupon_products: ensureLocalDb().coupon_products.filter((row) => row.coupon_id === coupon.id), coupon_categories: ensureLocalDb().coupon_categories.filter((row) => row.coupon_id === coupon.id) }));
export async function saveCoupon(c, productIds, categoryIds) {
  const payload = {
    code: c.code.trim().toUpperCase(), discount_type: c.discount_type, discount_value: Number(c.discount_value),
    min_order: Number(c.min_order) || 0, expires_at: c.expires_at || null,
    usage_limit: c.usage_limit === '' || c.usage_limit == null ? null : parseInt(c.usage_limit, 10),
    is_active: !!c.is_active,
  };
  let id = c.id;
  const db = ensureLocalDb();
  id ||= uid('coupon');
  const existing = db.coupons.some((coupon) => coupon.id === id);
  db.coupons = existing ? db.coupons.map((coupon) => coupon.id === id ? { ...coupon, ...payload } : coupon) : [...db.coupons, { ...payload, id, created_at: new Date().toISOString() }];
  db.coupon_products = [...(db.coupon_products || []).filter((row) => row.coupon_id !== id), ...productIds.map((product_id) => ({ coupon_id: id, product_id }))];
  db.coupon_categories = [...(db.coupon_categories || []).filter((row) => row.coupon_id !== id), ...categoryIds.map((category_id) => ({ coupon_id: id, category_id }))];
  await saveLocalDb(db);
  return id;
}
export const deleteCoupon = async (id) => { const db = ensureLocalDb(); db.coupons = db.coupons.filter((row) => row.id !== id); db.coupon_products = (db.coupon_products || []).filter((row) => row.coupon_id !== id); db.coupon_categories = (db.coupon_categories || []).filter((row) => row.coupon_id !== id); await saveLocalDb(db); };

/* ---------------------------------------------------------------- shipping */
export const listShippingAdmin = async () =>
  [...ensureLocalDb().shipping_rates].sort((a, b) => a.wilaya_code - b.wilaya_code);
export async function saveShippingRows(rows) {
  const db = ensureLocalDb();
  db.shipping_rates = rows.map((r) => ({ id: r.id || uid('ship'), wilaya_code: r.wilaya_code, name: r.name, price: Math.max(0, Number(r.price) || 0), is_active: !!r.is_active }));
  await saveLocalDb(db);
}

/* ---------------------------------------------------------------- settings */
export async function saveSettings(values) {
  const { id, updated_at, ...rest } = values; // eslint-disable-line no-unused-vars
  const db = ensureLocalDb();
  db.store_settings = [{ ...(db.store_settings[0] || { id: 1 }), ...rest, updated_at: new Date().toISOString() }];
  await saveLocalDb(db);
}

