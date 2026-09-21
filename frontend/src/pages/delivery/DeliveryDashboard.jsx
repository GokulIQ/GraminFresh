import { useState, useEffect } from 'react'
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiUser,
  FiMapPin,
  FiTruck,
  FiToggleLeft,
  FiToggleRight
} from 'react-icons/fi'
import { deliveryApi, extractErrorMessage } from '../../api/deliveryApi'
import { useDeliveryAuth } from '../../context/DeliveryAuthContext'
import toast from 'react-hot-toast'

export default function DeliveryDashboard() {
  const { partner, updatePartnerState } = useDeliveryAuth()
  const [stats, setStats] = useState({
    today_deliveries: 0,
    pending_deliveries: 0,
    completed_deliveries: 0,
    active_trips: 0
  })
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await deliveryApi.getDashboardStats()
      setStats(res.data)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load dashboard metrics'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleToggleAvailability = async () => {
    if (!partner) return
    const nextStatus = partner.availability_status === 'Available' ? 'Busy' : 'Available'
    try {
      setToggling(true)
      const res = await deliveryApi.updateProfile({ availability_status: nextStatus })
      updatePartnerState(res.data)
      toast.success(`Availability status updated to ${nextStatus}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update availability status'))
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Welcome Banner */}
      <div className="admin-glass-panel rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
            Hello, {partner?.full_name || 'Driver'}!
          </h2>
          <p className="text-xs text-[#556957] font-medium mt-1">
            Logistics Dashboard for tracking your active and historical farm orders.
          </p>
        </div>

        {/* Availability Switch */}
        <div className="flex items-center gap-3 bg-white/70 p-3 rounded-2xl border border-white shrink-0 shadow-xs">
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Duty Status</p>
            <p className={`text-xs font-black ${partner?.availability_status === 'Available' ? 'text-[#31653a]' : 'text-amber-600'}`}>
              {partner?.availability_status || 'Available'}
            </p>
          </div>
          <button
            onClick={handleToggleAvailability}
            disabled={toggling}
            className="text-3xl text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            title="Toggle Availability"
          >
            {partner?.availability_status === 'Available' ? (
              <FiToggleRight className="text-[#31653a]" />
            ) : (
              <FiToggleLeft className="text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Driver Summary Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 border border-white rounded-2xl p-4 flex items-center gap-3">
          <FiMapPin className="text-[#31653a] w-5 h-5" />
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Location</p>
            <p className="text-xs font-bold text-[#17301c] truncate">{partner?.current_location || 'Pollachi Hub'}</p>
          </div>
        </div>

        <div className="bg-white/80 border border-white rounded-2xl p-4 flex items-center gap-3">
          <FiTruck className="text-[#31653a] w-5 h-5" />
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Assigned Vehicle</p>
            <p className="text-xs font-bold text-[#17301c] truncate">
              {partner?.vehicle_type} {partner?.vehicle_number ? `(${partner.vehicle_number})` : ''}
            </p>
          </div>
        </div>

        <div className="bg-white/80 border border-white rounded-2xl p-4 flex items-center gap-3">
          <FiUser className="text-[#31653a] w-5 h-5" />
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Partner Account</p>
            <p className="text-xs font-bold text-[#17301c] truncate">{partner?.partner_id} ({partner?.phone})</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading stats...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Today's Deliveries */}
          <div className="admin-glass-card rounded-3xl p-6 flex items-center justify-between border border-white/80">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Today's Deliveries</p>
              <h3 className="text-3xl font-black text-[#17301c]">{stats.today_deliveries}</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Total assignments for today</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl shadow-xs">
              <FiCalendar className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Pending Deliveries */}
          <div className="admin-glass-card rounded-3xl p-6 flex items-center justify-between border border-white/80">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pending Deliveries</p>
              <h3 className="text-3xl font-black text-[#17301c]">{stats.pending_deliveries}</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Active trips waiting completion</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl shadow-xs">
              <FiClock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Completed Deliveries */}
          <div className="admin-glass-card rounded-3xl p-6 flex items-center justify-between border border-white/80">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Completed Deliveries</p>
              <h3 className="text-3xl font-black text-[#17301c]">{stats.completed_deliveries}</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Total successful deliveries</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl shadow-xs">
              <FiCheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Safety Guideline Card */}
      <div className="bg-gradient-to-r from-[#31653a] to-[#27532f] rounded-3xl p-6 text-white shadow-lg shadow-[#31653a]/25 relative overflow-hidden">
        <div className="relative z-10 max-w-lg space-y-2">
          <h4 className="font-extrabold text-sm sm:text-base">Safety Guidelines for Riders</h4>
          <p className="text-xs text-green-100 leading-relaxed">
            Please wear your helmet at all times. Verify the orders inside the insulated bags before dispatching. Maintain social distancing at doorsteps and ensure to update the delivery status in real-time as you progress on your routes.
          </p>
        </div>
        <div className="absolute right-[-10%] bottom-[-50%] w-72 h-72 bg-white/5 rounded-full pointer-events-none" />
      </div>
    </div>
  )
}
