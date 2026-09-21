import axiosClient from './axiosClient'

export async function addToCart(productId, quantity = 1) {
  const response = await axiosClient.post('/api/cart/add', {
    product_id: productId,
    quantity: quantity
  })
  return response.data
}

export async function getCartItems() {
  const response = await axiosClient.get('/api/cart/items')
  return response.data
}

export async function updateCartItem(itemId, quantity) {
  const response = await axiosClient.put(`/api/cart/update/${itemId}`, {
    quantity: quantity
  })
  return response.data
}

export async function removeCartItem(itemId) {
  await axiosClient.delete(`/api/cart/remove/${itemId}`)
}

export async function clearCart() {
  await axiosClient.delete('/api/cart/clear')
}