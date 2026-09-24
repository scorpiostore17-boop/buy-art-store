export default function Loading({ label = 'Loading…', inline = false }) {
  return (
    <div className={inline ? 'loading loading-inline' : 'loading'} role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-img" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
