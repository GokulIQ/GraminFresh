import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import {
  getCategories,
  getFeaturedProducts,
  getPopularProducts,
} from '../api/catalogApi'

import CategoryCard from '../components/catalog/CategoryCard'
import ProductCard from '../components/catalog/ProductCard'
import SearchBar from '../components/catalog/SearchBar'
import HeroBanner from '../components/catalog/HeroBanner'
import SectionHeader from '../components/catalog/SectionHeader'
import LoadingSkeleton from '../components/catalog/LoadingSkeleton'
import MobileFooter from '../components/catalog/MobileFooter'
import CustomerHeader from '../components/catalog/CustomerHeader'
import HomeNavigation from '../components/catalog/HomeNavigation'

export default function Dashboard() {
  const { customer, logout } = useAuth()
  const location = useLocation()

  const [categories, setCategories] = useState([])
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [popularProducts, setPopularProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadHomePage() {
      setLoading(true)
      setError('')

      try {
          const [
            categoryData,
            featuredData,
            popularData,
          ] = await Promise.all([
            getCategories(),
            getFeaturedProducts(),
            getPopularProducts(),
          ])

        if (!isMounted) {
          return
        }

        setCategories(
          Array.isArray(categoryData) ? categoryData : []
        )

        setFeaturedProducts(
          Array.isArray(featuredData) ? featuredData : []
        )

        setPopularProducts(
          Array.isArray(popularData) ? popularData : []
        )
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        console.error(
          'Dashboard loading error:',
          requestError
        )

        setError(
          requestError.response?.data?.detail ||
            requestError.message ||
            'Unable to load farm products. Please try again.'
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadHomePage()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!loading && location.state?.scrollTo) {
      const targetId = location.state.scrollTo
      if (targetId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        const target = document.getElementById(targetId)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }
  }, [loading, location.state])

  return (
    <main
      id="home"
      className="mobile-shopping-shell"
    >
      <CustomerHeader
        customer={customer}
        onLogout={logout}
      />

      <HomeNavigation />

      <div className="home-body">
        <SearchBar />

        <HeroBanner />

        {error && (
          <div
            className="catalog-error"
            role="alert"
          >
            <strong>Unable to load products</strong>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <>
            {/* Category loading section */}
            <section className="home-section">
              <SectionHeader
                eyebrow="Farm essentials"
                title="Shop by Category"
              />

              <LoadingSkeleton
                type="category"
                count={6}
              />
            </section>

            {/* Featured products loading section */}
            <section className="home-section">
              <SectionHeader
                eyebrow="Handpicked for you"
                title="Featured Products"
              />

              <LoadingSkeleton
                type="product"
                count={3}
                horizontal
              />
            </section>

            {/* Popular products loading section */}
            <section className="home-section">
              <SectionHeader
                eyebrow="Customer favourites"
                title="Popular Products"
              />

              <LoadingSkeleton
                type="product"
                count={3}
                horizontal
              />
            </section>
          </>
        ) : (
          <>
            {/* Category section */}
            <section
              id="categories"
              className="home-section home-scroll-section"
            >
              <SectionHeader
                eyebrow="Farm essentials"
                title="Shop by Category"
                count={categories.length}
                countLabel={
                  categories.length === 1
                    ? 'category'
                    : 'categories'
                }
              />

              {categories.length > 0 ? (
                <div className="category-grid">
                  {categories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state glass-panel">
                  <span aria-hidden="true">
                    🌾
                  </span>

                  <h2>No categories available</h2>

                  <p>
                    Farm product categories will be added
                    soon.
                  </p>
                </div>
              )}
            </section>

            {/* Featured products section */}
            <section
              id="featured"
              className="home-section home-scroll-section"
            >
              <SectionHeader
                eyebrow="Handpicked for you"
                title="Featured Products"
                count={featuredProducts.length}
                countLabel={
                  featuredProducts.length === 1
                    ? 'product'
                    : 'products'
                }
              />

              {featuredProducts.length > 0 ? (
                <div className="horizontal-product-list">
                  {featuredProducts.map((product) => (
                    <div
                      className="horizontal-product-item"
                      key={product.id}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state glass-panel">
                  <span aria-hidden="true">
                    🧺
                  </span>

                  <h2>No featured products</h2>

                  <p>
                    Featured farm products will appear here.
                  </p>
                </div>
              )}
            </section>

            {/* Popular products section */}
            <section
              id="popular"
              className="home-section home-scroll-section"
            >
              <SectionHeader
                eyebrow="Customer favourites"
                title="Popular Products"
                count={popularProducts.length}
                countLabel={
                  popularProducts.length === 1
                    ? 'product'
                    : 'products'
                }
              />

              {popularProducts.length > 0 ? (
                <div className="horizontal-product-list">
                  {popularProducts.map((product) => (
                    <div
                      className="horizontal-product-item"
                      key={product.id}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state glass-panel">
                  <span aria-hidden="true">
                    ⭐
                  </span>

                  <h2>No popular products</h2>

                  <p>
                    Popular farm products will appear here.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

      </div>
      <MobileFooter />
    </main>
  )
}
