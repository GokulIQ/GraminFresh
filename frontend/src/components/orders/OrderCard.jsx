import React, { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiPackage, 
  FiClock, 
  FiCheckCircle, 
  FiTruck, 
  FiXCircle, 
  FiDownload, 
  FiRefreshCw, 
  FiChevronRight
} from 'react-icons/fi'
import { getProductImageUrl } from '../../utils/imageUrl'

function OrderCard({
  order,
  isReordering,
  onReorder,
  onCancel,
  onInvoice
}) {
  const navigate = useNavigate()

  const isPending = (order.order_status || '').toLowerCase() === 'pending'
  const isDelivered = (order.order_status || '').toLowerCase() === 'delivered'

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

  return (
    <div 
      className="order-card glass-panel interactive"
      onClick={() => navigate(`/my-orders/${order.order_id}`)}
    >
      <div className="order-card-header">
        <div className="order-id-group">
          <span className="order-id-label">ORDER ID</span>
          <strong className="order-id-code">#{order.order_id}</strong>
          <span className="order-placed-date">
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        <div className="order-header-right">
          <div className={`order-status-pill ${getStatusBadgeClass(order.order_status)}`}>
            {getStatusIcon(order.order_status)}
            <span>{order.order_status}</span>
          </div>
        </div>
      </div>

      <div className="order-card-body">
        <div className="order-items-grid">
          {order.items?.map((item) => {
            const product = item.product || {}
            return (
              <div key={item.id} className="order-item-row">
                <div className="order-item-thumb">
                  <img 
                    src={getProductImageUrl(product.product_image, '/placeholder-produce.png')} 
                    alt={product.product_name || 'Item'}
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=120&auto=format&fit=crop&q=60'
                    }}
                  />
                </div>
                <div className="order-item-meta">
                  <span className="order-item-name">{product.product_name || 'Farm Product'}</span>
                  <span className="order-item-details">
                    Qty: <strong>{item.quantity}</strong> {product.unit ? `(${product.unit})` : ''} • ₹{Number(item.price).toFixed(2)} each
                  </span>
                </div>
                <div className="order-item-subtotal">
                  ₹{(Number(item.price) * item.quantity).toFixed(2)}
                </div>
              </div>
            )
          })}
        </div>

        <div className="order-info-footer-chips">
          <div className="meta-chip">
            <span className="meta-chip-label">Payment:</span>
            <strong className="meta-chip-val">
              {order.payment_method === 'ONLINE' ? 'Online / UPI' : 'Cash on Delivery (COD)'}
            </strong>
          </div>

          <div className="meta-chip">
            <span className="meta-chip-label">Items:</span>
            <strong className="meta-chip-val">
              {order.items?.reduce((sum, it) => sum + it.quantity, 0) || order.items?.length || 0} Units
            </strong>
          </div>
        </div>
      </div>

      <div className="order-card-footer" onClick={(e) => e.stopPropagation()}>
        <div className="order-total-group">
          <span className="total-label">Total Amount</span>
          <strong className="total-val">₹{Number(order.total_amount).toFixed(2)}</strong>
        </div>

        <div className="order-card-actions">
          <div className="order-card-actions-secondary">
            <button
              type="button"
              className="card-action-btn secondary"
              onClick={(e) => {
                e.stopPropagation()
                onInvoice(order)
              }}
              title="Download Invoice"
            >
              <FiDownload />
              <span>Invoice</span>
            </button>

            {isPending && (
              <button
                type="button"
                className="card-action-btn danger"
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel(order)
                }}
                title="Cancel Order"
              >
                <FiXCircle />
                <span>Cancel</span>
              </button>
            )}

            <button
              type="button"
              className="card-action-btn reorder"
              onClick={(e) => onReorder(order, e)}
              disabled={isReordering}
              title="Reorder items"
            >
              <FiRefreshCw className={isReordering ? 'spin-icon' : ''} />
              <span>{isReordering ? 'Adding...' : 'Reorder'}</span>
            </button>
          </div>

          <button
            type="button"
            className="card-action-btn primary track-btn"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/my-orders/${order.order_id}`)
            }}
            title="View order details and track delivery"
          >
            <span>Track</span>
            <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(OrderCard, (prevProps, nextProps) => {
  return (
    prevProps.order.order_id === nextProps.order.order_id &&
    prevProps.order.order_status === nextProps.order.order_status &&
    prevProps.isReordering === nextProps.isReordering
  )
})
