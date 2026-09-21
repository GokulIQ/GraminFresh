import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FiArrowLeft, 
  FiPackage, 
  FiCalendar, 
  FiMapPin, 
  FiCreditCard, 
  FiRefreshCw, 
  FiXCircle, 
  FiDownload, 
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiAlertCircle
} from 'react-icons/fi'
import { getOrderDetails, trackOrder, cancelOrder, reorderItems } from '../api/orderApi'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import toast from 'react-hot-toast'
import CustomerHeader from '../components/catalog/CustomerHeader'
import MobileFooter from '../components/catalog/MobileFooter'
import OrderTrackingTimeline from '../components/orders/OrderTrackingTimeline'
import CancelOrderModal from '../components/orders/CancelOrderModal'
import InvoiceModal from '../components/orders/InvoiceModal'
import { getProductImageUrl } from '../utils/imageUrl'

export default function OrderDetails() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { customer, logout } = useAuth()
  const { refreshCart } = useCart()

  const [order, setOrder] = useState(null)
  const [trackingData, setTrackingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchData()
  }, [orderId])

  async function fetchData() {
    try {
      setLoading(true)
      const [orderRes, trackRes] = await Promise.all([
        getOrderDetails(orderId),
        trackOrder(orderId).catch(() => null)
      ])
      setOrder(orderRes)
      setTrackingData(trackRes)
    } catch (err) {
      console.error('Failed to load order details:', err)
      toast.error('Could not load order details')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (reason) => {
    try {
      setIsCancelling(true)
      const updatedOrder = await cancelOrder(orderId, reason)
      toast.success('Order cancelled successfully')
      setOrder(updatedOrder)
      setShowCancelModal(false)
      // Refresh tracking
      const trackRes = await trackOrder(orderId).catch(() => null)
      if (trackRes) setTrackingData(trackRes)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to cancel order'
      toast.error(msg)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleReorder = async () => {
    try {
      setIsReordering(true)
      const res = await reorderItems(orderId)
      toast.success(res.message || 'Items added to your cart!')
      await refreshCart()
      navigate('/cart')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to reorder items'
      toast.error(msg)
    } finally {
      setIsReordering(false)
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
    if (s === 'pending') return <FiClock />
    if (s === 'confirmed') return <FiCheckCircle />
    if (s === 'preparing' || s === 'processing') return <FiPackage />
    if (s === 'out for delivery') return <FiTruck />
    if (s === 'delivered') return <FiCheckCircle />
    if (s === 'cancelled') return <FiXCircle />
    return <FiClock />
  }

  const isPending = (order?.order_status || '').toLowerCase() === 'pending'
  const isCancelled = (order?.order_status || '').toLowerCase() === 'cancelled'
  const isDelivered = (order?.order_status || '').toLowerCase() === 'delivered'

  const subtotal = order?.items?.reduce((acc, item) => {
    return acc + Number(item.price) * item.quantity
  }, 0) || Number(order?.total_amount || 0)

  const deliveryCharge = Number(order?.delivery_charge || 0)
  const grandTotal = Number(order?.total_amount || 0)

  return (
    <div className="mobile-shopping-shell">
      <CustomerHeader customer={customer} onLogout={logout} />

      <div className="inner-page-content order-details-page" style={{ paddingBottom: '90px' }}>
        {/* Navigation & Header */}
        <div className="order-details-top-bar">
          <button 
            type="button" 
            className="back-link-btn" 
            onClick={() => navigate('/my-orders')}
          >
            <FiArrowLeft /> Back to My Orders
          </button>
        </div>

        {loading ? (
          <div className="orders-loading">
            <div className="loading-spinner"></div>
            <p>Loading order details & tracking...</p>
          </div>
        ) : !order ? (
          <div className="empty-orders glass-panel">
            <div className="empty-icon-wrapper">
              <FiAlertCircle />
            </div>
            <h3>Order Not Found</h3>
            <p>We couldn't find the details for this order. It might have been removed.</p>
            <button className="empty-action-btn primary" onClick={() => navigate('/my-orders')}>
              Go to Orders
            </button>
          </div>
        ) : (
          <div className="order-details-layout">
            {/* Header Summary Card */}
            <section className="order-header-card glass-panel">
              <div className="order-header-primary">
                <div className="order-id-meta">
                  <span className="order-eyebrow-text">ORDER DETAILS</span>
                  <h2>#{order.order_id}</h2>
                  <div className="order-datetime-tag">
                    <FiCalendar />
                    <span>
                      Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {order.expected_delivery_date && (
                    <div className="order-datetime-tag" style={{ marginTop: '4px', color: '#15803d', background: '#eaf3eb', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <FiClock />
                      <span style={{ fontWeight: 'bold' }}>
                        Expected Delivery: {new Date(order.expected_delivery_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className={`order-status-pill ${getStatusBadgeClass(order.order_status)}`}>
                  {getStatusIcon(order.order_status)}
                  <span>{order.order_status}</span>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="order-header-actions-row">
                <button
                  type="button"
                  className="order-btn-outline"
                  onClick={() => setShowInvoiceModal(true)}
                >
                  <FiDownload /> Download Invoice
                </button>

                {isPending && (
                  <button
                    type="button"
                    className="order-btn-danger"
                    onClick={() => setShowCancelModal(true)}
                    disabled={isCancelling}
                  >
                    <FiXCircle /> Cancel Order
                  </button>
                )}

                <button
                  type="button"
                  className="order-btn-reorder"
                  onClick={handleReorder}
                  disabled={isReordering}
                >
                  <FiRefreshCw className={isReordering ? 'spin-icon' : ''} /> 
                  {isReordering ? 'Adding...' : 'Reorder Items'}
                </button>
              </div>
            </section>

            {/* Order Tracking Timeline Section */}
            <section className="order-section-card glass-panel">
              <div className="section-card-title">
                <FiTruck />
                <h3>Order Tracking Timeline</h3>
              </div>

              <OrderTrackingTimeline 
                timeline={trackingData?.timeline || []} 
                orderStatus={order.order_status}
                createdAt={order.created_at}
                expectedDeliveryDate={trackingData?.expected_delivery_date || order.expected_delivery_date}
              />
            </section>

            {/* Products & Items Breakdown */}
            <section className="order-section-card glass-panel">
              <div className="section-card-title">
                <FiPackage />
                <h3>Items in this Order ({order.items?.length || 0})</h3>
              </div>

              <div className="ordered-items-list">
                {order.items?.map((item) => {
                  const product = item.product || {}
                  const itemTotal = Number(item.price) * item.quantity
                  return (
                    <div key={item.id} className="ordered-item-card">
                      <div className="ordered-item-thumb">
                        <img 
                          src={getProductImageUrl(product.product_image, '/placeholder-produce.png')} 
                          alt={product.product_name || 'Farm produce'}
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=150&auto=format&fit=crop&q=60'
                          }}
                        />
                      </div>

                      <div className="ordered-item-info">
                        <h4>{product.product_name || 'Product'}</h4>
                        <div className="ordered-item-unit-badge">
                          {product.unit || 'Pack'}
                        </div>
                        <div className="ordered-item-price-calc">
                          <span>₹{Number(item.price).toFixed(2)} × {item.quantity}</span>
                        </div>
                      </div>

                      <div className="ordered-item-total">
                        <strong>₹{itemTotal.toFixed(2)}</strong>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Delivery Address & Payment / Bill Summary Grid */}
            <div className="order-details-dual-grid">
              {/* Delivery Address Card */}
              <section className="order-section-card glass-panel">
                <div className="section-card-title">
                  <FiMapPin />
                  <h3>Delivery Address</h3>
                </div>

                {order.delivery_address ? (
                  <div className="delivery-address-box">
                    <strong className="receiver-name">
                      {order.delivery_address.full_name}
                    </strong>
                    <p className="address-line">{order.delivery_address.address}</p>
                    {order.delivery_address.landmark && (
                      <p className="landmark-line">
                        <span>Landmark:</span> {order.delivery_address.landmark}
                      </p>
                    )}
                    <p className="village-district-line">
                      {order.delivery_address.village}, {order.delivery_address.district}
                    </p>
                    <p className="state-pin-line">
                      {order.delivery_address.state} - {order.delivery_address.pincode}
                    </p>
                    <div className="phone-contact-badge">
                      <span>Phone:</span> <strong>{order.delivery_address.mobile_number}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="no-address-text">No delivery address recorded.</p>
                )}
              </section>

              {/* Bill & Payment Summary */}
              <section className="order-section-card glass-panel">
                <div className="section-card-title">
                  <FiCreditCard />
                  <h3>Payment & Bill Summary</h3>
                </div>

                <div className="bill-summary-list">
                  <div className="bill-row">
                    <span>Payment Method</span>
                    <strong className="payment-tag">
                      {order.payment_method === 'ONLINE' ? 'Online Payment / UPI' : 'Cash on Delivery (COD)'}
                    </strong>
                  </div>
                  <div className="bill-row">
                    <span>Payment Status</span>
                    <span className="payment-status-text">
                      {isDelivered || order.payment_method === 'ONLINE' ? 'Paid / Completed' : 'Pay on Delivery'}
                    </span>
                  </div>

                  <hr className="bill-divider" />

                  <div className="bill-row">
                    <span>Items Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="bill-row">
                    <span>Delivery Charge</span>
                    <span>{deliveryCharge === 0 ? <strong style={{ color: '#15803d' }}>FREE</strong> : `₹${deliveryCharge.toFixed(2)}`}</span>
                  </div>

                  <hr className="bill-divider" />

                  <div className="bill-row grand-total">
                    <strong>Grand Total</strong>
                    <strong className="grand-total-amount">₹{grandTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CancelOrderModal 
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelOrder}
        orderId={order?.order_id}
        isLoading={isCancelling}
      />

      <InvoiceModal 
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        order={order}
      />

      <MobileFooter />
    </div>
  )
}
