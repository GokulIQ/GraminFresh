import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import CustomerHeader from '../components/catalog/CustomerHeader'
import MobileFooter from '../components/catalog/MobileFooter'

export default function OrderConfirmation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { customer, logout } = useAuth()
  const order = location.state?.order

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!order) {
      navigate('/customer/dashboard', { replace: true })
    }
  }, [order, navigate])

  if (!order) {
    return null; 
  }

  const paymentLabel = order.payment_method === 'ONLINE' ? 'Online Payment' : 'Cash on Delivery'

  return (
    <main className="mobile-shopping-shell">
      <CustomerHeader customer={customer} onLogout={logout} />

      <div className="inner-page-content" style={{ paddingBottom: '80px' }}>
        <section className="order-confirmation glass-panel">
          <div className="order-success-icon">✓</div>
          <p className="order-eyebrow">ORDER PLACED SUCCESSFULLY</p>
          <h1>Thank you for choosing GraminFresh</h1>
          <p>Your fresh products will be prepared for delivery shortly.</p>
          <div className="order-id-card">
            <span>ORDER ID</span>
            <strong>{order.order_id}</strong>
          </div>
          <div className="order-confirmation-details">
            <p><span>Order Date</span><strong style={{ textAlign: 'right' }}>{new Date(order.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</strong></p>
            <p><span>Payment</span><strong>{paymentLabel}</strong></p>
            <p><span>Status</span><strong>{order.order_status}</strong></p>
            <p><span>Total</span><strong>₹{Number(order.total_amount).toFixed(2)}</strong></p>
            {order.delivery_address && (
              <div className="delivery-address-summary">
                <p><span>Deliver to:</span></p>
                <address>
                  <strong>{order.delivery_address.full_name}</strong><br />
                  {order.delivery_address.address}, {order.delivery_address.landmark}<br />
                  {order.delivery_address.village}, {order.delivery_address.district}<br />
                  {order.delivery_address.state} - {order.delivery_address.pincode}
                </address>
              </div>
            )}
          </div>
          <div className="order-confirmation-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <button 
              type="button" 
              className="place-order-button" 
              onClick={() => navigate(`/my-orders/${order.order_id}`)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              Track This Order
            </button>
            <button 
              type="button" 
              className="place-order-button" 
              onClick={() => navigate('/my-orders')} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.7)', 
                color: '#285d33', 
                border: '1px solid rgba(40, 93, 51, 0.3)',
                boxShadow: 'none'
              }}
            >
              View All Orders
            </button>
            <button 
              type="button" 
              className="place-order-button" 
              onClick={() => navigate('/customer/dashboard')}
              style={{ 
                background: 'transparent', 
                color: '#4b5563', 
                boxShadow: 'none',
                border: 'none'
              }}
            >
              Continue Shopping
            </button>
          </div>
        </section>
      </div>
      <MobileFooter />
    </main>
  )
}
