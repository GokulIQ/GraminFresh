// frontend/src/pages/ProductDetails.jsx

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPopularProducts, getProductDetails, getProductsByCategory } from '../api/catalogApi'
import ProductCard from '../components/catalog/ProductCard'
import { addToCart as apiAddToCart } from '../api/cartApi'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { toast } from 'react-hot-toast'
import { getDisplayUnit, getPackPrice, getQuantityLabel } from '../utils/productUnits'
import CustomerHeader from '../components/catalog/CustomerHeader'
import MobileFooter from '../components/catalog/MobileFooter'
import { FALLBACK_PRODUCT_IMAGE, getProductImageUrl } from '../utils/imageUrl'

const FALLBACK_IMAGE = FALLBACK_PRODUCT_IMAGE

function getProductImages(product) {
  const extraImages = product?.images || []
  const imageList = Array.isArray(extraImages) ? extraImages : []
  const allImages = [
    product?.product_image,
    ...imageList
  ].filter(Boolean).map(getProductImageUrl)
  return [...new Set(allImages)]
}

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, customer, logout } = useAuth()
  const { cartCount, refreshCart } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [browseProducts, setBrowseProducts] = useState([])
  const [addingToCart, setAddingToCart] = useState(false)
  const touchStartX = useRef(null)
  const images = getProductImages(product)

  useEffect(() => {
    let isMounted = true
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    async function loadProduct() {
      setLoading(true)
      setError('')
      setProduct(null)
      setAdded(false)
      setSelectedQuantity(1)
      setSelectedImage(0)
      setRelatedProducts([])
      setBrowseProducts([])
      try {
        const data = await getProductDetails(id)
        if (!isMounted) return
        setProduct(data)
        const categoryId = data.category?.id || data.category_id
        const [relatedResult, popularResult] = await Promise.allSettled([
          categoryId ? getProductsByCategory(categoryId) : Promise.resolve([]),
          getPopularProducts(),
        ])
        if (!isMounted) return
        const related = relatedResult.status === 'fulfilled' && Array.isArray(relatedResult.value) ? relatedResult.value : []
        const popular = popularResult.status === 'fulfilled' && Array.isArray(popularResult.value) ? popularResult.value : []
        setRelatedProducts(related.filter((item) => String(item.id) !== String(data.id)).slice(0, 6))
        setBrowseProducts(popular.filter((item) => String(item.id) !== String(data.id)).slice(0, 6))
      } catch (requestError) {
        if (isMounted) setError(requestError.response?.data?.detail || 'Unable to load product.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadProduct()
    return () => { isMounted = false }
  }, [id])

  useEffect(() => {
    if (images.length < 2) return undefined

    const timer = window.setInterval(() => {
      setSelectedImage((current) => (current + 1) % images.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [images.length])

  // Add to Cart function
  async function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/product/${id}` } })
      return
    }
    
    if (!product || product.stock <= 0) {
      toast.error('Product is out of stock')
      return
    }
    
    setAddingToCart(true)
    try {
      await apiAddToCart(product.id, selectedQuantity)
      await refreshCart()
      setAdded(true)
      toast.success(`${product.product_name} added to cart!`)
      setTimeout(() => setAdded(false), 3000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  // Buy Now function - adds to cart and navigates to cart page
  async function handleBuyNow() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/product/${id}` } })
      return
    }
    
    if (!product || product.stock <= 0) {
      toast.error('Product is out of stock')
      return
    }
    
    setAddingToCart(true)
    try {
      await apiAddToCart(product.id, selectedQuantity)
      await refreshCart()
      toast.success('Product added to cart! Redirecting to checkout...')
      // Navigate to cart page
      setTimeout(() => {
        navigate('/cart')
      }, 500)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add to cart')
      setAddingToCart(false)
    }
  }

  function updateQuantity(change) {
    setSelectedQuantity((current) => Math.min(Math.max(1, current + change), Number(product?.stock) || 1))
  }

  function handleImageError(event) {
    event.currentTarget.onerror = null
    event.currentTarget.src = FALLBACK_IMAGE
  }

  function showPreviousImage() {
    setSelectedImage((current) => (current - 1 + images.length) % images.length)
  }

  function showNextImage() {
    setSelectedImage((current) => (current + 1) % images.length)
  }

  function handleCarouselTouchStart(event) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleCarouselTouchEnd(event) {
    const startX = touchStartX.current
    const endX = event.changedTouches[0]?.clientX
    touchStartX.current = null
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 40) return
    if (endX < startX) showNextImage()
    else showPreviousImage()
  }

  return (
    <main className="mobile-shopping-shell">
      <CustomerHeader customer={customer} onLogout={logout} />
      <div className="inner-page-content">
        {loading && <div className="loading-state"><div className="loading-spinner" /><p>Loading product...</p></div>}
        {error && <div className="catalog-error">{error}</div>}
        {product && (
          <article className="product-detail-card glass-panel">
            <div className="product-image-gallery">
              <div
                className="product-image-carousel"
                onTouchStart={handleCarouselTouchStart}
                onTouchEnd={handleCarouselTouchEnd}
                aria-roledescription="carousel"
                aria-label={`${product.product_name} images`}
              >
                <img key={images[selectedImage] || FALLBACK_IMAGE} src={images[selectedImage] || FALLBACK_IMAGE} alt={product.product_name} className="product-detail-image" onError={handleImageError} />
                {images.length > 1 && <>
                  {/* <button type="button" className="carousel-control carousel-control-prev" onClick={showPreviousImage} aria-label="Previous product image">‹</button>
                  <button type="button" className="carousel-control carousel-control-next" onClick={showNextImage} aria-label="Next product image">›</button> */}
                  <span className="carousel-counter" aria-live="polite">{selectedImage + 1} / {images.length}</span>
                </>}
              </div>
              {images.length > 1 && <div className="product-image-thumbnails" aria-label="Product images">
                {images.map((image, index) => <button type="button" key={image} className={index === selectedImage ? 'image-thumbnail is-active' : 'image-thumbnail'} onClick={() => setSelectedImage(index)} aria-label={`Show image ${index + 1}`}><img src={image} alt="" onError={handleImageError} /></button>)}
              </div>}
            </div>
            <div className="product-detail-content">
              <p className="product-category">{product.category?.category_name || 'Farm Product'}</p>
              <h2>{product.product_name}</h2>
              <p className="product-detail-description">{product.description || 'Freshly sourced farm product.'}</p>
              <div className="detail-price">₹{getPackPrice(product.price, product.unit).toFixed(2)}<span> / {getDisplayUnit(product.unit)}</span></div>
              <p className="detail-stock">{product.stock > 0 ? `${product.stock} units available` : 'Currently out of stock'}</p>
              <div className="product-information-grid">
                <div>
                  <span>Freshness</span>
                  <strong>{product?.freshness_info || 'Freshly sourced and packed to order'}</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong>
                    {product?.delivery_available 
                      ? 'Home delivery available in your area' 
                      : 'Delivery not available for this product'}
                  </strong>
                </div>
              </div>
              {product.stock > 0 && <div className="detail-quantity">
                <span>Quantity</span>
                <div className="quantity-selector">
                  <button type="button" onClick={() => updateQuantity(-1)} disabled={selectedQuantity <= 1} aria-label="Decrease quantity">−</button>
                  <output aria-live="polite">{selectedQuantity}</output>
                  <button type="button" onClick={() => updateQuantity(1)} disabled={selectedQuantity >= product.stock} aria-label="Increase quantity">+</button>
                </div>
                <small>{getQuantityLabel(product.unit, selectedQuantity)}</small>
              </div>}
              <div className="detail-action-buttons">
                <button 
                  type="button" 
                  className="cart-button detail-cart-button" 
                  disabled={product.stock <= 0 || addingToCart} 
                  onClick={handleAddToCart}
                >
                  {addingToCart ? 'Adding...' : added ? 'Added to Cart ✓' : 'Add to Cart'}
                </button>
                <button 
                  type="button" 
                  className="buy-now-button" 
                  disabled={product.stock <= 0 || addingToCart} 
                  onClick={handleBuyNow}
                >
                  {addingToCart ? 'Processing...' : 'Buy Now'}
                </button>
              </div>
            </div>
          </article>
        )}
        {product && relatedProducts.length > 0 && <section className="product-discovery-section"><div className="section-heading"><div><span>More from this category</span><h2>Related Products</h2></div><small>{relatedProducts.length} to explore</small></div><div className="horizontal-product-list product-discovery-list">{relatedProducts.map((item) => <div className="horizontal-product-item" key={item.id}><ProductCard product={item} /></div>)}</div></section>}
        {product && browseProducts.length > 0 && <section className="product-discovery-section"><div className="section-heading"><div><span>Customer favourites</span><h2>Browse More Products</h2></div><small>{browseProducts.length} popular picks</small></div><div className="horizontal-product-list product-discovery-list">{browseProducts.map((item) => <div className="horizontal-product-item" key={item.id}><ProductCard product={item} /></div>)}</div><button type="button" className="browse-products-button" onClick={() => navigate('/customer/dashboard')}>Browse all products</button></section>}
      </div>
      <MobileFooter />
    </main>
  )
}
