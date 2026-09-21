import { createContext, useContext, useState, useEffect } from 'react'
import { adminApi } from '../api/adminApi'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('vfd_admin_user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('vfd_admin_token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyAdmin = async () => {
      const storedToken = localStorage.getItem('vfd_admin_token')
      if (storedToken) {
        try {
          const res = await adminApi.getMe()
          setAdmin(res.data)
          localStorage.setItem('vfd_admin_user', JSON.stringify(res.data))
        } catch (err) {
          console.error('Admin session validation failed:', err)
          localStorage.removeItem('vfd_admin_token')
          localStorage.removeItem('vfd_admin_user')
          setAdmin(null)
          setToken(null)
        }
      }
      setLoading(false)
    }

    verifyAdmin()
  }, [])

  const login = async (email, password) => {
    const res = await adminApi.login({ email, password })
    const { access_token, admin: adminData } = res.data
    localStorage.setItem('vfd_admin_token', access_token)
    localStorage.setItem('vfd_admin_user', JSON.stringify(adminData))
    setToken(access_token)
    setAdmin(adminData)
    return adminData
  }

  const logout = async () => {
    try {
      await adminApi.logout()
    } catch (e) {
      console.warn('Logout notification failed:', e)
    } finally {
      localStorage.removeItem('vfd_admin_token')
      localStorage.removeItem('vfd_admin_user')
      setToken(null)
      setAdmin(null)
    }
  }

  const updateAdminState = (updatedData) => {
    setAdmin(updatedData)
    localStorage.setItem('vfd_admin_user', JSON.stringify(updatedData))
  }

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        loading,
        login,
        logout,
        updateAdminState,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
