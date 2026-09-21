import deliveryAxiosClient from './deliveryAxiosClient'

export const deliveryApi = {
  // Authentication & Profile
  login: (username, password) => deliveryAxiosClient.post('/api/delivery/login', { username, password }),
  getProfile: () => deliveryAxiosClient.get('/api/delivery/profile'),
  updateProfile: (data) => deliveryAxiosClient.put('/api/delivery/profile', data),
  
  // Dashboard & Metrics
  getDashboardStats: () => deliveryAxiosClient.get('/api/delivery/dashboard/stats'),
  
  // Assigned Deliveries
  getAssignedOrders: () => deliveryAxiosClient.get('/api/delivery/assignments'),
  getDeliveryHistory: () => deliveryAxiosClient.get('/api/delivery/history'),
  updateDeliveryStatus: (assignmentId, status, notes) => 
    deliveryAxiosClient.patch(`/api/delivery-assignments/${assignmentId}/status`, { status, notes })
}

export const extractErrorMessage = (err, fallback = 'Operation failed') => {
  if (!err) return fallback
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ')
  }
  if (typeof detail === 'object' && detail !== null) {
    return Object.values(detail).flat().join(', ') || JSON.stringify(detail)
  }
  return err.message || fallback
}

export default deliveryApi
