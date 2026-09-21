import { useEffect, useRef, useState } from 'react'
import { FiShoppingCart, FiEdit2, FiPackage, FiCheck, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function CustomerHeader({
  customer,
  onLogout,
}) {
  const navigate = useNavigate()
  const { cartCount } = useCart()
  const { updateProfile } = useAuth()

  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    full_name: customer?.full_name || '',
    email: customer?.email || '',
    village: customer?.village || ''
  })
  
  const menuRef = useRef(null)

  const firstName =
    customer?.full_name?.trim()?.split(' ')[0] || 'Customer'

  const initial = firstName.charAt(0).toUpperCase()

  useEffect(() => {
    if (customer) {
      setEditData({
        full_name: customer.full_name || '',
        email: customer.email || '',
        village: customer.village || ''
      })
    }
  }, [customer])

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowMenu(false)
        setIsEditing(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [])

  function handleLogout() {
    setShowMenu(false)
    setIsEditing(false)
    onLogout()
  }

  async function handleSaveProfile() {
    try {
      if (!editData.full_name.trim() || !editData.village.trim()) {
        toast.error('Name and Village are required')
        return
      }
      await updateProfile(editData)
      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch (err) {
      toast.error('Failed to update profile')
    }
  }

  return (
    <header className="customer-header">

      <div className="brand" onClick={() => navigate('/customer/dashboard')} style={{ cursor: 'pointer' }}>
        <div className="logo">
          <img src="/graminfresh-logo.svg" alt="" />
        </div>

        <div className="brand-content">
          <h2>GraminFresh</h2>
          <span>Village Farm Delivery</span>
        </div>
      </div>

      <div className="header-actions">

        <button
          type="button"
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

        {/* Cart */}
        <button
          type="button"
          className="cart-btn"
          onClick={() => navigate('/cart')}
          aria-label="Shopping Cart"
        >
          <FiShoppingCart />

          {cartCount > 0 && (
            <span className="cart-badge">
              {cartCount}
            </span>
          )}
        </button>

        <div
          className="profile-area"
          ref={menuRef}
        >
          <button
            type="button"
            className="avatar-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            {initial}
          </button>

          {showMenu && (
            <div className="profile-dropdown">

              <div className="profile-top">
                <div className="big-avatar">
                  {initial}
                </div>

                {!isEditing ? (
                  <>
                    <h3>{customer?.full_name}</h3>
                    <p>Customer Account</p>
                    <button type="button" className="edit-profile-icon" onClick={() => setIsEditing(true)}>
                      <FiEdit2 />
                    </button>
                  </>
                ) : (
                  <div className="profile-edit-header">
                    <h3>Edit Profile</h3>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="profile-details">
                  <div className="profile-item">
                    <span>Customer ID</span>
                    <strong>{customer?.customer_id || '-'}</strong>
                  </div>

                  <div className="profile-item">
                    <span>Mobile Number</span>
                    <strong>{customer?.mobile_number || '-'}</strong>
                  </div>

                  <div className="profile-item">
                    <span>Village</span>
                    <strong>{customer?.village || '-'}</strong>
                  </div>

                  <div className="profile-item">
                    <span>Email</span>
                    <strong>{customer?.email || '-'}</strong>
                  </div>
                  
                  <button
                    type="button"
                    className="my-orders-btn"
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/my-orders')
                    }}
                  >
                    <FiPackage style={{ marginRight: '8px' }} />
                    My Orders
                  </button>
                </div>
              ) : (
                <div className="profile-edit-form">
                  <div className="profile-item read-only">
                    <span>Customer ID</span>
                    <strong>{customer?.customer_id || '-'}</strong>
                  </div>
                  
                  <div className="profile-item read-only">
                    <span>Mobile Number</span>
                    <strong>{customer?.mobile_number || '-'}</strong>
                  </div>

                  <div className="edit-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={editData.full_name}
                      onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                      className="edit-input"
                    />
                  </div>

                  <div className="edit-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      value={editData.email}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="edit-input"
                    />
                  </div>

                  <div className="edit-group">
                    <label>Village / Location</label>
                    <input 
                      type="text" 
                      value={editData.village}
                      onChange={(e) => setEditData({...editData, village: e.target.value})}
                      className="edit-input"
                    />
                  </div>

                  <div className="edit-actions">
                    <button type="button" className="edit-cancel" onClick={() => {
                      setIsEditing(false)
                      setEditData({
                        full_name: customer?.full_name || '',
                        email: customer?.email || '',
                        village: customer?.village || ''
                      })
                    }}>
                      <FiX /> Cancel
                    </button>
                    <button type="button" className="edit-save" onClick={handleSaveProfile}>
                      <FiCheck /> Save
                    </button>
                  </div>
                </div>
              )}

              {!isEditing && (
                <button
                  type="button"
                  className="profile-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              )}

            </div>
          )}
        </div>

      </div>

    </header>
  )
}