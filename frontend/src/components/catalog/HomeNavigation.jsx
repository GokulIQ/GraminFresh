import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const navigationItems = [
  {
    id: 'home',
    label: 'Home',
    icon: '⌂',
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: '▦',
  },
  {
    id: 'featured',
    label: 'Featured',
    icon: '★',
  },
  {
    id: 'popular',
    label: 'Popular',
    icon: '🔥',
  },
]

export default function HomeNavigation() {
  const location = useLocation()
  const [activeItem, setActiveItem] = useState('home')
  const [isManualScrolling, setIsManualScrolling] =
    useState(false)

  function handleNavigation(sectionId) {
    setActiveItem(sectionId)
    setIsManualScrolling(true)

    if (sectionId === 'home') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } else {
      const targetSection =
        document.getElementById(sectionId)

      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    }

    window.setTimeout(() => {
      setIsManualScrolling(false)
    }, 700)
  }

  useEffect(() => {
    if (location.state?.scrollTo) {
      const targetId = location.state.scrollTo
      setActiveItem(targetId)
      const timer = setTimeout(() => {
        handleNavigation(targetId)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  useEffect(() => {
    function handleScroll() {
      if (isManualScrolling) {
        return
      }

      const categoriesSection =
        document.getElementById('categories')

      const featuredSection =
        document.getElementById('featured')

      const popularSection =
        document.getElementById('popular')

      const scrollPosition = window.scrollY + 140

      if (
        popularSection &&
        scrollPosition >= popularSection.offsetTop
      ) {
        setActiveItem('popular')
        return
      }

      if (
        featuredSection &&
        scrollPosition >= featuredSection.offsetTop
      ) {
        setActiveItem('featured')
        return
      }

      if (
        categoriesSection &&
        scrollPosition >= categoriesSection.offsetTop
      ) {
        setActiveItem('categories')
        return
      }

      setActiveItem('home')
    }

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    })

    handleScroll()

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      )
    }
  }, [isManualScrolling])

  return (
    <nav
      className="home-navigation"
      aria-label="Customer home navigation"
    >
      {navigationItems.map((item) => {
        const isActive = activeItem === item.id

        return (
          <button
            type="button"
            key={item.id}
            className={
              isActive
                ? 'home-navigation-item active'
                : 'home-navigation-item'
            }
            onClick={() =>
              handleNavigation(item.id)
            }
            aria-current={
              isActive ? 'page' : undefined
            }
          >
            <span
              className="home-navigation-icon"
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}