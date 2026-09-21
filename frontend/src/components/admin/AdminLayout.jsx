import { useState, useEffect, Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiGrid,
  FiBox,
  FiShoppingCart,
  FiUsers,
  FiTruck,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiBell,
  FiChevronRight,
  FiExternalLink,
  FiUser,
} from 'react-icons/fi'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { adminApi } from '../../api/adminApi'
import { AdminContentSkeleton } from './AdminPageSkeleton'
import toast from 'react-hot-toast'

const navItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
  { name: 'Categories', path: '/admin/categories', icon: FiGrid },
  { name: 'Products', path: '/admin/products', icon: FiBox },
  { name: 'Orders', path: '/admin/orders', icon: FiShoppingCart },
  { name: 'Customers', path: '/admin/customers', icon: FiUsers },
  { name: 'Delivery Partners', path: '/admin/delivery', icon: FiTruck },
  { name: 'Reports & Sales', path: '/admin/reports', icon: FiBarChart2 },
  { name: 'Settings', path: '/admin/settings', icon: FiSettings },
]

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await adminApi.getNotifications({ limit: 10 })
      setNotifications(res.data || [])
      setUnreadCount(res.data?.filter((n) => !n.is_read).length || 0)
    } catch (e) {
      // silent fallback
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // Poll every 60s
    return () => clearInterval(interval)
  }, [])

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setNotificationsOpen(false)
    setProfileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out from Admin Portal')
    navigate('/admin/login')
  }

  const markAllRead = async () => {
    try {
      await adminApi.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (e) {
      toast.error('Failed to update notifications')
    }
  }

  // Get current page title for breadcrumb
  const currentNav = navItems.find((item) => item.path === location.pathname)
  const pageTitle = currentNav ? currentNav.name : 'Admin Portal'

  return (
    <div
      className="admin-layout min-h-screen bg-[#f3f7f2] flex flex-col font-sans text-[#1b2e20]"
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Responsive Slide-out Sidebar (Mobile Drawer + Desktop Fixed) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 admin-glass-sidebar flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header Brand */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/80">
          <Link to="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-[#31653a] p-1.5 flex items-center justify-center shadow-md shadow-[#31653a]/25 group-hover:scale-105 transition-transform shrink-0">
              <img
                src="/graminfresh-logo.svg"
                alt="GraminFresh Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-[#17301c]">
                  Gramin<span className="text-[#31653a]">Fresh</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-[#eaf3eb] text-[#31653a] px-1.5 py-0.5 rounded-md border border-[#31653a]/20">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-[#556957] font-medium leading-tight mt-0.5">
                Farm Management Hub
              </p>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Close menu"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Quick Profile Pill in Sidebar */}
        <div className="p-4 mx-3 mt-4 rounded-2xl bg-gradient-to-br from-white/90 to-white/60 border border-white/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#eaf3eb] border-2 border-[#31653a]/30 flex items-center justify-center text-[#31653a] font-bold text-base">
            {admin?.avatar ? (
              <img src={admin.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              admin?.full_name?.charAt(0) || 'A'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#17301c] truncate">
              {admin?.full_name || 'Administrator'}
            </p>
            <p className="text-xs text-[#31653a] font-bold capitalize truncate">
              {admin?.role?.replace('_', ' ') || 'Super Admin'}
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto admin-custom-scrollbar">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-[#31653a] text-white shadow-md shadow-[#31653a]/30 translate-x-1'
                      : 'text-[#354e38] hover:bg-white/80 hover:text-[#17301c]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#31653a]'}`} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            )
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Store Links
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#466049] hover:bg-white/80 hover:text-[#17301c] transition-colors"
          >
            <div className="flex items-center gap-3">
              <FiExternalLink className="w-4 h-4 text-gray-400" />
              <span>View Customer App</span>
            </div>
            <span className="text-[10px] bg-[#eaf3eb] text-[#31653a] font-bold px-1.5 py-0.5 rounded border border-[#31653a]/20">
              Live
            </span>
          </a>
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-white/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-red-600 hover:bg-red-50 transition-colors border border-red-100"
          >
            <FiLogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 lg:ml-72 h-16 admin-glass-header px-4 sm:px-6 flex items-center justify-between">
        {/* Left Side: Mobile Menu Button & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-[#203524] hover:bg-white/80 border border-white lg:hidden"
            aria-label="Open menu"
          >
            <FiMenu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 font-medium">
            <Link to="/admin/dashboard" className="hover:text-[#31653a]">
              Admin
            </Link>
            <FiChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#17301c] font-bold">{pageTitle}</span>
          </div>

          <h1 className="text-lg font-extrabold text-[#17301c] sm:hidden truncate">
            {pageTitle}
          </h1>
        </div>

        {/* Right Side: Notifications & Profile Trigger */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen)
                setProfileMenuOpen(false)
              }}
              className="relative p-2.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 border border-white/90 shadow-sm transition-all"
              aria-label="Notifications"
            >
              <FiBell className="w-5 h-5 text-[#31653a]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl admin-glass-modal p-4 shadow-xl z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#17301c]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-[#eaf3eb] text-[#31653a] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-[#31653a] font-semibold hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="mt-2 max-h-72 overflow-y-auto space-y-2 admin-custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl transition-colors ${
                          n.is_read
                            ? 'bg-white/50 text-gray-600'
                            : 'bg-green-50/80 border border-[#31653a]/20 text-green-950 font-medium'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold">{n.title}</p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileMenuOpen(!profileMenuOpen)
                setNotificationsOpen(false)
              }}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-white/80 hover:bg-white border border-white/90 shadow-sm transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-[#31653a] text-white flex items-center justify-center font-bold text-sm">
                {admin?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-[#17301c] leading-tight truncate max-w-[120px]">
                  {admin?.full_name?.split(' ')[0] || 'Admin'}
                </p>
                <p className="text-[10px] text-gray-500 capitalize leading-tight">
                  {admin?.role?.replace('_', ' ') || 'Super Admin'}
                </p>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl admin-glass-modal p-2 shadow-xl z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-[#17301c] truncate">{admin?.full_name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{admin?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-[#eaf3eb] hover:text-[#31653a]"
                  >
                    <FiUser className="w-4 h-4" />
                    <span>Account Profile</span>
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-[#eaf3eb] hover:text-[#31653a]"
                  >
                    <FiSettings className="w-4 h-4" />
                    <span>Store Settings</span>
                  </Link>
                </div>
                <div className="pt-1 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <FiLogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <Suspense fallback={<AdminContentSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation Bar (< md screens) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-200/80 shadow-lg px-2 py-1.5 flex items-center justify-around md:hidden">
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[11px] font-bold ${
              isActive ? 'text-[#31653a]' : 'text-gray-500 hover:text-gray-900'
            }`
          }
        >
          <FiHome className="w-5 h-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/admin/orders"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[11px] font-bold ${
              isActive ? 'text-[#31653a]' : 'text-gray-500 hover:text-gray-900'
            }`
          }
        >
          <FiShoppingCart className="w-5 h-5" />
          <span>Orders</span>
        </NavLink>

        <NavLink
          to="/admin/products"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[11px] font-bold ${
              isActive ? 'text-[#31653a]' : 'text-gray-500 hover:text-gray-900'
            }`
          }
        >
          <FiBox className="w-5 h-5" />
          <span>Products</span>
        </NavLink>

        <NavLink
          to="/admin/customers"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[11px] font-bold ${
              isActive ? 'text-[#31653a]' : 'text-gray-500 hover:text-gray-900'
            }`
          }
        >
          <FiUsers className="w-5 h-5" />
          <span>Users</span>
        </NavLink>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[11px] font-bold text-gray-500 hover:text-gray-900"
        >
          <FiMenu className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  )
}
