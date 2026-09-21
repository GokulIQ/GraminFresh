import { useState, useEffect } from 'react'
import {
  FiDownload,
} from 'react-icons/fi'
import { adminApi } from '../../api/adminApi'
import toast from 'react-hot-toast'
import { getProductImageUrl } from '../../utils/imageUrl'

export default function AdminReports() {
  const [period, setPeriod] = useState('30d')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getSalesReport(period)
      setReport(res.data)
    } catch (err) {
      toast.error('Failed to load financial reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [period])

  const handleExport = (type) => {
    let url = ''
    if (type === 'orders') url = adminApi.getExportOrdersUrl()
    else if (type === 'products') url = adminApi.getExportProductsUrl()
    else if (type === 'customers') url = adminApi.getExportCustomersUrl()

    // Append current admin JWT
    const token = localStorage.getItem('vfd_admin_token')
    if (token) {
      url += `?token=${token}`
    }
    window.open(url, '_blank')
    toast.success(`Exporting ${type} CSV...`)
  }

  // The sales endpoint returns the KPI fields at the response root.
  const kpis = report || {}
  const trend = report?.sales_by_day || []
  const maxRev = Math.max(...trend.map((d) => parseFloat(d.revenue) || 0), 1)
  const hasTrendRevenue = trend.some((d) => (parseFloat(d.revenue) || 0) > 0)
  const formatChartRevenue = (amount) => new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header & CSV Export Trigger Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
            Financial Analytics & Sales Reports
          </h2>
          <p className="text-xs text-[#556957] font-medium mt-0.5">
            Audit revenue streams, order frequency, top crops, and export raw CSV records.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('orders')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-gray-700 hover:bg-[#eaf3eb] border border-gray-200 text-xs font-bold shadow-xs transition-colors"
          >
            <FiDownload className="w-3.5 h-3.5 text-[#31653a]" />
            <span>Orders CSV</span>
          </button>
          <button
            onClick={() => handleExport('products')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-gray-700 hover:bg-[#eaf3eb] border border-gray-200 text-xs font-bold shadow-xs transition-colors"
          >
            <FiDownload className="w-3.5 h-3.5 text-[#31653a]" />
            <span>Products CSV</span>
          </button>
          <button
            onClick={() => handleExport('customers')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-gray-700 hover:bg-[#eaf3eb] border border-gray-200 text-xs font-bold shadow-xs transition-colors"
          >
            <FiDownload className="w-3.5 h-3.5 text-[#31653a]" />
            <span>Customers CSV</span>
          </button>
        </div>
      </div>

      {/* Period Selection Bar */}
      <div className="admin-glass-panel rounded-3xl p-3 flex items-center justify-between shadow-xs">
        <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider px-2">
          Reporting Period
        </span>
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-2xl">
          {[
            { label: 'Last 7 Days', value: '7d' },
            { label: 'Last 30 Days', value: '30d' },
            { label: 'Last 90 Days', value: '90d' },
            { label: 'This Month', value: 'this_month' },
            { label: 'All Time', value: 'all' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setPeriod(item.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === item.value
                  ? 'bg-white text-[#31653a] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 mt-3 font-semibold">Calculating sales figures...</p>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="admin-glass-card rounded-3xl p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Gross Revenue
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#17301c] mt-2">
                ₹{parseFloat(kpis.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1">Period total earnings</p>
            </div>

            <div className="admin-glass-card rounded-3xl p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Total Orders
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#17301c] mt-2">
                {kpis.total_orders || 0}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1">
                {kpis.delivered_orders_count || 0} fulfilled successfully
              </p>
            </div>

            <div className="admin-glass-card rounded-3xl p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Avg Order Value
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#31653a] mt-2">
                ₹{parseFloat(kpis.average_order_value || 0).toFixed(2)}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1">Per checkout basket</p>
            </div>

            <div className="admin-glass-card rounded-3xl p-4 sm:p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Delivery Success Rate
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#17301c] mt-2">
                {kpis.total_orders > 0
                  ? ((kpis.delivered_orders_count / kpis.total_orders) * 100).toFixed(1)
                  : '100'}
                %
              </h3>
              <p className="text-[10px] text-gray-500 mt-1">Successful completions</p>
            </div>
          </div>

          {/* Revenue Trend Visualizer */}
          <div className="admin-glass-panel rounded-3xl p-5 sm:p-6 shadow-xs">
            <h3 className="font-extrabold text-sm sm:text-base text-[#17301c] mb-1">
              Periodic Revenue Trajectory
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Daily incoming transactions and checkout volume
            </p>

            <div className="flex justify-between mb-1 text-[10px] font-bold text-gray-400">
              <span>Daily revenue</span>
              <span>Highest: ₹{formatChartRevenue(maxRev)}</span>
            </div>
            <div className="h-44 sm:h-56 flex items-end gap-2 overflow-x-auto pb-2 admin-custom-scrollbar">
              {trend.map((d) => {
                const val = parseFloat(d.revenue) || 0
                const hPercent = val > 0 ? Math.max((val / maxRev) * 100, 10) : 0
                return (
                  <div key={d.date} className="relative h-full flex-1 min-w-[38px] flex flex-col items-center justify-end gap-2 group">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-12 bg-[#17301c] text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none shadow-md z-20 whitespace-nowrap">
                      ₹{val.toFixed(2)}
                    </div>

                    <span className={`text-[9px] font-black ${val > 0 ? 'text-[#31653a]' : 'text-gray-300'}`}>
                      {val > 0 ? `₹${formatChartRevenue(val)}` : '—'}
                    </span>

                    <div className="w-full max-w-[36px] bg-[#eaf3eb] rounded-xl p-1 flex items-end justify-center flex-1 min-h-[116px]">
                      <div
                        style={{ height: val > 0 ? `${hPercent}%` : '4px' }}
                        className={`w-full rounded-lg transition-all duration-300 ${
                          val > 0
                            ? 'bg-gradient-to-t from-[#31653a] to-[#438a4f] group-hover:from-[#27532f] shadow-sm'
                            : 'bg-[#d9e9db]'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(d.date).getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
            {!hasTrendRevenue && (
              <p className="text-center text-xs text-gray-400 font-medium mt-3">No sales recorded for this reporting period.</p>
            )}
          </div>

          {/* Row: Category Breakdown & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            <div className="admin-glass-panel rounded-3xl p-5 sm:p-6 shadow-xs">
              <h3 className="font-extrabold text-sm sm:text-base text-[#17301c] mb-4 pb-3 border-b border-gray-100">
                Category Contribution
              </h3>

              <div className="space-y-4">
                {report?.top_categories?.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No category data</p>
                ) : (
                  report?.top_categories?.map((cat) => {
                    const rev = parseFloat(cat.total_sales_amount) || 0
                    const totalGross = parseFloat(kpis.total_revenue) || 1
                    const percent = Math.min(Math.round((rev / totalGross) * 100), 100)

                    return (
                      <div key={cat.category_name} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-[#17301c]">{cat.category_name}</span>
                          <span className="text-[#31653a]">
                            ₹{rev.toFixed(2)} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#eaf3eb] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="h-full bg-[#31653a] rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="admin-glass-panel rounded-3xl p-5 sm:p-6 shadow-xs">
              <h3 className="font-extrabold text-sm sm:text-base text-[#17301c] mb-4 pb-3 border-b border-gray-100">
                Highest Grossing Produce Items
              </h3>

              <div className="space-y-3">
                {report?.top_products?.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No product data</p>
                ) : (
                  report?.top_products?.slice(0, 5).map((p, idx) => (
                    <div
                      key={p.product_id}
                      className="p-3 rounded-2xl bg-white/70 border border-white flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-gray-300 text-sm">#{idx + 1}</span>
                        <img
                          src={getProductImageUrl(p.product_image, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80')}
                          alt={p.product_name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#17301c]">{p.product_name}</p>
                          <p className="text-[10px] text-gray-500">{p.units_sold} units sold</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#31653a]">
                        ₹{parseFloat(p.total_revenue).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
