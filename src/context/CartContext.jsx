import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog } from './CatalogContext';
import { useToast } from './ToastContext';
import { validateCoupon } from '../services/api';
import { finalPrice, mainImage } from '../utils/product';

const STORAGE_KEY = 'buyart.cart.v1';
const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

function readStorage() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { items: Array.isArray(raw?.items) ? raw.items : [], coupon: typeof raw?.coupon === 'string' ? raw.coupon : '' };
  } catch {
    return { items: [], coupon: '' };
  }
}

export function CartProvider({ children }) {
  const toast = useToast();
  const { products, loading: catalogLoading, error: catalogError } = useCatalog();
  const initial = useRef(readStorage());
  const [items, setItems] = useState(initial.current.items);
  const [couponCode, setCouponCode] = useState(initial.current.coupon);
  const [couponInfo, setCouponInfo] = useState(null); // { code, discount, sig }
  const [shipping, setShippingState] = useState({ wilaya: '', price: 0 });
  const [isOpen, setOpen] = useState(false);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, coupon: couponCode }));
    } catch { /* storage full or blocked - cart still works in memory */ }
  }, [items, couponCode]);

  // Reconcile the saved cart with fresh catalog data (price, stock, removed products)
  useEffect(() => {
    if (catalogLoading || catalogError) return;
    const byId = new Map(products.map((p) => [p.id, p]));
    let removed = 0;
    setItems((current) => {
      const next = [];
      for (const it of current) {
        const p = byId.get(it.productId);
        const v = p?.variants.find((x) => x.id === it.variantId);
        if (!p || !v || v.stock <= 0) { removed++; continue; }
        next.push({
          ...it,
          name: p.name,
          price: finalPrice(p),
          stock: v.stock,
          image: mainImage(p, it.color) || it.image,
          quantity: Math.min(it.quantity, v.stock),
        });
      }
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
    if (removed) toast.info('Some items in your cart are no longer available and were removed.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, catalogLoading, catalogError]);

  const sig = useMemo(() => items.map((i) => `${i.variantId}:${i.quantity}`).join('|'), [items]);

  // Re-validate the coupon on the server whenever the cart changes
  useEffect(() => {
    if (!couponCode) { setCouponInfo(null); return; }
    if (!items.length) return;
    if (couponInfo && couponInfo.code === couponCode && couponInfo.sig === sig) return;
    let alive = true;
    validateCoupon(couponCode, items)
      .then((r) => {
        if (!alive) return;
        if (r.valid) setCouponInfo({ code: r.code, discount: Number(r.discount), sig });
        else {
          setCouponCode('');
          setCouponInfo(null);
          toast.error(`Coupon removed: ${r.message}`);
        }
      })
      .catch(() => { /* offline: keep previous discount until the next attempt */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, sig]);

  const addItem = useCallback(
    (product, variant, qty = 1) => {
      if (!variant) return { ok: false, error: 'Please choose a size and color' };
      if (variant.stock <= 0) return { ok: false, error: 'This item is out of stock' };
      const existing = items.find((i) => i.variantId === variant.id);
      const nextQty = (existing?.quantity || 0) + qty;
      if (nextQty > variant.stock) {
        return { ok: false, error: `Only ${variant.stock} available${existing ? ` (you already have ${existing.quantity})` : ''}` };
      }
      setItems((cur) => {
        const has = cur.some((i) => i.variantId === variant.id);
        if (has) return cur.map((i) => (i.variantId === variant.id ? { ...i, quantity: nextQty, stock: variant.stock } : i));
        return [
          ...cur,
          {
            key: variant.id,
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            image: mainImage(product, variant.color_name),
            price: finalPrice(product),
            size: variant.size,
            color: variant.color_name,
            quantity: qty,
            stock: variant.stock,
          },
        ];
      });
      return { ok: true };
    },
    [items],
  );

  const removeItem = useCallback((variantId) => setItems((c) => c.filter((i) => i.variantId !== variantId)), []);
  const setQuantity = useCallback((variantId, qty) => {
    setItems((c) =>
      c.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock)) } : i)),
    );
  }, []);
  const clear = useCallback(() => {
    setItems([]);
    setCouponCode('');
    setCouponInfo(null);
  }, []);

  const applyCoupon = useCallback(
    async (code) => {
      const clean = code.trim().toUpperCase();
      if (!clean) return { ok: false, message: 'Enter a coupon code' };
      if (!items.length) return { ok: false, message: 'Your cart is empty' };
      try {
        const r = await validateCoupon(clean, items);
        if (!r.valid) return { ok: false, message: r.message };
        setCouponInfo({ code: r.code, discount: Number(r.discount), sig });
        setCouponCode(r.code);
        return { ok: true, message: `Coupon ${r.code} applied` };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
    [items, sig],
  );
  const removeCoupon = useCallback(() => { setCouponCode(''); setCouponInfo(null); }, []);
  const setShipping = useCallback((wilaya, price) => setShippingState({ wilaya, price: Number(price) || 0 }), []);

  const value = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = couponCode && couponInfo ? Math.min(couponInfo.discount, subtotal) : 0;
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      couponCode: couponInfo ? couponCode : '',
      discount,
      shipping,
      total: Math.max(subtotal - discount, 0) + (items.length ? shipping.price : 0),
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      addItem, removeItem, setQuantity, clear, applyCoupon, removeCoupon, setShipping,
    };
  }, [items, couponCode, couponInfo, shipping, isOpen, addItem, removeItem, setQuantity, clear, applyCoupon, removeCoupon, setShipping]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
