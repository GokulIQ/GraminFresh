function CategorySkeleton() {
  return (
    <div
      className="glass-category-card skeleton-category-card"
      aria-hidden="true"
    >
      <div className="skeleton-box skeleton-category-image" />

      <div className="skeleton-category-content">
        <div className="skeleton-box skeleton-title" />
        <div className="skeleton-box skeleton-small-text" />
      </div>
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div
      className="glass-product-card skeleton-product-card"
      aria-hidden="true"
    >
      <div className="skeleton-box skeleton-product-image" />

      <div className="product-card-content">
        <div className="skeleton-box skeleton-category-text" />
        <div className="skeleton-box skeleton-product-title" />
        <div className="skeleton-box skeleton-description" />
        <div className="skeleton-box skeleton-description short" />

        <div className="skeleton-price-row">
          <div className="skeleton-box skeleton-price" />
          <div className="skeleton-box skeleton-stock" />
        </div>

        <div className="product-actions">
          <div className="skeleton-box skeleton-button" />
          <div className="skeleton-box skeleton-button" />
        </div>
      </div>
    </div>
  )
}

export default function LoadingSkeleton({
  type = 'product',
  count = 4,
  horizontal = false,
}) {
  const skeletonItems = Array.from(
    { length: count },
    (_, index) => index
  )

  if (type === 'category') {
    return (
      <div
        className="category-grid"
        role="status"
        aria-label="Loading categories"
      >
        {skeletonItems.map((item) => (
          <CategorySkeleton key={item} />
        ))}

        <span className="sr-only">Loading categories...</span>
      </div>
    )
  }

  if (horizontal) {
    return (
      <div
        className="horizontal-product-list"
        role="status"
        aria-label="Loading products"
      >
        {skeletonItems.map((item) => (
          <div
            className="horizontal-product-item"
            key={item}
          >
            <ProductSkeleton />
          </div>
        ))}

        <span className="sr-only">Loading products...</span>
      </div>
    )
  }

  return (
    <div
      className="product-grid"
      role="status"
      aria-label="Loading products"
    >
      {skeletonItems.map((item) => (
        <ProductSkeleton key={item} />
      ))}

      <span className="sr-only">Loading products...</span>
    </div>
  )
}