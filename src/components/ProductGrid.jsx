import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import { SkeletonGrid } from './Loading';

export default function ProductGrid({ products, loading, emptyTitle = 'No products found', emptyText, onReset }) {
  if (loading) return <SkeletonGrid />;
  if (!products.length) {
    return <EmptyState title={emptyTitle} text={emptyText} actionLabel={onReset ? 'Clear filters' : undefined} onAction={onReset} />;
  }
  return (
    <div className="product-grid">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
