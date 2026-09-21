import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiPackage, 
  FiClock, 
  FiCheckCircle, 
  FiTruck, 
  FiXCircle, 
  FiDownload, 
  FiRefreshCw, 
  FiChevronRight, 
  FiSearch,
  FiFilter,
  FiShoppingBag,
  FiFileText
} from 'react-icons/fi'
import { getOrders, cancelOrder, reorderItems } from '../api/orderApi'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import toast from 'react-hot-toast'
import CustomerHeader from '../components/catalog/CustomerHeader'
import MobileFooter from '../components/catalog/MobileFooter'
import CancelOrderModal from '../components/orders/CancelOrderModal'
import InvoiceModal from '../components/orders/InvoiceModal'
import OrderCard from '../components/orders/OrderCard'

export default function Orders() {
  const navigate = useNavigate()
  const { customer, logout } = useAuth()
  const { refreshCart } = useCart()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState(null)
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [reorderingOrderId, setReorderingOrderId] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      const data = await getOrders()
      setOrders(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load your orders')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (reason) => {
    if (!selectedOrderForCancel) return
    try {
      setIsCancelling(true)
      await cancelOrder(selectedOrderForCancel.order_id, reason)
      toast.success('Order cancelled successfully')
      setSelectedOrderForCancel(null)
      fetchOrders()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to cancel order'
      toast.error(msg)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleReorder = async (order, e) => {
    if (e) e.stopPropagation()
    try {
      setReorderingOrderId(order.order_id)
      const res = await reorderItems(order.order_id)
      toast.success(res.message || 'Items added to cart!')
      await refreshCart()
      navigate('/cart')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to reorder items'
      toast.error(msg)
    } finally {
      setReorderingOrderId(null)
    }
  }

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'pending') return 'status-pending'
    if (s === 'confirmed') return 'status-confirmed'
    if (s === 'preparing' || s === 'processing') return 'status-preparing'
    if (s === 'out for delivery') return 'status-delivery'
    if (s === 'delivered') return 'status-delivered'
    if (s === 'cancelled') return 'status-cancelled'
    return 'status-pending'
  }

  const getStatusIcon = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'pending') return <FiClock className="status-badge-icon" />
    if (s === 'confirmed') return <FiCheckCircle className="status-badge-icon" />
    if (s === 'preparing' || s === 'processing') return <FiPackage className="status-badge-icon" />
    if (s === 'out for delivery') return <FiTruck className="status-badge-icon" />
    if (s === 'delivered') return <FiCheckCircle className="status-badge-icon" />
    if (s === 'cancelled') return <FiXCircle className="status-badge-icon" />
    return <FiClock className="status-badge-icon" />
  }

  // Filter orders based on status & search query
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filtering
      const st = (order.order_status || '').toLowerCase()
      if (statusFilter === 'ACTIVE') {
        if (st === 'delivered' || st === 'cancelled') return false
      } else if (statusFilter === 'DELIVERED') {
        if (st !== 'delivered') return false
      } else if (statusFilter === 'CANCELLED') {
        if (st !== 'cancelled') return false
      }

      // Search filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = (order.order_id || '').toLowerCase().includes(q)
        const matchProduct = order.items?.some(item => 
          (item.product?.product_name || '').toLowerCase().includes(q)
        )
        if (!matchId && !matchProduct) return false
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  return (
    <div className="mobile-shopping-shell">
      <CustomerHeader customer={customer} onLogout={logout} />

      <div className="inner-page-content orders-page" style={{ paddingBottom: '90px' }}>
        {/* Page Title Header */}
        <div className="orders-page-header">
          <div className="orders-title-group">
            <h2>My Orders</h2>
            <p className="orders-page-subtitle">
              Track fulfillment progress and manage all your farm deliveries
            </p>
          </div>

          {orders.length > 0 && (
            <div className="orders-stats-chip">
              <FiShoppingBag />
              <span><strong>{orders.length}</strong> Total Orders</span>
            </div>
          )}
        </div>

        {/* Filter Tabs & Search Bar */}
        {orders.length > 0 && (
          <div className="orders-controls-bar glass-panel">
            <div className="orders-filter-tabs">
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                All Orders ({orders.length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ACTIVE')}
              >
                In Progress ({orders.filter(o => !['delivered', 'cancelled'].includes(o.order_status?.toLowerCase())).length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'DELIVERED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('DELIVERED')}
              >
                Delivered ({orders.filter(o => o.order_status?.toLowerCase() === 'delivered').length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'CANCELLED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CANCELLED')}
              >
                Cancelled ({orders.filter(o => o.order_status?.toLowerCase() === 'cancelled').length})
              </button>
            </div>

            <div className="orders-search-input-wrap">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by Order ID or Product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="clear-search-btn" 
                  onClick={() => setSearchQuery('')}
                >
                  <FiXCircle />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Orders Content Area */}
        {loading ? (
          <div className="orders-loading">
            <div className="loading-spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-orders glass-panel">
            <div className="empty-icon-wrapper">
              <FiShoppingBag />
            </div>
            <h3>No Orders Yet</h3>
            <p>You haven't placed any orders yet. Fresh organic farm produce and village groceries are waiting for you!</p>
            <button
              type="button"
              className="empty-action-btn primary"
              onClick={() => navigate('/customer/dashboard')}
            >
              Start Shopping Now
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-filter-orders glass-panel">
            <div className="empty-icon-wrapper small">
              <FiFilter />
            </div>
            <h3>No Orders Match Filter</h3>
            <p>No orders found matching your search or selected tab criteria.</p>
            <button
              type="button"
              className="empty-action-btn secondary"
              onClick={() => {
                setStatusFilter('ALL')
                setSearchQuery('')
              }}
            >
              <FiRefreshCw />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map(order => {
              const isReordering = reorderingOrderId === order.order_id

              return (
                <OrderCard
                  key={order.order_id}
                  order={order}
                  isReordering={isReordering}
                  onReorder={handleReorder}
                  onCancel={setSelectedOrderForCancel}
                  onInvoice={setSelectedOrderForInvoice}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CancelOrderModal 
        isOpen={Boolean(selectedOrderForCancel)}
        onClose={() => setSelectedOrderForCancel(null)}
        onConfirm={handleCancelOrder}
        orderId={selectedOrderForCancel?.order_id}
        isLoading={isCancelling}
      />

      <InvoiceModal 
        isOpen={Boolean(selectedOrderForInvoice)}
        onClose={() => setSelectedOrderForInvoice(null)}
        order={selectedOrderForInvoice}
      />

      <MobileFooter />
    </div>
  )
}
