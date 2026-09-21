import { memo, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function MobileFooter() {
  const currentYear = new Date().getFullYear()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    if (location.pathname !== '/customer/dashboard') {
      setActiveSection('')
      return
    }

    function handleScroll() {
      const categoriesSection = document.getElementById('categories')
      const featuredSection = document.getElementById('featured')
      const popularSection = document.getElementById('popular')

      const scrollPosition = window.scrollY + 180

      if (popularSection && scrollPosition >= popularSection.offsetTop) {
        setActiveSection('popular')
        return
      }

      if (featuredSection && scrollPosition >= featuredSection.offsetTop) {
        setActiveSection('featured')
        return
      }

      if (categoriesSection && scrollPosition >= categoriesSection.offsetTop) {
        setActiveSection('categories')
        return
      }

      setActiveSection('home')
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [location.pathname])

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)

    if (location.pathname === '/customer/dashboard') {
      if (sectionId === 'home') {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
        return
      }

      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    } else {
      navigate('/customer/dashboard', { state: { scrollTo: sectionId } })
    }
  }

  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        {/* Brand information */}
        <section className="footer-brand-section">
          <div className="footer-brand-row">
            <div
              className="footer-logo"
              aria-hidden="true"
            >
              <img src="/graminfresh-logo.svg" alt="GraminFresh Logo" style={{ width: '24px', height: '24px' }} />
            </div>

            <div>
              <h2>GraminFresh</h2>
              <span>Village Farm Delivery</span>
            </div>
          </div>

          <p className="footer-description">
            Fresh milk, eggs, fish, prawns, chicken, meat and
            other farm products delivered directly from trusted
            local farms to your doorstep.
          </p>

          <div className="footer-trust-badges">
            <div>
              <span aria-hidden="true">🌱</span>
              <strong>Farm Fresh</strong>
              <small>Locally sourced</small>
            </div>

            <div>
              <span aria-hidden="true">🛡️</span>
              <strong>Trusted</strong>
              <small>Quality products</small>
            </div>

            <div>
              <span aria-hidden="true">🚚</span>
              <strong>Local Delivery</strong>
              <small>Closer to home</small>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <nav
          className="footer-navigation"
          aria-label="Footer navigation"
        >
          <p className="footer-column-title">
            Explore GraminFresh
          </p>

          <button
            type="button"
            className={activeSection === 'home' ? 'active' : ''}
            onClick={() => scrollToSection('home')}
          >
            <span aria-hidden="true">⌂</span>
            Home
          </button>

          <button
            type="button"
            className={activeSection === 'categories' ? 'active' : ''}
            onClick={() => scrollToSection('categories')}
          >
            <span aria-hidden="true">▦</span>
            Product Categories
          </button>

          <button
            type="button"
            className={activeSection === 'featured' ? 'active' : ''}
            onClick={() => scrollToSection('featured')}
          >
            <span aria-hidden="true">★</span>
            Featured Products
          </button>

          <button
            type="button"
            className={activeSection === 'popular' ? 'active' : ''}
            onClick={() => scrollToSection('popular')}
          >
            <span aria-hidden="true">🔥</span>
            Popular Products
          </button>
        </nav>

        {/* Delivery information */}
        <section className="footer-delivery-section">
          <p className="footer-column-title">
            Our Promise
          </p>

          <div className="footer-promise-card">
            <div
              className="footer-promise-icon"
              aria-hidden="true"
            >
              🧺
            </div>

            <div>
              <strong>Freshness delivered daily</strong>

              <p>
                Carefully selected farm products with clean
                handling and reliable village delivery.
              </p>
            </div>
          </div>

          <div className="footer-category-tags">
            <span onClick={() => scrollToSection('categories')} style={{ cursor: 'pointer' }}>Milk &amp; Dairy</span>
            <span onClick={() => scrollToSection('categories')} style={{ cursor: 'pointer' }}>Eggs</span>
            <span onClick={() => scrollToSection('categories')} style={{ cursor: 'pointer' }}>Fish</span>
            <span onClick={() => scrollToSection('categories')} style={{ cursor: 'pointer' }}>Prawns</span>
            <span onClick={() => scrollToSection('categories')} style={{ cursor: 'pointer' }}>Chicken</span>
            <span onClick={() => scrollToSection('categories')} style={{ cursor: 'pointer' }}>Meat</span>
          </div>
        </section>
      </div>

      <div className="footer-bottom">
        <small>
          © {currentYear} GraminFresh. All rights reserved.
        </small>

        <span>
          Fresh from local farms, delivered with care.
        </span>
      </div>
    </footer>
  )
}

export default memo(MobileFooter)