import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import axiosClient, { clearApiCache } from '../api/axiosClient'

const AuthContext = createContext(null)

const TOKEN_KEY = 'vfd_token'
const CUSTOMER_KEY = 'vfd_customer'

function getStoredCustomer() {
  try {
    const storedCustomer = localStorage.getItem(CUSTOMER_KEY)
    return storedCustomer ? JSON.parse(storedCustomer) : null
  } catch {
    localStorage.removeItem(CUSTOMER_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(getStoredCustomer)
  const [token, setToken] = useState(() =>
    localStorage.getItem(TOKEN_KEY)
  )

  const saveSession = useCallback((data) => {
    if (!data?.access_token || !data?.customer) {
      throw new Error('Invalid authentication response')
    }

    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(
      CUSTOMER_KEY,
      JSON.stringify(data.customer)
    )

    setToken(data.access_token)
    setCustomer(data.customer)
  }, [])

  const login = useCallback(
    async (mobileNumber, password) => {
      const { data } = await axiosClient.post('/api/auth/login', {
        mobile_number: mobileNumber,
        password,
      })

      saveSession(data)
      return data
    },
    [saveSession]
  )

  const sendOtp = useCallback(async (mobileNumber) => {
    const { data } = await axiosClient.post('/api/auth/send-otp', {
      mobile_number: mobileNumber,
    })

    return data
  }, [])

  const verifyOtp = useCallback(
    async (mobileNumber, otp) => {
      const { data } = await axiosClient.post(
        '/api/auth/verify-otp',
        {
          mobile_number: mobileNumber,
          otp,
        }
      )

      saveSession(data)
      return data
    },
    [saveSession]
  )

  const register = useCallback(async (payload) => {
    const { data } = await axiosClient.post(
      '/api/auth/register',
      payload
    )

    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(CUSTOMER_KEY)
    clearApiCache()

    setToken(null)
    setCustomer(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data } = await axiosClient.get('/api/auth/profile')

    localStorage.setItem(
      CUSTOMER_KEY,
      JSON.stringify(data)
    )

    setCustomer(data)
    return data
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const { data } = await axiosClient.put('/api/auth/profile', payload)
    
    localStorage.setItem(
      CUSTOMER_KEY,
      JSON.stringify(data)
    )

    setCustomer(data)
    return data
  }, [])

  const value = useMemo(
    () => ({
      customer,
      token,
      isAuthenticated: Boolean(token),
      login,
      sendOtp,
      verifyOtp,
      register,
      logout,
      refreshProfile,
      updateProfile,
      saveSession,
    }),
    [
      customer,
      token,
      login,
      sendOtp,
      verifyOtp,
      register,
      logout,
      refreshProfile,
      updateProfile,
      saveSession,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    )
  }

  return context
}