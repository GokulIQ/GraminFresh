import axios from 'axios'

// In-memory cache store and inflight request deduplication map
const apiCache = new Map()
const inflightRequests = new Map()

// Default TTL: 30 seconds for catalog GET endpoints
const DEFAULT_CACHE_TTL = 30 * 1000

export function clearApiCache(prefix = '') {
  if (!prefix) {
    apiCache.clear()
    return
  }
  for (const key of apiCache.keys()) {
    if (key.includes(prefix)) {
      apiCache.delete(key)
    }
  }
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000, // 10 second timeout to prevent stalled connections
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach Auth Token & Handle In-flight / Cached GET
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vfd_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Mutating requests invalidate corresponding caches
  const method = (config.method || 'get').toLowerCase()
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    if (config.url?.includes('/cart')) {
      clearApiCache('/cart')
    } else if (config.url?.includes('/orders')) {
      clearApiCache('/orders')
    } else if (config.url?.includes('/addresses')) {
      clearApiCache('/addresses')
    }
  }

  return config
})

// Response Interceptor: 401 Cleanup
axiosClient.interceptors.response.use(
  (response) => {
    // Cache successful GET responses if enabled
    const method = (response.config.method || 'get').toLowerCase()
    const url = response.config.url || ''
    const useCache = response.config.useCache ?? (method === 'get' && url.startsWith('/api/catalog'))

    if (useCache && response.status === 200) {
      const cacheKey = `${url}:${JSON.stringify(response.config.params || {})}`
      apiCache.set(cacheKey, {
        timestamp: Date.now(),
        data: response.data,
      })
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vfd_token')
      localStorage.removeItem('vfd_customer')
      clearApiCache()
    }
    return Promise.reject(error)
  }
)

/**
 * Cached GET wrapper: Checks in-memory cache and deduplicates identical in-flight requests.
 */
export async function cachedGet(url, config = {}) {
  const cacheKey = `${url}:${JSON.stringify(config.params || {})}`
  const now = Date.now()
  const ttl = config.ttl ?? DEFAULT_CACHE_TTL

  // 1. Check cache
  const cached = apiCache.get(cacheKey)
  
  if (cached && !config.forceRefresh) {
    const isStale = now - cached.timestamp > ttl
    
    // Stale-While-Revalidate (SWR): Return stale cache instantly but refresh in background
    if (isStale && !inflightRequests.has(cacheKey)) {
      const bgPromise = axiosClient.get(url, { ...config, useCache: true }).finally(() => {
        inflightRequests.delete(cacheKey)
      })
      inflightRequests.set(cacheKey, bgPromise)
    }
    
    return { data: cached.data }
  }

  // 2. Return inflight promise if duplicate request is currently executing
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)
  }

  // 3. Fetch from network and store inflight promise
  const promise = axiosClient
    .get(url, { ...config, useCache: true })
    .then((res) => {
      inflightRequests.delete(cacheKey)
      return res
    })
    .catch((err) => {
      inflightRequests.delete(cacheKey)
      throw err
    })

  inflightRequests.set(cacheKey, promise)
  return promise
}

export default axiosClient

