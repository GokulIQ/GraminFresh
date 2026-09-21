import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function CategoryCard({ category }) {
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    navigate(`/category/${category.id}`)
  }, [navigate, category.id])

  const handleImageError = useCallback((event) => {
    event.currentTarget.src = '/images/products/product-placeholder.jpg'
  }, [])

  return (
    <button
      type="button"
      className="glass-category-card"
      onClick={handleClick}
    >
      <div className="category-image-wrapper">
        <img
          src={category.category_image}
          alt={category.category_name}
          className="category-image"
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
      </div>

      <div className="min-w-0 text-left">
        <h3 className="category-title">
          {category.category_name}
        </h3>

        <p className="category-count">
          {category.product_count}{' '}
          {category.product_count === 1 ? 'product' : 'products'}
        </p>
      </div>

      <span className="category-arrow">›</span>
    </button>
  )
}

export default memo(CategoryCard)