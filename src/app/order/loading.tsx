export default function OrderLoading() {
  return (
    <div className="lz-shop-section" aria-busy="true" aria-label="Loading checkout">
      <div className="lz-skeleton lz-skeleton-title" />
      <div className="lz-skeleton lz-skeleton-panel" />
      <div className="lz-product-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="lz-skeleton lz-skeleton-card" />
        ))}
      </div>
    </div>
  );
}
