import { useState, useEffect, Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiTruck,
  FiClock,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiBell
} from 'react-icons/fi'
import { useDeliveryAuth } from '../../context/DeliveryAuthContext'
import { deliveryApi } from '../../api/deliveryApi'
import toast from 'react-hot-toast'

const navItems = [
  { name: 'Dashboard', path: '/delivery/dashboard', icon: FiHome },
  { name: 'Assigned Trips', path: '/delivery/orders', icon: FiTruck },
  { name: 'Trip History', path: '/delivery/history', icon: FiClock },
  { name: 'My Profile', path: '/delivery/profile', icon: FiUser },
]

export default function DeliveryLayout() {
  const { partner, logout } = useDeliveryAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTripsCount, setActiveTripsCount] = useState(0)

  const fetchActiveTripsCount = async () => {
    try {
      const res = await deliveryApi.getDashboardStats()
      setActiveTripsCount(res.data?.active_trips || 0)
    } catch (e) {
      // silent
    }
  }

  useEffect(() => {
    fetchActiveTripsCount()
    const interval = setInterval(fetchActiveTripsCount, 30000) // update every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    toast.success('Logged out from Logistics Portal')
    navigate('/delivery/login')
  }

  const currentNav = navItems.find((item) => item.path === location.pathname)
  const pageTitle = currentNav ? currentNav.name : 'Delivery Dashboard'

  return (
    <div
      className="min-h-screen bg-[#f3f7f2] flex flex-col font-sans text-[#1b2e20]"
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Slide-out Sidebar for Desktop */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 admin-glass-sidebar flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/80">
          <Link to="/delivery/dashboard" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-[#31653a] p-1.5 flex items-center justify-center shadow-md shadow-[#31653a]/25 shrink-0">
              <img
                src="/graminfresh-logo.svg"
                alt="GraminFresh Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-[#17301c]">
                  Gramin<span className="text-[#31653a]">Fresh</span>
                </span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold bg-[#eaf3eb] text-[#31653a] px-1.5 py-0.5 rounded border border-[#31653a]/20">
                  RIDER
                </span>
              </div>
              <p className="text-[10px] text-[#556957] font-medium leading-tight mt-0.5">
                Logistics Fulfillment
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

        {/* Driver Quick Info Card */}
        <div className="p-4 mx-3 mt-4 rounded-2xl bg-gradient-to-br from-white/90 to-white/60 border border-white/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#eaf3eb] border-2 border-[#31653a]/30 flex items-center justify-center text-[#31653a] font-bold text-base uppercase">
            {partner?.full_name?.charAt(0) || 'D'}
          </div>
          <div className="text-left shrink min-w-0">
            <p className="text-xs font-bold text-[#17301c] leading-tight truncate">
              {partner?.full_name}
            </p>
            <p className="text-[10px] text-gray-500 capitalize leading-tight mt-0.5">
              {partner?.vehicle_type} • {partner?.partner_id}
            </p>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold tracking-wide transition-all group ${
                  isActive
                    ? 'bg-[#31653a] text-white shadow-md shadow-[#31653a]/20'
                    : 'text-gray-600 hover:bg-white hover:text-gray-950'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
              {item.name === 'Assigned Trips' && activeTripsCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400">
                  {activeTripsCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-3 border-t border-white/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-extrabold text-red-600 hover:bg-red-50 transition-colors"
          >
            <FiLogOut className="w-4.5 h-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Top Header */}
      <header className="lg:pl-72 h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-gray-700 hover:bg-[#eaf3eb] lg:hidden transition-all"
            aria-label="Toggle menu"
          >
            <FiMenu className="w-5.5 h-5.5" />
          </button>
          <div className="hidden sm:block">
            <h1 className="text-base font-extrabold text-[#17301c]">{pageTitle}</h1>
          </div>
        </div>

        {/* Logo/Brand title in header on Mobile */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="w-9 h-9 rounded-xl bg-[#31653a] p-1.5 flex items-center justify-center shadow-sm">
            <img src="/graminfresh-logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-sm tracking-tight text-[#17301c]">
            Gramin<span className="text-[#31653a]">Fresh</span>
          </span>
        </div>

        {/* Status indicator & Driver avatar pill */}
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border tracking-wider transition-all shadow-xs ${
            partner?.availability_status === 'Available'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/85'
              : 'bg-amber-50 text-amber-700 border-amber-200/85'
          }`}>
            <span className="relative flex h-1.5 w-1.5">
              {partner?.availability_status === 'Available' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${partner?.availability_status === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span>{partner?.availability_status?.toUpperCase() || 'ONLINE'}</span>
          </div>

          <Link to="/delivery/profile" className="w-8 h-8 rounded-full bg-[#31653a]/10 border border-[#31653a]/20 flex items-center justify-center text-[#31653a] font-bold text-xs shadow-xs hover:bg-[#31653a]/20 transition-all shrink-0">
            {partner?.full_name?.charAt(0) || 'D'}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 p-4 sm:p-6 pb-24 lg:pb-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-200/80 shadow-lg px-2 py-1.5 flex items-center justify-around lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-bold ${
                isActive ? 'text-[#31653a]' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {item.name === 'Assigned Trips' && activeTripsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  {activeTripsCount}
                </span>
              )}
            </div>
            <span>
              {item.name === 'Assigned Trips'
                ? 'Assigned'
                : item.name === 'Trip History'
                ? 'History'
                : item.name === 'My Profile'
                ? 'Profile'
                : item.name}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
