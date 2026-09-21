import { createContext, useContext, useState, useEffect } from 'react'
import { deliveryApi } from '../api/deliveryApi'

const DeliveryAuthContext = createContext(null)

export function DeliveryAuthProvider({ children }) {
  const [partner, setPartner] = useState(() => {
    const saved = localStorage.getItem('vfd_delivery_partner')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('vfd_delivery_token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyPartnerSession = async () => {
      const storedToken = localStorage.getItem('vfd_delivery_token')
      if (storedToken) {
        try {
          const res = await deliveryApi.getProfile()
          setPartner(res.data)
          localStorage.setItem('vfd_delivery_partner', JSON.stringify(res.data))
        } catch (err) {
          console.error('Delivery partner session verification failed:', err)
          localStorage.removeItem('vfd_delivery_token')
          localStorage.removeItem('vfd_delivery_partner')
          setPartner(null)
          setToken(null)
        }
      }
      setLoading(false)
    }

    verifyPartnerSession()
  }, [])

  const login = async (username, password) => {
    const res = await deliveryApi.login(username, password)
    const { access_token, partner: partnerData } = res.data
    localStorage.setItem('vfd_delivery_token', access_token)
    localStorage.setItem('vfd_delivery_partner', JSON.stringify(partnerData))
    setToken(access_token)
    setPartner(partnerData)
    return partnerData
  }

  const logout = () => {
    localStorage.removeItem('vfd_delivery_token')
    localStorage.removeItem('vfd_delivery_partner')
    setToken(null)
    setPartner(null)
  }

  const updatePartnerState = (updatedData) => {
    setPartner(updatedData)
    localStorage.setItem('vfd_delivery_partner', JSON.stringify(updatedData))
  }

  return (
    <DeliveryAuthContext.Provider
      value={{
        partner,
        token,
        isAuthenticated: !!token && !!partner,
        loading,
        login,
        logout,
        updatePartnerState,
      }}
    >
      {children}
    </DeliveryAuthContext.Provider>
  )
}

export function useDeliveryAuth() {
  const context = useContext(DeliveryAuthContext)
  if (!context) {
    throw new Error('useDeliveryAuth must be used within a DeliveryAuthProvider')
  }
  return context
}
