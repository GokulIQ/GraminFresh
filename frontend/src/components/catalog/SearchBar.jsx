import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { searchProducts } from '../../api/catalogApi'
import { getProductImageUrl } from '../../utils/imageUrl'

export default function SearchBar({
  initialValue = '',
  autoFocus = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchText, setSearchText] = useState(initialValue)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    // Hide suggestions when clicking outside
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const cleanSearch = searchText.trim()
    if (!cleanSearch) {
      setSuggestions([])
      return
    }

    const handler = setTimeout(async () => {
      try {
        const results = await searchProducts(cleanSearch)
        // Only show top 5 suggestions
        setSuggestions(results.slice(0, 5))
      } catch (err) {
        console.error('Failed to fetch suggestions', err)
      }
    }, 200) // 200ms debounce for suggestions

    return () => clearTimeout(handler)
  }, [searchText])

  function handleSubmit(event) {
    event.preventDefault()
    
    setShowSuggestions(false)
    const cleanSearch = searchText.trim()
    if (!cleanSearch) {
      return
    }

    navigate(`/search?q=${encodeURIComponent(cleanSearch)}`)
  }

  function handleSuggestionClick(product) {
    setShowSuggestions(false)
    setSearchText(product.product_name)
    navigate(`/product/${product.id}`)
  }

  return (
    <div className="search-bar-wrapper" ref={wrapperRef} style={{ position: 'relative', width: '100%', flex: 1 }}>
      <form
        className="glass-search-bar"
        onSubmit={handleSubmit}
      >
        <span aria-hidden="true">⌕</span>

        <input
          type="search"
          value={searchText}
          autoFocus={autoFocus}
          placeholder="Search milk, fish, eggs..."
          aria-label="Search products"
          onChange={(event) => {
            setSearchText(event.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => {
            if (searchText.trim()) setShowSuggestions(true)
          }}
        />

        <button type="submit">Search</button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions-dropdown glass-panel">
          {suggestions.map(product => (
            <div 
              key={product.id} 
              className="suggestion-item"
              onClick={() => handleSuggestionClick(product)}
            >
              <img 
                src={getProductImageUrl(product.product_image, '/placeholder-produce.png')} 
                alt={product.product_name} 
                className="suggestion-thumb"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=40&auto=format&fit=crop&q=60' }}
              />
              <div className="suggestion-info">
                <span className="suggestion-name">{product.product_name}</span>
                <span className="suggestion-price">₹{Number(product.price).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
