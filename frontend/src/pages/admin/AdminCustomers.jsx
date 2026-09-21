import { useState, useEffect } from 'react'
import {
  FiUsers,
  FiSearch,
  FiEye,
  FiX,
} from 'react-icons/fi'
import { adminApi } from '../../api/adminApi'
import AdminInvoiceModal from '../../components/admin/AdminInvoiceModal'
import toast from 'react-hot-toast'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Customer Detail Drawer / Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [customerDetail, setCustomerDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null)

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getCustomers({
        search: search || undefined,
        page,
        page_size: 15,
      })
      setCustomers(res.data.items || [])
      setTotalPages(res.data.total_pages || 1)
    } catch (err) {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [search, page])

  const openCustomerDetail = async (id) => {
    setSelectedCustomerId(id)
    try {
      setLoadingDetail(true)
      const res = await adminApi.getCustomer(id)
      setCustomerDetail(res.data)
    } catch (e) {
      toast.error('Failed to fetch customer details')
      setSelectedCustomerId(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleToggleStatus = async (customer) => {
    const newStatus = customer.status === 'active' ? 'disabled' : 'active'
    try {
      await adminApi.updateCustomerStatus(customer.id, newStatus)
      toast.success(`Customer marked as ${newStatus}`)
      fetchCustomers()
      if (customerDetail && customerDetail.id === customer.id) {
        setCustomerDetail({ ...customerDetail, status: newStatus })
      }
    } catch (e) {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
          Customer Directory & Profiles
        </h2>
        <p className="text-xs text-[#556957] font-medium mt-0.5">
          View registered buyers, delivery addresses, and spending metrics.
        </p>
      </div>

      {/* Search Bar */}
      <div className="admin-glass-panel rounded-3xl p-4 flex items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, phone, email, village..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs sm:text-sm admin-glass-input"
          />
        </div>
      </div>

      {/* Customer Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="py-16 text-center admin-glass-panel rounded-3xl p-8">
          <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="font-bold text-gray-700 text-sm">No Customers Found</h3>
          <p className="text-xs text-gray-400 mt-1">Try another search keyword.</p>
        </div>
      ) : (
        <div className="admin-glass-panel rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto admin-custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-white/40 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-3">Customer</th>
                  <th className="py-3.5 px-3">Contact</th>
                  <th className="py-3.5 px-3">Village / Location</th>
                  <th className="py-3.5 px-3 text-center">Orders</th>
                  <th className="py-3.5 px-3 text-right">Total Spent</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {customers.map((c) => {
                  const customerName = c.full_name || c.name || 'Customer'
                  const ordersCount = c.orders_count ?? c.total_orders ?? 0
                  const totalSpent = parseFloat(c.total_spending ?? c.total_spent ?? 0).toFixed(2)
                  const custStatus = c.status || 'active'
                  return (
                    <tr key={c.id} className="hover:bg-white/60 transition-colors">
                      {/* Customer Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-[#eaf3eb] text-[#31653a] font-black text-sm flex items-center justify-center border border-[#31653a]/20 shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-[#17301c] truncate">{customerName}</p>
                            <p className="text-[10px] text-gray-400">ID: {c.customer_id || `#${c.id}`}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-800">{c.mobile_number || '—'}</p>
                        <p className="text-[10px] text-gray-500 truncate max-w-[140px]">{c.email || '—'}</p>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3">
                        <span className="text-gray-700 font-medium">{c.village || '—'}</span>
                      </td>

                      {/* Orders Count */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold bg-[#eaf3eb] text-[#31653a] px-2 py-0.5 rounded-lg border border-[#31653a]/20">
                          {ordersCount}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-3 text-right font-extrabold text-[#17301c]">
                        ₹{totalSpent}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(c)}
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border transition-colors ${
                            custStatus === 'active'
                              ? 'bg-[#eaf3eb] text-[#31653a] border-[#31653a]/20 hover:bg-emerald-100'
                              : 'bg-red-100 text-red-900 border-red-200 hover:bg-red-200'
                          }`}
                        >
                          {custStatus === 'active' ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      {/* View Details Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openCustomerDetail(c.id)}
                          className="px-3 py-1.5 rounded-xl bg-white text-[#31653a] border border-[#31653a]/25 font-bold text-xs hover:bg-[#eaf3eb] shadow-xs flex items-center gap-1 ml-auto transition-colors"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs font-bold text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Customer Detail Modal / Drawer */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto admin-custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#31653a] to-[#438a4f] text-white font-black text-xl flex items-center justify-center shadow-md shadow-[#31653a]/25">
                  {(customerDetail?.full_name || customerDetail?.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#17301c]">
                    {customerDetail?.full_name || customerDetail?.name || 'Customer Profile'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Customer ID {customerDetail?.customer_id || `#${customerDetail?.id || selectedCustomerId}`} • Registered{' '}
                    {customerDetail?.created_at ? new Date(customerDetail.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-gray-500 mt-2 font-medium">Loading profile...</p>
              </div>
            ) : customerDetail ? (
              <div className="space-y-6 mt-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#eaf3eb] border border-[#31653a]/20 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Spent</p>
                    <p className="text-base font-black text-[#31653a] mt-1">
                      ₹{parseFloat(customerDetail.total_spending ?? customerDetail.total_spent ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Orders</p>
                    <p className="text-base font-black text-blue-700 mt-1">
                      {customerDetail.orders_count ?? customerDetail.total_orders ?? 0}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Phone</p>
                    <p className="text-xs font-bold text-purple-900 mt-1.5 truncate">
                      {customerDetail.mobile_number || '—'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Account Status</p>
                    <p className="text-xs font-black uppercase text-amber-900 mt-1.5">
                      {customerDetail.status || 'active'}
                    </p>
                  </div>
                </div>

                {/* Addresses */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                    Registered Delivery Addresses ({(customerDetail.addresses || []).length})
                  </h4>
                  {(!customerDetail.addresses || customerDetail.addresses.length === 0) ? (
                    <p className="text-xs text-gray-400 italic">No saved addresses</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customerDetail.addresses.map((a, idx) => {
                        const recipient = a.full_name || a.recipient_name || customerDetail.full_name || 'Recipient'
                        const addrLine = a.address || a.address_line || ''
                        const locationParts = [a.village, a.district, a.state].filter(Boolean).join(', ')
                        return (
                          <div
                            key={a.id || idx}
                            className="p-3 rounded-2xl bg-gray-50/80 border border-gray-200/70 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#17301c]">{recipient}</span>
                              {a.is_default && (
                                <span className="text-[10px] bg-[#eaf3eb] text-[#31653a] font-bold px-1.5 py-0.5 rounded border border-[#31653a]/20">
                                  Default
                                </span>
                              )}
                            </div>
                            {addrLine && <p className="text-gray-600">{addrLine}</p>}
                            <p className="text-gray-600 font-medium">
                              {locationParts} {a.pincode ? `- ${a.pincode}` : ''}
                            </p>
                            <p className="text-gray-500 text-[11px]">Phone: {a.mobile_number || '—'}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Orders History */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                    Order History
                  </h4>
                  {(() => {
                    const ordersList = customerDetail.recent_orders || customerDetail.orders || []
                    if (ordersList.length === 0) {
                      return <p className="text-xs text-gray-400 italic">No previous orders</p>
                    }
                    return (
                      <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Order ID</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3 text-right">Amount</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Invoice</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {ordersList.map((o) => (
                              <tr key={o.order_id || o.id} className="hover:bg-gray-50/60">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#17301c]">{o.order_id}</td>
                                <td className="py-2.5 px-3 text-gray-500">
                                  {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-[#17301c]">
                                  ₹{parseFloat(o.grand_total ?? o.total_amount ?? 0).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaf3eb] text-[#31653a] border border-[#31653a]/20">
                                    {o.order_status || o.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => setSelectedInvoiceOrderId(o.order_id)}
                                    className="text-xs font-bold text-[#31653a] hover:underline"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Invoice Modal from within Customer View */}
      {selectedInvoiceOrderId && (
        <AdminInvoiceModal
          orderId={selectedInvoiceOrderId}
          onClose={() => setSelectedInvoiceOrderId(null)}
        />
      )}
    </div>
  )
}
