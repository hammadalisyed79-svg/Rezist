export default function MenuLoading() {
  return (
    <div className="lz-shop-section" aria-busy="true" aria-label="Loading menu">
      <div className="lz-skeleton lz-skeleton-title" />
      <div className="lz-skeleton lz-skeleton-search" />
      <div className="lz-skeleton-row">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="lz-skeleton lz-skeleton-chip" />
        ))}
      </div>
      <div className="lz-product-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="lz-skeleton lz-skeleton-card" />
        ))}
      </div>
    </div>
  );
}
