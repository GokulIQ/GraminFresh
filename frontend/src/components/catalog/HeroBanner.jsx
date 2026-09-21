import { useEffect, useRef, useState } from 'react'

const heroSlides = [
  {
    id: 1,
    eyebrow: 'Farm to Home',
    title: 'Fresh village products delivered to your door',
    description:
      'Natural milk, eggs, fish and meat sourced directly from trusted local farms.',
    image: '/images/banners/farm-delivery.jpg',
  },
  {
    id: 2,
    eyebrow: 'Fresh Every Day',
    title: 'Pure milk and farm-fresh eggs for your family',
    description:
      'Enjoy naturally sourced dairy products and fresh eggs delivered safely.',
    image: '/images/banners/fresh-dairy-eggs.png',
  },
  {
    id: 3,
    eyebrow: 'Clean and Trusted',
    title: 'Fresh fish, prawns and quality meat',
    description:
      'Carefully cleaned, packed and delivered while maintaining freshness.',
    image: '/images/banners/fresh-fish-meat.png',
  },
]

const AUTO_SLIDE_DELAY = 4500

export default function HeroBanner() {
  const [activeSlide, setActiveSlide] = useState(0)
  const touchStartX = useRef(null)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide(
        (currentSlide) =>
          (currentSlide + 1) % heroSlides.length
      )
    }, AUTO_SLIDE_DELAY)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const showPreviousSlide = () => {
    setActiveSlide(
      (currentSlide) =>
        (currentSlide - 1 + heroSlides.length) %
        heroSlides.length
    )
  }

  const showNextSlide = () => {
    setActiveSlide(
      (currentSlide) =>
        (currentSlide + 1) % heroSlides.length
    )
  }

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX
  }

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) {
      return
    }

    const touchEndX = event.changedTouches[0].clientX
    const swipeDistance = touchStartX.current - touchEndX

    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0) {
        showNextSlide()
      } else {
        showPreviousSlide()
      }
    }

    touchStartX.current = null
  }

  const handleImageError = (event) => {
    event.currentTarget.onerror = null
    event.currentTarget.src =
      '/images/categories/milk-dairy.jpg'
  }

  return (
    <section
      className="hero-carousel"
      aria-label="GraminFresh offers"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="hero-slides-track"
        style={{
          transform: `translateX(-${activeSlide * 100}%)`,
        }}
      >
        {heroSlides.map((slide) => (
          <article
            className="hero-slide"
            key={slide.id}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="hero-slide-image"
              onError={handleImageError}
            />

            <div className="hero-slide-overlay" />

            <div className="hero-slide-content">
              <span className="hero-slide-eyebrow">
                {slide.eyebrow}
              </span>

              <h2>{slide.title}</h2>

              <p>{slide.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div
        className="hero-carousel-dots"
        aria-label="Choose banner"
      >
        {heroSlides.map((slide, index) => (
          <button
            type="button"
            key={slide.id}
            className={
              index === activeSlide
                ? 'hero-carousel-dot active'
                : 'hero-carousel-dot'
            }
            onClick={() => setActiveSlide(index)}
            aria-label={`Show banner ${index + 1}`}
            aria-current={
              index === activeSlide ? 'true' : undefined
            }
          />
        ))}
      </div>
    </section>
  )
}