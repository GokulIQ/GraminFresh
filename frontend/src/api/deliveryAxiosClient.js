import axios from 'axios'

const deliveryAxiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach Delivery JWT
deliveryAxiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vfd_delivery_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response Interceptor: Handle 401 Session Expiry
deliveryAxiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session
      localStorage.removeItem('vfd_delivery_token')
      localStorage.removeItem('vfd_delivery_partner')
      if (window.location.pathname.startsWith('/delivery') && window.location.pathname !== '/delivery/login') {
        window.location.href = '/delivery/login?session_expired=true'
      }
    }
    return Promise.reject(error)
  }
)

export default deliveryAxiosClient
