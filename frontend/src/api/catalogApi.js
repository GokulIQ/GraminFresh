import axiosClient, { cachedGet } from './axiosClient'

function normalizeImages(product) {
  if (!product) return null
  return {
    ...product,
    images: Array.isArray(product?.images)
      ? product.images
      : [],
  }
}

export async function getCategories(forceRefresh = false) {
  const response = await cachedGet('/api/catalog/categories', { forceRefresh })
  return response.data
}

export async function getProductsByCategory(categoryId, forceRefresh = false) {
  const response = await cachedGet(`/api/catalog/categories/${categoryId}/products`, { forceRefresh })
  const data = Array.isArray(response.data) ? response.data : []
  return data.map(normalizeImages)
}

export async function getFeaturedProducts(forceRefresh = false) {
  const response = await cachedGet('/api/catalog/products/featured', { forceRefresh })
  const data = Array.isArray(response.data) ? response.data : []
  return data.map(normalizeImages)
}

export async function getPopularProducts(forceRefresh = false) {
  const response = await cachedGet('/api/catalog/products/popular', { forceRefresh })
  const data = Array.isArray(response.data) ? response.data : []
  return data.map(normalizeImages)
}

let searchAbortController = null

export async function searchProducts(searchText) {
  if (searchAbortController) {
    searchAbortController.abort()
  }
  searchAbortController = new AbortController()

  try {
    const response = await axiosClient.get('/api/catalog/products', {
      params: {
        search: searchText,
      },
      signal: searchAbortController.signal
    })
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(normalizeImages)
  } catch (error) {
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      // Ignored canceled request error, just return empty array silently
      return []
    }
    throw error
  }
}

export async function getProductDetails(productId, forceRefresh = false) {
  const response = await cachedGet(`/api/catalog/products/${productId}`, { forceRefresh })
  return normalizeImages(response.data)
}
