import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiDollarSign,
  FiShoppingCart,
  FiUsers,
  FiBox,
  FiAlertTriangle,
  FiTrendingUp,
  FiArrowUpRight,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi'
import { adminApi } from '../../api/adminApi'
import AdminInvoiceModal from '../../components/admin/AdminInvoiceModal'
import { getProductImageUrl } from '../../utils/imageUrl'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null)

  const fetchDashboardData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true)
      const res = await adminApi.getDashboardSummary()
      setSummary(res.data)
      if (showToast) toast.success('Dashboard metrics updated')
    } catch (err) {
      toast.error('Failed to load dashboard metrics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-[#17301c]">Loading GraminFresh Operations Dashboard...</p>
      </div>
    )
  }

  const kpi = summary?.kpis || {}
  const chartData = summary?.revenue_chart || []
  const maxRevenue = Math.max(...chartData.map((d) => parseFloat(d.revenue) || 0), 1)
  const hasChartRevenue = chartData.some((d) => (parseFloat(d.revenue) || 0) > 0)
  const formatChartRevenue = (amount) => new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
            Operations & Sales Dashboard
          </h2>
          <p className="text-xs text-[#556957] font-medium mt-0.5">
            Real-time farm inventory, customer orders, and logistics overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-white text-xs font-bold text-[#17301c] border border-white shadow-sm transition-all"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-[#31653a] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/admin/products"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#31653a] hover:bg-[#27532f] text-xs font-bold text-white shadow-md shadow-[#31653a]/25 transition-all"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Revenue */}
        <div className="admin-glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#eaf3eb] text-[#31653a] flex items-center justify-center text-lg shadow-sm border border-[#31653a]/20">
              <FiDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-[#17301c]">
              ₹{parseFloat(kpi.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] font-bold text-[#31653a] flex items-center gap-1 mt-1">
              <FiTrendingUp className="w-3.5 h-3.5" />
              <span>Today: ₹{parseFloat(kpi.today_revenue || 0).toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="admin-glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Total Orders
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-100/90 text-blue-700 flex items-center justify-center text-lg shadow-sm">
              <FiShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-[#17301c]">
              {kpi.total_orders || 0}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                {kpi.pending_orders} Pending
              </span>
              <span className="bg-[#eaf3eb] text-[#31653a] font-bold px-1.5 py-0.2 rounded border border-[#31653a]/20">
                {kpi.delivered_orders} Delivered
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Customers */}
        <div className="admin-glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Registered Customers
            </span>
            <div className="w-9 h-9 rounded-2xl bg-purple-100/90 text-purple-700 flex items-center justify-center text-lg shadow-sm">
              <FiUsers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-[#17301c]">
              {kpi.total_customers || 0}
            </h3>
            <p className="text-[11px] text-gray-500 font-semibold mt-1">
              Active buyers in database
            </p>
          </div>
        </div>

        {/* Card 4: Inventory & Low Stock */}
        <div className="admin-glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Farm Products
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-100/90 text-amber-700 flex items-center justify-center text-lg shadow-sm">
              <FiBox className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-[#17301c]">
              {kpi.total_products || 0}
            </h3>
            <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
              {kpi.low_stock_products_count > 0 ? (
                <>
                  <FiAlertTriangle className="w-3.5 h-3.5" />
                  <span>{kpi.low_stock_products_count} Items Low in Stock</span>
                </>
              ) : (
                <span className="text-[#31653a]">Stock Levels Healthy</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: 7-Day Revenue Trend Chart & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend Chart (2 cols) */}
        <div className="lg:col-span-2 admin-glass-panel rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#17301c]">
                7-Day Revenue & Volume Trend
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Daily sales performance across all categories
              </p>
            </div>
            <Link
              to="/admin/reports"
              className="text-xs font-bold text-[#31653a] hover:underline flex items-center gap-1"
            >
              <span>View Full Report</span>
              <FiArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Interactive Responsive Bar Visualizer */}
          <div className="pt-4 pb-2">
            <div className="flex justify-between px-2 mb-1 text-[10px] font-bold text-gray-400">
              <span>Daily revenue</span>
              <span>Highest: ₹{formatChartRevenue(maxRevenue)}</span>
            </div>
            <div className="h-44 sm:h-52 grid grid-cols-7 items-end gap-2 sm:gap-4 px-2">
              {chartData.map((d) => {
                const val = parseFloat(d.revenue) || 0
                const heightPercent = val > 0 ? Math.max((val / maxRevenue) * 100, 10) : 0
                const dateLabel = new Date(d.date).toLocaleDateString([], { weekday: 'short', day: 'numeric' })

                return (
                  <div key={d.date} className="relative h-full flex flex-col items-center justify-end gap-2 group">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-12 bg-[#17301c] text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none shadow-lg whitespace-nowrap z-20">
                      ₹{val.toFixed(2)} ({d.orders_count} orders)
                    </div>

                    <span className={`text-[10px] font-black ${val > 0 ? 'text-[#31653a]' : 'text-gray-300'}`}>
                      {val > 0 ? `₹${formatChartRevenue(val)}` : '—'}
                    </span>

                    {/* Bar */}
                    <div className="w-full max-w-[42px] bg-[#eaf3eb] rounded-2xl p-1 flex items-end justify-center flex-1 min-h-[116px]">
                      <div
                        style={{ height: val > 0 ? `${heightPercent}%` : '4px' }}
                        className={`w-full rounded-xl transition-all duration-500 shadow-sm ${
                          val > 0
                            ? 'bg-gradient-to-t from-[#27532f] to-[#4b9656] group-hover:from-[#17301c]'
                            : 'bg-[#d9e9db]'
                        }`}
                      />
                    </div>

                    {/* X-axis Label */}
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 group-hover:text-[#17301c]">
                      {dateLabel}
                    </span>
                  </div>
                )
              })}
            </div>
            {!hasChartRevenue && (
              <p className="text-center text-xs text-gray-400 font-medium mt-3">No sales recorded in the last seven days.</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts Widget (1 col) */}
        <div className="admin-glass-panel rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-100 text-red-600">
                <FiAlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#17301c]">
                Low Stock Warnings
              </h3>
            </div>
            <Link
              to="/admin/products?low_stock=true"
              className="text-xs font-bold text-[#31653a] hover:underline"
            >
              Manage
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-56 sm:max-h-64 admin-custom-scrollbar">
            {summary?.low_stock_alerts?.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400 font-semibold">
                🎉 No products currently low in stock!
              </div>
            ) : (
              summary?.low_stock_alerts?.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white/70 border border-red-100 flex items-center justify-between gap-3 shadow-xs hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={getProductImageUrl(item.product_image)}
                      alt={item.product_name}
                      className="w-10 h-10 rounded-xl object-cover border border-white shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#17301c] truncate">{item.product_name}</p>
                      <p className="text-[10px] text-gray-500">{item.category_name}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                      {item.stock} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 cols) */}
        <div className="lg:col-span-2 admin-glass-panel rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm sm:text-base text-[#17301c]">
              Recent Customer Orders
            </h3>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-[#31653a] hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <FiArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Responsive Orders Table */}
          <div className="overflow-x-auto admin-custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-2 px-2">Order ID</th>
                  <th className="pb-2 px-2">Customer</th>
                  <th className="pb-2 px-2">Village</th>
                  <th className="pb-2 px-2 text-right">Amount</th>
                  <th className="pb-2 px-2 text-center">Status</th>
                  <th className="pb-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {summary?.recent_orders?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No orders placed yet
                    </td>
                  </tr>
                ) : (
                  summary?.recent_orders?.map((o) => {
                    const statusColors = {
                      Pending: 'bg-amber-100 text-amber-900 border-amber-200',
                      'Order Placed': 'bg-amber-100 text-amber-900 border-amber-200',
                      Confirmed: 'bg-blue-100 text-blue-900 border-blue-200',
                      Preparing: 'bg-indigo-100 text-indigo-900 border-indigo-200',
                      'Out for Delivery': 'bg-purple-100 text-purple-900 border-purple-200',
                      Delivered: 'bg-[#eaf3eb] text-[#31653a] border-[#31653a]/20',
                      Cancelled: 'bg-red-100 text-red-900 border-red-200',
                    }
                    const badgeClass = statusColors[o.order_status] || 'bg-gray-100 text-gray-800'

                    return (
                      <tr key={o.order_id} className="hover:bg-white/60 transition-colors">
                        <td className="py-3 px-2 font-mono font-bold text-[#17301c]">{o.order_id}</td>
                        <td className="py-3 px-2">
                          <p className="font-bold text-[#17301c]">{o.customer_name}</p>
                          <p className="text-[10px] text-gray-500">{o.customer_mobile}</p>
                        </td>
                        <td className="py-3 px-2 text-gray-600">{o.customer_village || 'Coimbatore'}</td>
                        <td className="py-3 px-2 text-right font-extrabold text-[#17301c]">
                          ₹{parseFloat(o.grand_total).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {o.order_status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedInvoiceOrderId(o.order_id)}
                            className="px-2.5 py-1 rounded-lg bg-[#eaf3eb] text-[#31653a] font-bold text-[11px] hover:bg-[#d8ebd9] border border-[#31653a]/20 transition-colors"
                          >
                            Invoice
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Products (1 col) */}
        <div className="admin-glass-panel rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col">
          <h3 className="font-extrabold text-sm sm:text-base text-[#17301c] mb-3 pb-3 border-b border-gray-100">
            Top Performing Items
          </h3>

          <div className="space-y-3 flex-1 overflow-y-auto admin-custom-scrollbar max-h-72">
            {summary?.top_selling_products?.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Sales rankings will appear here as orders complete.
              </div>
            ) : (
              summary?.top_selling_products?.map((item, idx) => (
                <div
                  key={item.product_id}
                  className="p-3 rounded-2xl bg-white/70 border border-white/90 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 font-black text-gray-300 text-sm">#{idx + 1}</span>
                    <img
                      src={getProductImageUrl(item.product_image)}
                      alt={item.product_name}
                      className="w-10 h-10 rounded-xl object-cover border border-white shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#17301c] truncate">{item.product_name}</p>
                      <p className="text-[10px] text-gray-500">{item.units_sold} units sold</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-[#31653a]">
                      ₹{parseFloat(item.total_revenue).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoiceOrderId && (
        <AdminInvoiceModal
          orderId={selectedInvoiceOrderId}
          onClose={() => setSelectedInvoiceOrderId(null)}
        />
      )}
    </div>
  )
}
