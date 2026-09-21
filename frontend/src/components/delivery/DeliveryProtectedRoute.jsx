import { Navigate, useLocation } from 'react-router-dom'
import { useDeliveryAuth } from '../../context/DeliveryAuthContext'

export default function DeliveryProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useDeliveryAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f8f3]">
        <div className="w-12 h-12 border-4 border-[#2e7d32] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-[#203524] tracking-wide animate-pulse">
          Loading GraminFresh Logistics...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/delivery/login" state={{ from: location }} replace />
  }

  return children
}
