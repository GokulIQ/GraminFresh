export const FALLBACK_PRODUCT_IMAGE = '/images/products/product-placeholder.jpg'

// Uploaded files are served by the API at /static/uploads.  Customer pages run
// on the Vite host, so these paths must be resolved against the API host.
export function getProductImageUrl(imagePath, fallback = FALLBACK_PRODUCT_IMAGE) {
  if (!imagePath || typeof imagePath !== 'string') return fallback

  if (/^(https?:|data:|blob:)/i.test(imagePath)) return imagePath

  if (imagePath.startsWith('/static/')) {
    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
    return `${apiUrl}${imagePath}`
  }

  return imagePath.startsWith('/') ? imagePath : `/${imagePath}`
}
