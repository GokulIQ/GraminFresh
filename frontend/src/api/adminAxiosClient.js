import axios from 'axios'

const adminAxiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach Admin JWT
adminAxiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vfd_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response Interceptor: Handle 401 Session Expiry
adminAxiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear admin session
      localStorage.removeItem('vfd_admin_token')
      localStorage.removeItem('vfd_admin_user')
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login?session_expired=true'
      }
    }
    return Promise.reject(error)
  }
)

export default adminAxiosClient
