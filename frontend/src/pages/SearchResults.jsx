import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { searchProducts } from '../api/catalogApi'
import ProductCard from '../components/catalog/ProductCard'
import SearchBar from '../components/catalog/SearchBar'
import MobileFooter from '../components/catalog/MobileFooter'

export default function SearchResults() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const searchText = searchParams.get('q')?.trim() || ''

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function runSearch() {
      if (!searchText) {
        setProducts([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const data = await searchProducts(searchText)

        if (isMounted) {
          setProducts(data)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError.response?.data?.detail ||
              'Unable to search products.'
          )
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    runSearch()

    return () => {
      isMounted = false
    }
  }, [searchText])

  return (
    <main className="mobile-shopping-shell search-results-page">
      <header className="search-page-header">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ←
        </button>

        <SearchBar
          key={searchText}
          initialValue={searchText}
          autoFocus={!searchText}
        />
      </header>

      <div className="inner-page-content">
        <div className="section-heading">
          <div>
            <span>Search results</span>
            <h1>
              {searchText ? `“${searchText}”` : 'Search products'}
            </h1>
          </div>

          <small>{products.length} found</small>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Searching...</p>
          </div>
        )}

        {error && (
          <div className="catalog-error">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="empty-state glass-panel">
            <span>🔎</span>
            <h2>No products found</h2>
            <p>Try searching by product or category name.</p>
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
