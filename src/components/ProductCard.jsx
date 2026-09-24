import { useState } from 'react';
import { Link } from 'react-router-dom';
import Img from './Img';
import Price from './Price';
import ColorSelector from './ColorSelector';
import SizeSelector from './SizeSelector';
import { CartIcon, CloseIcon } from './Icons';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import useVariantSelection from '../hooks/useVariantSelection';
import { colorsOf, discountPercent, imagesFor, isInStock, sizesOf } from '../utils/product';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const toast = useToast();
  const sel = useVariantSelection(product);
  const [quick, setQuick] = useState(false);

  const inStock = isInStock(product);
  const colors = colorsOf(product);
  const sizes = sizesOf(product).filter((s) => product.variants.some((v) => v.size === s && v.stock > 0));
  const needsChoice = sel.sizes.filter((s) => s !== 'One size').length > 1 || sel.colors.length > 1;
  const img = imagesFor(product, quick ? sel.color : '')[0]?.url || '';
  const pct = discountPercent(product);

  const commit = (variant) => {
    const r = addItem(product, variant, 1);
    if (r.ok) { toast.success(`${product.name} added to cart`); setQuick(false); }
    else toast.error(r.error);
  };

  const onAdd = () => {
    if (!inStock) return;
    if (needsChoice) { setQuick((q) => !q); return; }
    commit(sel.variant || product.variants.find((v) => v.stock > 0));
  };

  return (
    <article className={`card${inStock ? '' : ' is-soldout'}`}>
      <div className="card-media">
        <Img src={img} alt={product.name} ratio="4 / 5" sizes="(min-width: 1100px) 25vw, (min-width: 700px) 33vw, 50vw" />
        {pct > 0 && inStock && <span className="badge badge-sale">−{pct}%</span>}
        {!inStock && <span className="badge badge-out">Sold out</span>}

        {quick && (
          <div className="quick" role="dialog" aria-label={`Choose options for ${product.name}`}>
            <button className="icon-btn quick-close" onClick={() => setQuick(false)} aria-label="Close"><CloseIcon width={16} height={16} /></button>
            <ColorSelector colors={sel.colors} value={sel.color} onChange={sel.setColor} isAvailable={sel.colorAvailable} />
            <SizeSelector sizes={sel.sizes} value={sel.size} onChange={sel.setSize} isAvailable={sel.sizeAvailable} />
            <button className="btn btn-primary btn-block" disabled={!sel.variant || sel.variant.stock <= 0} onClick={() => commit(sel.variant)}>
              {sel.variant ? 'Add to cart' : 'Select a size'}
            </button>
          </div>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title">
          <Link to={`/product/${product.id}`} className="stretched">{product.name}</Link>
        </h3>
        <Price product={product} />
        <div className="card-variants" aria-label="Available variants">
          {colors.length > 0 && (
            <span className="dots">
              {colors.slice(0, 5).map((c) => <i key={c.name} title={c.name} style={{ '--swatch': c.hex }} />)}
              {colors.length > 5 && <em>+{colors.length - 5}</em>}
            </span>
          )}
          {sizes.length > 0 && !(sizes.length === 1 && sizes[0] === 'One size') && <span className="sizes-text">{sizes.join(' · ')}</span>}
        </div>
        <button className="btn btn-primary btn-sm card-add" disabled={!inStock} onClick={onAdd}>
          <CartIcon width={16} height={16} /> {inStock ? 'Add to cart' : 'Sold out'}
        </button>
      </div>
    </article>
  );
}
