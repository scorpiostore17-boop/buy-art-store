import { Link } from 'react-router-dom';
import Img from './Img';
import QuantitySelector from './QuantitySelector';
import { TrashIcon } from './Icons';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

export default function CartItem({ item, compact = false, readOnly = false, onNavigate }) {
  const { setQuantity, removeItem } = useCart();
  const { money } = useSettings();
  return (
    <li className={`cart-item${compact ? ' compact' : ''}`}>
      <Link to={`/product/${item.productId}`} onClick={onNavigate} className="cart-item-img">
        <Img src={item.image} alt={item.name} ratio="4 / 5" sizes="96px" width={240} />
      </Link>
      <div className="cart-item-body">
        <Link to={`/product/${item.productId}`} onClick={onNavigate} className="cart-item-name">{item.name}</Link>
        <div className="cart-item-meta">{[item.size !== 'One size' && item.size, item.color].filter(Boolean).join(' · ')}</div>
        {readOnly ? (
          <div className="cart-item-meta">Qty {item.quantity} × {money(item.price)}</div>
        ) : (
          <div className="cart-item-controls">
            <QuantitySelector small value={item.quantity} max={item.stock} onChange={(q) => setQuantity(item.variantId, q)} />
            <button className="icon-btn" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.variantId)}><TrashIcon width={18} height={18} /></button>
          </div>
        )}
      </div>
      <div className="cart-item-total">{money(item.price * item.quantity)}</div>
    </li>
  );
}
