import { useState, useEffect } from 'react'
import {
  FiCheckCircle,
  FiSearch,
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiClock,
  FiTrendingUp
} from 'react-icons/fi'
import { deliveryApi, extractErrorMessage } from '../../api/deliveryApi'
import toast from 'react-hot-toast'

export default function DeliveryHistory() {
  const [history, setHistory] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadHistory = async () => {
    try {
      setLoading(true)
      const res = await deliveryApi.getDeliveryHistory()
      setHistory(res.data || [])
      setFilteredHistory(res.data || [])
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load delivery history'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // Filter history dynamically based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredHistory(history)
      return
    }
    const kw = search.toLowerCase().trim()
    const filtered = history.filter(
      (item) =>
        item.order_id.toLowerCase().includes(kw) ||
        (item.customer_name && item.customer_name.toLowerCase().includes(kw)) ||
        (item.delivery_address && item.delivery_address.toLowerCase().includes(kw))
    )
    setFilteredHistory(filtered)
  }, [search, history])

  const totalDeliveredValue = filteredHistory.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Header & Stats summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
            Delivery Log & History
          </h2>
          <p className="text-xs text-[#556957] font-medium mt-0.5">
            Check your past successful deliveries and aggregate metrics.
          </p>
        </div>

        {/* Aggregated Revenue Badge */}
        <div className="bg-[#eaf3eb] border border-[#31653a]/20 px-4 py-3 rounded-2xl flex items-center gap-3 shrink-0 shadow-xs">
          <div className="w-9 h-9 bg-[#31653a] text-white rounded-xl flex items-center justify-center text-lg">
            <FiTrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] text-[#556957] font-bold uppercase tracking-wider">Total Value Delivered</p>
            <p className="text-base font-black text-[#17301c]">₹{totalDeliveredValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-glass-panel rounded-3xl p-4 flex items-center gap-3 border border-white">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search completed trip by Order ID, customer name or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm admin-glass-input"
          />
        </div>
      </div>

      {/* Results grid/table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading history...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="admin-glass-panel rounded-3xl p-12 text-center border border-white">
          <FiCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-base text-[#17301c]">No completed deliveries found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try searching with a different term, or get active assignments completed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white/80 rounded-2xl p-4 sm:p-5 border border-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md hover:border-green-100 transition-all"
            >
              {/* Trip Identity & Customer */}
              <div className="space-y-2 max-w-lg">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold bg-[#eaf3eb] text-[#31653a] px-2 py-0.5 rounded border border-[#31653a]/25 shrink-0">
                    Order ID: {item.order_id}
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                    Delivered on: {new Date(item.delivered_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h4 className="font-bold text-[#17301c] text-sm">Customer: {item.customer_name || '—'}</h4>
                <div className="flex items-start gap-1.5 text-xs text-gray-500 leading-tight">
                  <FiMapPin className="text-gray-400 w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{item.delivery_address || '—'}</span>
                </div>
              </div>

              {/* Amount & Time details */}
              <div className="grid grid-cols-2 gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 w-full sm:w-auto sm:flex sm:items-center sm:gap-6 sm:justify-end shrink-0">
                <div className="flex items-center gap-2">
                  <FiDollarSign className="text-gray-400 w-4 h-4" />
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Payment Value</p>
                    <p className="text-xs font-bold text-gray-800">₹{item.total_amount}</p>
                    <span className="text-[9px] font-extrabold text-gray-500 uppercase">{item.payment_method}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FiClock className="text-gray-400 w-4 h-4" />
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Journey Duration</p>
                    <p className="text-xs font-bold text-gray-800">
                      {Math.ceil(Math.abs(new Date(item.delivered_at) - new Date(item.assigned_at)) / (1000 * 60))} mins
                    </p>
                    <span className="text-[9px] text-gray-400 font-semibold">Assigned &rarr; Completed</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
