import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ColorSelector from '../components/ColorSelector';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Loading from '../components/Loading';
import Price from '../components/Price';
import ProductGallery from '../components/ProductGallery';
import ProductGrid from '../components/ProductGrid';
import QuantitySelector from '../components/QuantitySelector';
import SizeSelector from '../components/SizeSelector';
import { CartIcon } from '../components/Icons';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import useVariantSelection from '../hooks/useVariantSelection';
import { discountPercent, imagesFor, isInStock, totalStock } from '../utils/product';

function ProductView({ product, related }) {
  const { addItem, openCart } = useCart();
  const { settings } = useSettings();
  const toast = useToast();
  const sel = useVariantSelection(product);
  const [qty, setQty] = useState(1);

  useEffect(() => setQty(1), [sel.variant?.id]);

  const images = imagesFor(product, sel.color);
  const inStock = isInStock(product);
  const v = sel.variant;
  const showSize = !(sel.sizes.length === 1 && sel.sizes[0] === 'One size');
  const pct = discountPercent(product);

  let stockText;
  if (!inStock) stockText = 'Out of stock';
  else if (!v) stockText = `${totalStock(product)} in stock`;
  else if (v.stock <= 0) stockText = 'Out of stock in this option';
  else if (v.stock <= settings.low_stock_threshold) stockText = `Only ${v.stock} left`;
  else stockText = 'In stock';

  const add = () => {
    const r = addItem(product, v, qty);
    if (r.ok) { toast.success('Added to cart'); openCart(); } else toast.error(r.error);
  };
  const detailLines = (product.details || '').split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <div className="container product-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> / <Link to="/shop">Shop</Link>
        {product.category && <> / <Link to={`/shop?category=${product.category.slug}`}>{product.category.name}</Link></>}
      </nav>

      <div className="product-layout">
        <ProductGallery key={sel.color || 'all'} images={images} alt={product.name} />

        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="price-line">
            <Price product={product} large />
            {pct > 0 && <span className="badge badge-sale inline">−{pct}%</span>}
          </div>
          {product.description && <p className="lead pre">{product.description}</p>}

          <ColorSelector colors={sel.colors} value={sel.color} onChange={sel.setColor} isAvailable={sel.colorAvailable} />
          {showSize && <SizeSelector sizes={sel.sizes} value={sel.size} onChange={sel.setSize} isAvailable={sel.sizeAvailable} />}

          <p className={`stock ${inStock && (!v || v.stock > 0) ? 'ok' : 'out'}`}>{stockText}</p>

          <div className="buy-row">
            <QuantitySelector value={qty} max={v?.stock || 1} onChange={setQty} />
            <button className="btn btn-primary btn-lg grow" onClick={add} disabled={!inStock || (v && v.stock <= 0)}>
              <CartIcon width={20} height={20} /> {!inStock ? 'Sold out' : v ? 'Add to cart' : 'Select a size'}
            </button>
          </div>
        </div>
      </div>

      <section className="product-more">
        <h2>Product information</h2>
        <div className="info-grid">
          <div>
            {detailLines.length > 0 ? (
              <ul className="detail-list">{detailLines.map((l, i) => <li key={i}>{l}</li>)}</ul>
            ) : (
              <p className="muted">{product.description || 'No additional details.'}</p>
            )}
          </div>
          <dl className="spec">
            {product.category && <><dt>Category</dt><dd>{product.category.name}</dd></>}
            {showSize && <><dt>Sizes</dt><dd>{sel.sizes.join(', ')}</dd></>}
            {sel.colors.length > 0 && <><dt>Colors</dt><dd>{sel.colors.map((c) => c.name).join(', ')}</dd></>}
          </dl>
        </div>
      </section>

      {related.length > 0 && (
        <section className="product-more">
          <h2>You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const { byId, products, loading, error, reload } = useCatalog();
  if (loading) return <Loading />;
  if (error) return <div className="container"><ErrorState message={error} onRetry={reload} /></div>;
  const product = byId.get(id);
  if (!product) {
    return <div className="container"><EmptyState title="Product not found" text="It may have been removed or is not available yet." actionLabel="Back to shop" actionTo="/shop" /></div>;
  }
  const same = products.filter((p) => p.id !== product.id && product.category && p.category?.id === product.category.id);
  const related = (same.length ? same : products.filter((p) => p.id !== product.id)).slice(0, 4);
  return <ProductView key={product.id} product={product} related={related} />;
}
