import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getCartItems,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../api/cartApi";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useCart } from "../context/CartContext";
import { getDisplayUnit, getPackPrice, getQuantityLabel } from "../utils/productUnits";
import CustomerHeader from "../components/catalog/CustomerHeader";
import MobileFooter from "../components/catalog/MobileFooter";
import { FALLBACK_PRODUCT_IMAGE, getProductImageUrl } from "../utils/imageUrl";

export default function Cart() {
  const navigate = useNavigate();
  const { isAuthenticated, customer, logout } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const { cart: cachedCart, setCartData, refreshCart } = useCart();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    if (cachedCart) {
      setCart(cachedCart);
      setLoading(false);
      loadCart(false);
    } else {
      loadCart();
    }
  }, [isAuthenticated]);

  async function loadCart(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const data = await getCartItems();
      setCart(data);
    } catch (err) {
      setError("Failed to load cart items");
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleUpdateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) return;
    const previousCart = cart;

    // Update the visible quantity immediately. This keeps the cart responsive
    // while the API saves the change and recalculates the totals.
    setCart((currentCart) => {
      const updatedItem = currentCart?.items?.find((item) => item.id === itemId);
      const quantityDifference = newQuantity - (updatedItem?.quantity || 0);
      const priceDifference = getPackPrice(updatedItem?.product?.price, updatedItem?.product?.unit) * quantityDifference;
      const subtotal = Number(currentCart?.subtotal || 0) + priceDifference;
      const deliveryCharge = subtotal < 500 ? 40 : 0;

      return {
        ...currentCart,
        items: currentCart?.items?.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        ) || [],
        total_items: Number(currentCart?.total_items || 0) + quantityDifference,
        subtotal,
        delivery_charge: deliveryCharge,
        grand_total: subtotal + deliveryCharge,
      };
    });

    try {
      setUpdating(itemId);
      await updateCartItem(itemId, newQuantity);
      await Promise.all([loadCart(false), refreshCart()]);
    } catch (err) {
      setCart(previousCart);
      toast.error(err.response?.data?.detail || "Failed to update quantity");
    } finally {
      setUpdating(null);
    }
  }

  async function handleRemoveItem(itemId) {
    if (!window.confirm("Remove this item from cart?")) return;
    try {
      await removeCartItem(itemId);
      await Promise.all([loadCart(), refreshCart()]);
      toast.success("Item removed from cart");
    } catch (err) {
      toast.error("Failed to remove item");
    }
  }

  async function handleClearCart() {
    if (!window.confirm("Clear all items from cart?")) return;
    const previousCart = cart;
    const emptyCart = {
      items: [],
      total_items: 0,
      subtotal: 0,
      delivery_charge: 0,
      grand_total: 0,
    };
    setCart(emptyCart);
    setCartData(emptyCart);
    try {
      await clearCart();
      await refreshCart();
      toast.success("Cart cleared");
    } catch (err) {
      setCart(previousCart);
      setCartData(previousCart);
      toast.error("Failed to clear cart");
    }
  }

  // Proceed to Checkout
  function handleProceedToCheckout() {
    if (!cart?.items?.length) {
      toast.error("Your cart is empty");
      return;
    }
    // Navigate to checkout page
    navigate("/checkout");
  }

  const FALLBACK_IMAGE = FALLBACK_PRODUCT_IMAGE;

  if (loading) {
    return (
      <div className="mobile-shopping-shell">
        <div className="inner-page-content">
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading cart...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-shopping-shell">
      <CustomerHeader customer={customer} onLogout={logout} />

      <div className="inner-page-content" style={{ paddingBottom: '80px' }}>
        {error && <div className="error-message">{error}</div>}

        {!cart?.items?.length ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Browse our products and add items you love</p>
            <button
              type="button"
              className="browse-products-button"
              onClick={() => navigate("/customer/dashboard")}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items-list">
              {cart.items.map((item) => (
                <div key={item.id} className="cart-item glass-panel">
                  <div className="cart-item-image">
                    <img
                      src={getProductImageUrl(item.product?.product_image)}
                      alt={item.product?.product_name}
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_IMAGE;
                      }}
                    />
                  </div>

                  <div className="cart-item-content">
                    <div className="cart-item-header">
                      <h3>{item.product?.product_name}</h3>
                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={updating === item.id}
                      >
                        ×
                      </button>
                    </div>

                    <p className="cart-item-category">
                      {item.product?.category?.category_name || "Farm Product"}
                    </p>

                    <div className="cart-item-price">
                      ₹{getPackPrice(item.product?.price, item.product?.unit).toFixed(2)}
                      <span className="unit-label">
                        {" "}
                        / {getDisplayUnit(item.product?.unit)}
                      </span>
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-selector">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={updating === item.id || item.quantity <= 1}
                        >
                          −
                        </button>
                        <output aria-live="polite">
                          {updating === item.id ? "..." : item.quantity}
                        </output>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={
                            updating === item.id ||
                            item.quantity >= (item.product?.stock || 0)
                          }
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-subtotal">
                        {getQuantityLabel(item.product?.unit, item.quantity)} · Subtotal: ₹
                        {(
                          getPackPrice(item.product?.price, item.product?.unit) * item.quantity
                        ).toFixed(2)}
                      </div>
                    </div>

                    {item.product?.stock < item.quantity && (
                      <div className="stock-warning">
                        Only {item.product?.stock} units available
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary glass-panel">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Total Items</span>
                <span>{cart.total_items}</span>
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
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

              <div className="cart-actions">
                <button
                  type="button"
                  className="continue-shopping-button"
                  onClick={() => navigate("/customer/dashboard")}
                >
                  Continue Shopping
                </button>
                <button
                  type="button"
                  className="checkout-button"
                  onClick={handleProceedToCheckout}
                  disabled={!cart.items.length}
                >
                  Proceed to Checkout →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <MobileFooter />
    </div>
  );
}
