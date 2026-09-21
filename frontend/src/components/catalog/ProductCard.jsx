import { useState, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { addToCart } from '../../api/cartApi'
import { useCart } from '../../context/CartContext'
import { getDisplayUnit, getPackPrice } from '../../utils/productUnits'
import { FALLBACK_PRODUCT_IMAGE, getProductImageUrl } from '../../utils/imageUrl'

const FALLBACK_IMAGE = FALLBACK_PRODUCT_IMAGE

function ProductCard({ product }) {
  const navigate = useNavigate()
  const { refreshCart } = useCart()
  const [added, setAdded] = useState(false)

  const stock = Number(product?.stock ?? 0)
  const price = getPackPrice(product?.price, product?.unit)
  const outOfStock = stock <= 0

  const handleImageError = useCallback((event) => {
    event.currentTarget.onerror = null
    event.currentTarget.src = FALLBACK_IMAGE
  }, [])

  const openProductDetails = useCallback(() => {
    navigate(`/product/${product.id}`, { state: { product } })
  }, [navigate, product])

  const handleAddToCart = useCallback(async () => {
    if (outOfStock) {
      return
    }

    try {
      await addToCart(product.id, 1)
      await refreshCart()
      setAdded(true)
      toast.success(`${product.product_name} added to cart`)

      window.setTimeout(() => {
        setAdded(false)
      }, 1500)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add product to cart')
    }
  }, [outOfStock, product?.id, product?.product_name, refreshCart])

  const handleCardKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openProductDetails()
    }
  }, [openProductDetails])

  return (
    <article
      className="glass-product-card product-card-link"
      role="link"
      tabIndex={0}
      aria-label={`View details for ${product?.product_name || 'product'}`}
      onClick={openProductDetails}
      onKeyDown={handleCardKeyDown}
    >
      <div className="product-image-wrapper">
        <img
          src={getProductImageUrl(product?.product_image)}
          alt={product?.product_name || 'Farm product'}
          className="product-image"
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />

        {Boolean(product?.is_featured) && (
          <span className="featured-badge">
            Featured
          </span>
        )}
      </div>

      <div className="product-card-content">
        <p className="product-category">
          {product?.category?.category_name || 'Farm Product'}
        </p>

        <h3 className="product-name">
          {product?.product_name || 'Product'}
        </h3>

        <p className="product-description">
          {product?.description || 'Fresh farm product'}
        </p>

        <div className="product-price-row">
          <div>
            <span className="product-price">
              ₹{price.toFixed(2)}
            </span>

            <span className="product-unit">
              {' '}
              / {getDisplayUnit(product?.unit)}
            </span>
          </div>

          <span
            className={
              outOfStock
                ? 'stock-label stock-label-danger'
                : 'stock-label'
            }
          >
            {outOfStock
              ? 'Out of stock'
              : `${stock} available`}
          </span>
        </div>

        <div className="product-actions">
          <button
            type="button"
            className="view-button"
            onClick={(event) => {
              event.stopPropagation()
              openProductDetails()
            }}
          >
            View Details
          </button>

          <button
            type="button"
            className="cart-button"
            disabled={outOfStock}
            onClick={(event) => {
              event.stopPropagation()
              handleAddToCart()
            }}
          >
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default memo(ProductCard)
