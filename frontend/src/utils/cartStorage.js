const CART_KEY = 'vfd_cart'

function getStoredCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || []
  } catch {
    localStorage.removeItem(CART_KEY)
    return []
  }
}

export function addProductToCart(product, quantityToAdd = 1) {
  const currentCart = getStoredCart()
  const quantity = Math.max(1, Number(quantityToAdd) || 1)

  const existingItem = currentCart.find(
    (item) => item.product_id === product.id
  )

  let updatedCart

  if (existingItem) {
    updatedCart = currentCart.map((item) =>
      item.product_id === product.id
        ? {
            ...item,
            quantity: Math.min(
              item.quantity + quantity,
              product.stock
            ),
          }
        : item
    )
  } else {
    updatedCart = [
      ...currentCart,
      {
        product_id: product.id,
        product_name: product.product_name,
        product_image: product.product_image,
        price: Number(product.price),
        unit: product.unit,
        stock: product.stock,
        quantity: Math.min(quantity, product.stock),
      },
    ]
  }

  localStorage.setItem(CART_KEY, JSON.stringify(updatedCart))

  window.dispatchEvent(new Event('vfd-cart-updated'))

  return updatedCart
}
