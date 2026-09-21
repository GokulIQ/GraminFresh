import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getProductsByCategory } from '../api/catalogApi'
import ProductCard from '../components/catalog/ProductCard'
import { useAuth } from '../context/AuthContext'
import CustomerHeader from '../components/catalog/CustomerHeader'
import MobileFooter from '../components/catalog/MobileFooter'

export default function CategoryProducts() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { customer, logout } = useAuth()

  const [products, setProducts] = useState([])
  const [categoryName, setCategoryName] = useState('Products')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    })

    async function loadProducts() {
      try {
        setLoading(true)
        setError('')

        const data = await getProductsByCategory(id)

        if (!isMounted) {
          return
        }

        setProducts(data)

        if (data.length > 0) {
          setCategoryName(
            data[0].category?.category_name || 'Products'
          )
        }
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        setError(
          requestError.response?.data?.detail ||
            'Unable to load category products.'
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      isMounted = false
    }
  }, [id])

  return (
    <main className="mobile-shopping-shell category-products-page">
      <CustomerHeader customer={customer} onLogout={logout} />
      <div className="inner-page-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading products...</p>
          </div>
        )}

        {error && (
          <div className="catalog-error">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="empty-state glass-panel">
            <span>🌾</span>
            <h2>No products available</h2>
            <p>Products will be added to this category soon.</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
      <MobileFooter />
    </main>
  )
}
