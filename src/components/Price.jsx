import { useSettings } from '../context/SettingsContext';
import { finalPrice, hasDiscount } from '../utils/product';

export default function Price({ product, large = false }) {
  const { money } = useSettings();
  return (
    <div className={`price${large ? ' price-lg' : ''}`}>
      <span className="price-now">{money(finalPrice(product))}</span>
      {hasDiscount(product) && <s className="price-old">{money(product.price)}</s>}
    </div>
  );
}
