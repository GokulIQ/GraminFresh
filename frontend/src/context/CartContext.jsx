import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { getCartItems } from '../api/cartApi'

const CartContext = createContext({
  cartCount: 0,
  cart: null,
  setCartData: () => {},
  refreshCart: () => {},
})

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0)
  const [cart, setCart] = useState(null)

  const refreshCart = useCallback(async () => {
    // Only attempt to fetch cart if customer is logged in
    const token = localStorage.getItem('vfd_token')
    if (!token) {
      setCartCount(0)
      setCart(null)
      return null
    }

    try {
      const cartData = await getCartItems()
      setCartCount(cartData?.total_items ?? 0)
      setCart(cartData)
      return cartData
    } catch (err) {
      setCartCount(0)
      setCart(null)
      return null
    }
  }, [])

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const contextValue = useMemo(
    () => ({
      cartCount,
      cart,
      setCartData: (data) => {
        setCart(data)
        if (data && typeof data.total_items === 'number') {
          setCartCount(data.total_items)
        }
      },
      refreshCart,
    }),
    [cartCount, cart, refreshCart]
  )

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
