import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';
import { getAddresses, addAddress, deleteAddress, setDefaultAddress } from '../api/addressApi';
import { getCartItems, clearCart as clearCartApi } from '../api/cartApi';
import { placeOrder } from '../api/orderApi';
import { getDisplayUnit, getPackPrice } from '../utils/productUnits';
import CustomerHeader from '../components/catalog/CustomerHeader';
import MobileFooter from '../components/catalog/MobileFooter';

export default function Checkout() {
  const navigate = useNavigate();
  const { customer, logout } = useAuth();
  const { refreshCart } = useCart();
  
  const [addresses, setAddresses] = useState([]);
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: customer?.full_name || '',
    mobile_number: customer?.mobile_number || '',
    address: '',
    village: customer?.village || '',
    district: '',
    state: '',
    pincode: '',
    landmark: '',
    is_default: false
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!customer) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    loadData();
  }, [customer, navigate]);

  async function loadData() {
    setLoading(true);
    try {
      const [addressData, cartData] = await Promise.all([
        getAddresses(),
        getCartItems()
      ]);
      
      setAddresses(addressData);
      setCart(cartData);
      
      if (addressData.length > 0) {
        const defaultAddr = addressData.find(a => a.is_default);
        setSelectedAddressId(defaultAddr ? defaultAddr.id : addressData[0].id);
      } else {
        setShowAddressForm(true);
      }
      
      if (!cartData?.items?.length) {
        toast.error("Your cart is empty");
        navigate("/cart");
      }
    } catch (err) {
      toast.error('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  }

  function handleAddressChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleAddressSubmit(e) {
    e.preventDefault();
    try {
      const newAddress = await addAddress(formData);
      setAddresses([newAddress, ...addresses]);
      setSelectedAddressId(newAddress.id);
      setShowAddressForm(false);
      toast.success("Address added successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add address');
    }
  }

  async function handleDeleteAddress(id) {
    if(!window.confirm("Delete this address?")) return;
    try {
      await deleteAddress(id);
      setAddresses(addresses.filter(a => a.id !== id));
      if (selectedAddressId === id) setSelectedAddressId(null);
      toast.success("Address deleted");
    } catch(err) {
      toast.error("Failed to delete address");
    }
  }

  async function handleSetDefault(id) {
    try {
      await setDefaultAddress(id);
      const updated = await getAddresses();
      setAddresses(updated);
      setSelectedAddressId(id);
      toast.success("Default address updated");
    } catch(err) {
      toast.error("Failed to set default address");
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }
    
    setPlacingOrder(true);
    try {
      const orderData = {
        address_id: selectedAddressId,
        payment_method: paymentMethod
      };
      const order = await placeOrder(orderData);
      await refreshCart();
      
      // Navigate to confirmation with order details
      navigate('/checkout/confirm', { replace: true, state: { order } });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to place your order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  }

  if (loading) {
    return (
      <div className="mobile-shopping-shell">
        <div className="inner-page-content">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mobile-shopping-shell">
      <CustomerHeader customer={customer} onLogout={logout} />

      <div className="inner-page-content" style={{ paddingBottom: '80px' }}>
        
        {/* ADDRESS MODULE */}
        <section className="checkout-section glass-panel">
          <h2>Delivery Address</h2>
          
          {addresses.length > 0 && !showAddressForm && (
            <div className="address-list">
              {addresses.map(addr => (
                <div key={addr.id} className={`address-card ${selectedAddressId === addr.id ? 'selected' : ''}`} onClick={() => setSelectedAddressId(addr.id)}>
                  <div className="address-card-header">
                    <input type="radio" checked={selectedAddressId === addr.id} readOnly />
                    <strong>{addr.full_name}</strong>
                    {addr.is_default && <span className="badge">Default</span>}
                  </div>
                  <p>{addr.address}, {addr.landmark ? addr.landmark + ', ' : ''}</p>
                  <p>{addr.village}, {addr.district}</p>
                  <p>{addr.state} - {addr.pincode}</p>
                  <p>Mo: {addr.mobile_number}</p>
                  
                  <div className="address-card-actions">
                    {!addr.is_default && (
                      <button type="button" className="text-button" onClick={(e) => { e.stopPropagation(); handleSetDefault(addr.id); }}>Set Default</button>
                    )}
                    <button type="button" className="text-button danger" onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id); }}>Delete</button>
                  </div>
                </div>
              ))}
              <button type="button" className="add-address-btn" onClick={() => setShowAddressForm(true)}>
                + Add New Address
              </button>
            </div>
          )}

          {(showAddressForm || addresses.length === 0) && (
            <form onSubmit={handleAddressSubmit} className="checkout-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleAddressChange} required className="form-input" />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input type="text" name="mobile_number" value={formData.mobile_number} onChange={handleAddressChange} required className="form-input" />
              </div>
              <div className="form-group">
                <label>Address (Door No / Street) *</label>
                <textarea name="address" value={formData.address} onChange={handleAddressChange} required rows="2" className="form-textarea" />
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Village / City *</label>
                  <input type="text" name="village" value={formData.village} onChange={handleAddressChange} required className="form-input" />
                </div>
                <div className="form-group half">
                  <label>District *</label>
                  <input type="text" name="district" value={formData.district} onChange={handleAddressChange} required className="form-input" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>State *</label>
                  <input type="text" name="state" value={formData.state} onChange={handleAddressChange} required className="form-input" />
                </div>
                <div className="form-group half">
                  <label>Pincode *</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleAddressChange} required className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label>Landmark (Optional)</label>
                <input type="text" name="landmark" value={formData.landmark} onChange={handleAddressChange} className="form-input" />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" name="is_default" checked={formData.is_default} onChange={handleAddressChange} />
                  Make this my default address
                </label>
              </div>
              
              <div className="form-actions">
                {addresses.length > 0 && (
                  <button type="button" className="cancel-button" onClick={() => setShowAddressForm(false)}>Cancel</button>
                )}
                <button type="submit" className="primary-button">Save Address</button>
              </div>
            </form>
          )}
        </section>

        {/* ORDER SUMMARY MODULE */}
        {cart && cart.items.length > 0 && (
          <section className="checkout-section glass-panel">
            <h2>Order Summary</h2>
            <div className="order-items-mini">
              {cart.items.map(item => (
                <div key={item.id} className="order-item-mini">
                  <span>{item.quantity}x {item.product.product_name}</span>
                  <span>₹{(getPackPrice(item.product.price, item.product.unit) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <hr />
            <div className="summary-row">
              <span>Item Total</span>
              <span>₹{Number(cart.subtotal).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Charge</span>
              <span>₹{Number(cart.delivery_charge).toFixed(2)}</span>
            </div>
            <div className="summary-row grand-total">
              <span>Grand Total</span>
              <span>₹{Number(cart.grand_total).toFixed(2)}</span>
            </div>
          </section>
        )}

        {/* PAYMENT OPTIONS MODULE */}
        <section className="checkout-section glass-panel">
          <h2>Payment Method</h2>
          <fieldset className="payment-methods">
            <label className={paymentMethod === 'COD' ? 'payment-option is-selected' : 'payment-option'}>
              <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
              <span className="payment-option-icon">₹</span>
              <span><strong>Cash on Delivery (COD)</strong><small>Pay when your order arrives</small></span>
            </label>
            <label className={paymentMethod === 'ONLINE' ? 'payment-option is-selected' : 'payment-option'}>
              <input type="radio" name="paymentMethod" value="ONLINE" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} />
              <span className="payment-option-icon gpay-icon">G</span>
              <span><strong>Online Payment</strong><small>UI Placeholder for PG</small></span>
            </label>
          </fieldset>
        </section>

        {/* PLACE ORDER */}
        <div className="checkout-actions sticky-bottom">
          <div className="checkout-total-info">
            <span className="label">Total to pay</span>
            <span className="amount">₹{Number(cart?.grand_total || 0).toFixed(2)}</span>
          </div>
          <button
            type="button"
            className="place-order-button"
            onClick={handlePlaceOrder}
            disabled={placingOrder || !selectedAddressId || !cart?.items?.length}
          >
            {placingOrder ? 'Processing...' : 'Place Order'}
          </button>
        </div>

      </div>
      <MobileFooter />
    </main>
  );
}
