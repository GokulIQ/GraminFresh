import adminAxiosClient from './adminAxiosClient'

export const adminApi = {
  // Auth & Profile
  login: (data) => adminAxiosClient.post('/api/admin/auth/login', data),
  getMe: () => adminAxiosClient.get('/api/admin/auth/me'),
  updateProfile: (data) => adminAxiosClient.put('/api/admin/auth/profile', data),
  changePassword: (data) => adminAxiosClient.put('/api/admin/auth/change-password', data),
  logout: () => adminAxiosClient.post('/api/admin/auth/logout'),
  getActivity: (limit = 20) => adminAxiosClient.get('/api/admin/auth/activity', { params: { limit } }),

  // Dashboard
  getDashboardSummary: () => adminAxiosClient.get('/api/admin/dashboard/summary'),

  // Categories
  getCategories: (params) => adminAxiosClient.get('/api/admin/categories', { params }),
  getCategory: (id) => adminAxiosClient.get(`/api/admin/categories/${id}`),
  createCategory: (data) => adminAxiosClient.post('/api/admin/categories', data),
  updateCategory: (id, data) => adminAxiosClient.put(`/api/admin/categories/${id}`, data),
  toggleCategoryStatus: (id) => adminAxiosClient.patch(`/api/admin/categories/${id}/status`),
  deleteCategory: (id) => adminAxiosClient.delete(`/api/admin/categories/${id}`),

  // Products
  getProducts: (params) => adminAxiosClient.get('/api/admin/products', { params }),
  getProduct: (id) => adminAxiosClient.get(`/api/admin/products/${id}`),
  createProduct: (data) => adminAxiosClient.post('/api/admin/products', data),
  updateProduct: (id, data) => adminAxiosClient.put(`/api/admin/products/${id}`, data),
  updateStock: (id, stock) => adminAxiosClient.patch(`/api/admin/products/${id}/stock`, null, { params: { stock } }),
  toggleProductStatus: (id) => adminAxiosClient.patch(`/api/admin/products/${id}/status`),
  bulkUpdateStock: (updates) => adminAxiosClient.post('/api/admin/products/bulk/stock', { updates }),
  bulkUpdateStatus: (product_ids, status) => adminAxiosClient.post('/api/admin/products/bulk/status', { product_ids, status }),
  deleteProduct: (id) => adminAxiosClient.delete(`/api/admin/products/${id}`),

  // Customers
  getCustomers: (params) => adminAxiosClient.get('/api/admin/customers', { params }),
  getCustomer: (id) => adminAxiosClient.get(`/api/admin/customers/${id}`),
  updateCustomerStatus: (id, status) => adminAxiosClient.patch(`/api/admin/customers/${id}/status`, { status }),

  // Orders
  getOrders: (params) => adminAxiosClient.get('/api/admin/orders', { params }),
  getOrder: (orderId) => adminAxiosClient.get(`/api/admin/orders/${orderId}`),
  updateOrderStatus: (orderId, data) => adminAxiosClient.patch(`/api/admin/orders/${orderId}/status`, data),
  updateOrderPayment: (orderId, data) => adminAxiosClient.patch(`/api/admin/orders/${orderId}/payment`, data),
  assignDeliveryPartner: (orderId, data) => adminAxiosClient.patch(`/api/admin/orders/${orderId}/assign-delivery`, data),
  getOrderInvoice: (orderId) => adminAxiosClient.get(`/api/admin/orders/${orderId}/invoice`),

  // Delivery
  getDeliveryPartners: (params) => adminAxiosClient.get('/api/admin/delivery/partners', { params }),
  getDeliveryPartner: (id) => adminAxiosClient.get(`/api/admin/delivery/partners/${id}`),
  createDeliveryPartner: (data) => adminAxiosClient.post('/api/admin/delivery/partners', data),
  updateDeliveryPartner: (id, data) => adminAxiosClient.put(`/api/admin/delivery/partners/${id}`, data),
  toggleDeliveryPartnerStatus: (id) => adminAxiosClient.patch(`/api/admin/delivery/partners/${id}/status`),
  getDeliveryAssignments: (limit = 20) => adminAxiosClient.get('/api/admin/delivery/assignments', { params: { limit } }),
  getDeliveryPartnerOrders: (id) => adminAxiosClient.get(`/api/delivery-partners/${id}/orders`),

  // Reports & Analytics
  getSalesReport: (period = '30d') => adminAxiosClient.get('/api/admin/reports/sales', { params: { period } }),
  getExportOrdersUrl: () => `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/reports/export/orders.csv`,
  getExportProductsUrl: () => `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/reports/export/products.csv`,
  getExportCustomersUrl: () => `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/reports/export/customers.csv`,

  // Settings & Logs & Notifications
  getSettings: (category) => adminAxiosClient.get('/api/admin/settings', { params: { category } }),
  updateSettings: (settings) => adminAxiosClient.put('/api/admin/settings', { settings }),
  getSystemLogs: (params) => adminAxiosClient.get('/api/admin/settings/logs', { params }),
  getNotifications: (params) => adminAxiosClient.get('/api/admin/settings/notifications', { params }),
  markNotificationRead: (id) => adminAxiosClient.patch(`/api/admin/settings/notifications/${id}/read`),
  markAllNotificationsRead: () => adminAxiosClient.post('/api/admin/settings/notifications/read-all'),

  // Uploads
  uploadImage: (image_data, filename = 'image.jpg') => adminAxiosClient.post('/api/admin/uploads/image', { image_data, filename }),
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

export default adminApi

