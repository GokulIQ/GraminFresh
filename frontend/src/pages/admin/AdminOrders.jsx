import { useState, useEffect } from 'react'
import {
  FiShoppingCart,
  FiSearch,
  FiPrinter,
  FiTruck,
  FiUser,
  FiMapPin,
  FiX,
  FiDollarSign,
} from 'react-icons/fi'
import { adminApi, extractErrorMessage } from '../../api/adminApi'
import AdminInvoiceModal from '../../components/admin/AdminInvoiceModal'
import { getProductImageUrl } from '../../utils/imageUrl'
import toast from 'react-hot-toast'

const ORDER_STATUSES = [
  'All',
  'Order Placed',
  'Confirmed',
  'Preparing',
  'Assigned',
  'Picked Up',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
]

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('All')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Order Details Modal / Drawer
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [orderDetail, setOrderDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Delivery Partners List for assignment
  const [deliveryPartners, setDeliveryPartners] = useState([])
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Status Updating state
  const [newStatus, setNewStatus] = useState('')
  const [statusComment, setStatusComment] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Invoice Modal
  const [invoiceOrderId, setInvoiceOrderId] = useState(null)

  // Fetch Delivery Partners
  useEffect(() => {
    const loadPartners = async () => {
      try {
        const res = await adminApi.getDeliveryPartners({ status: 'active', page_size: 50 })
        const partnerList = Array.isArray(res.data) ? res.data : (res.data?.items || [])
        setDeliveryPartners(partnerList)
      } catch (e) {
        // silent
      }
    }
    loadPartners()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getOrders({
        search: search ? search.trim() : undefined,
        order_status: statusTab !== 'All' ? statusTab : undefined,
        status: statusTab !== 'All' ? statusTab : undefined,
        payment_status: paymentFilter ? paymentFilter : undefined,
        page,
        page_size: 15,
      })
      setOrders(res.data.items || [])
      setTotalPages(res.data.total_pages || 1)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load orders'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [search, statusTab, paymentFilter, page])

  const openOrderDetail = async (orderId) => {
    setSelectedOrderId(orderId)
    try {
      setLoadingDetail(true)
      const res = await adminApi.getOrder(orderId)
      setOrderDetail(res.data)
      setNewStatus(res.data.order_status)
      setSelectedPartnerId(res.data.assigned_delivery_partner || res.data.delivery_partner_id || '')
      setStatusComment('')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load order details'))
      setSelectedOrderId(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleUpdateStatus = async (e) => {
    e.preventDefault()
    if (!orderDetail) return
    try {
      setUpdatingStatus(true)
      const res = await adminApi.updateOrderStatus(orderDetail.order_id, {
        order_status: newStatus,
        notes: statusComment || undefined,
      })
      setOrderDetail(res.data)
      toast.success(`Order status updated to ${newStatus}`)
      fetchOrders()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update status'))
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAssignDelivery = async (e) => {
    e.preventDefault()
    if (!selectedPartnerId) {
      toast.error('Please choose a delivery partner')
      return
    }
    try {
      setAssigning(true)
      const res = await adminApi.assignDeliveryPartner(orderDetail.order_id, {
        partner_id: parseInt(selectedPartnerId),
        notes: deliveryNotes || undefined,
      })
      setOrderDetail(res.data)
      toast.success('Delivery partner assigned successfully')
      fetchOrders()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to assign delivery partner'))
    } finally {
      setAssigning(false)
    }
  }

  const handleTogglePayment = async () => {
    if (!orderDetail) return
    const nextPaymentStatus = orderDetail.payment_status === 'Paid' ? 'Pending' : 'Paid'
    try {
      const res = await adminApi.updateOrderPayment(orderDetail.order_id, {
        payment_status: nextPaymentStatus,
      })
      setOrderDetail(res.data)
      toast.success(`Payment status set to ${nextPaymentStatus}`)
      fetchOrders()
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to update payment status'))
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      Pending: 'bg-amber-100 text-amber-900 border-amber-200',
      'Order Placed': 'bg-amber-100 text-amber-900 border-amber-200',
      Confirmed: 'bg-blue-100 text-blue-900 border-blue-200',
      Preparing: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      'Out for Delivery': 'bg-purple-100 text-purple-900 border-purple-200',
      Delivered: 'bg-[#eaf3eb] text-[#31653a] border-[#31653a]/20',
      Cancelled: 'bg-red-100 text-red-900 border-red-200',
    }
    return map[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
          Customer Order Fulfillment
        </h2>
        <p className="text-xs text-[#556957] font-medium mt-0.5">
          Process live farm orders, assign delivery riders, and print tax invoices.
        </p>
      </div>

      {/* Status Filter Tabs (Horizontal scroll on mobile) */}
      <div className="admin-glass-panel rounded-3xl p-2 sm:p-3 overflow-x-auto admin-custom-scrollbar shadow-xs">
        <div className="flex items-center gap-1.5 min-w-max">
          {ORDER_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusTab(st)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                statusTab === st
                  ? 'bg-[#31653a] text-white shadow-md shadow-[#31653a]/25'
                  : 'text-gray-600 hover:bg-white/80 hover:text-[#17301c]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Secondary Filter */}
      <div className="admin-glass-panel rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search Order ID, Customer, Phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs sm:text-sm admin-glass-input"
          />
        </div>

        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-auto px-3.5 py-2 rounded-2xl text-xs font-bold admin-glass-input"
        >
          <option value="">All Payment States</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending Payment</option>
        </select>
      </div>

      {/* Orders List Table & Mobile Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center admin-glass-panel rounded-3xl p-8">
          <FiShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="font-bold text-gray-700 text-sm">No Orders Found</h3>
          <p className="text-xs text-gray-400 mt-1">No orders matching the selected status filter.</p>
        </div>
      ) : (
        <div className="admin-glass-panel rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto admin-custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-white/40 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-3">Order ID</th>
                  <th className="py-3.5 px-3">Date & Time</th>
                  <th className="py-3.5 px-3">Customer</th>
                  <th className="py-3.5 px-3">Village / Destination</th>
                  <th className="py-3.5 px-3 text-right">Grand Total</th>
                  <th className="py-3.5 px-3 text-center">Payment</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {orders.map((o) => (
                  <tr key={o.order_id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-extrabold text-[#17301c]">
                      {o.order_id}
                    </td>

                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(o.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-bold text-[#17301c]">{o.customer_name}</p>
                      <p className="text-[10px] text-gray-500">{o.customer_mobile}</p>
                    </td>

                    <td className="py-3 px-3 text-gray-600 font-medium">
                      {o.customer_village || 'Coimbatore'}
                    </td>

                    <td className="py-3 px-3 text-right font-black text-sm text-[#17301c]">
                      ₹{parseFloat(o.grand_total).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          o.payment_status === 'Paid'
                            ? 'bg-[#eaf3eb] text-[#31653a] border-[#31653a]/20'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                          o.order_status
                        )}`}
                      >
                        {o.order_status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openOrderDetail(o.order_id)}
                        className="px-2.5 py-1.5 rounded-xl bg-white text-[#31653a] border border-[#31653a]/25 font-bold text-xs hover:bg-[#eaf3eb] shadow-xs"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => setInvoiceOrderId(o.order_id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#31653a] text-white font-bold text-xs shadow-xs hover:bg-[#27532f]"
                      >
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* Order Detail & Management Drawer / Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto admin-custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg text-[#17301c]">
                    Order #{orderDetail?.order_id}
                  </h3>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      orderDetail?.order_status
                    )}`}
                  >
                    {orderDetail?.order_status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Placed on {orderDetail?.created_at ? new Date(orderDetail.created_at).toLocaleString() : '—'}
                </p>
                {orderDetail?.expected_delivery_date && (
                  <p className="text-xs text-[#31653a] font-bold mt-0.5 bg-[#eaf3eb] inline-block px-2 py-0.5 rounded">
                    Expected: {new Date(orderDetail.expected_delivery_date).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInvoiceOrderId(orderDetail?.order_id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#31653a] text-white text-xs font-bold shadow-sm hover:bg-[#27532f]"
                >
                  <FiPrinter className="w-3.5 h-3.5" />
                  <span>Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-gray-500 mt-2">Loading order details...</p>
              </div>
            ) : orderDetail ? (
              <div className="space-y-6 mt-5 text-xs sm:text-sm">
                {/* 1. Customer & Shipping Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#f7faf6] border border-[#31653a]/15">
                  <div>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                      <FiUser className="w-3.5 h-3.5 text-[#31653a]" />
                      <span>Customer Information</span>
                    </h4>
                    <p className="font-bold text-[#17301c]">{orderDetail.customer_name}</p>
                    <p className="text-gray-600">{orderDetail.customer_mobile}</p>
                    <p className="text-gray-500">{orderDetail.customer_email || 'No email'}</p>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                      <FiMapPin className="w-3.5 h-3.5 text-[#31653a]" />
                      <span>Delivery Address</span>
                    </h4>
                    {(() => {
                      const addrObj =
                        typeof orderDetail.delivery_address === 'object' &&
                        orderDetail.delivery_address !== null
                          ? orderDetail.delivery_address
                          : null

                      const line = addrObj
                        ? addrObj.address || addrObj.address_line || ''
                        : typeof orderDetail.delivery_address === 'string'
                        ? orderDetail.delivery_address
                        : ''
                      const village = addrObj?.village || orderDetail.delivery_village || ''
                      const district = addrObj?.district || orderDetail.delivery_district || ''
                      const pincode = addrObj?.pincode || orderDetail.delivery_pincode || ''
                      const landmark = addrObj?.landmark || ''
                      const recipient = addrObj?.full_name || ''
                      const phone = addrObj?.mobile_number || ''

                      return (
                        <div className="space-y-0.5">
                          {recipient && (
                            <p className="font-bold text-[#17301c]">
                              {recipient} {phone && <span className="text-gray-500 font-normal">({phone})</span>}
                            </p>
                          )}
                          <p className="text-gray-700 font-medium">{line || 'Standard Village Delivery'}</p>
                          {landmark && (
                            <p className="text-[11px] text-gray-500">Landmark: {landmark}</p>
                          )}
                          <p className="text-gray-600">
                            {[village, district].filter(Boolean).join(', ')} {pincode ? `- ${pincode}` : ''}
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* 2. Order Items Table */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Ordered Produce Items ({orderDetail.items?.length || 0})
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Price</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orderDetail.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getProductImageUrl(item.product_image)}
                                  alt={item.product_name}
                                  className="w-8 h-8 rounded-lg object-cover bg-[#eaf3eb]"
                                />
                                <span className="font-bold text-[#17301c]">{item.product_name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600">{item.unit}</td>
                            <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600">₹{parseFloat(item.price).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-black text-[#17301c]">
                              ₹{parseFloat(item.total).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pricing Total Breakdown */}
                  <div className="mt-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-end space-y-1 text-xs">
                    <div className="flex justify-between w-48 text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-bold">₹{parseFloat(orderDetail.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48 text-gray-600">
                      <span>Delivery Fee:</span>
                      <span className="font-bold">₹{parseFloat(orderDetail.delivery_charge).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48 text-sm font-black text-[#17301c] pt-2 border-t border-gray-200">
                      <span>Grand Total:</span>
                      <span className="text-[#31653a] text-base">₹{parseFloat(orderDetail.grand_total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Action 1: Status Progression Updater */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Update Order Status
                  </h4>
                  <form onSubmit={handleUpdateStatus} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">
                          New Lifecycle Status
                        </label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50"
                        >
                          <option value="Pending">Order Placed / Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Preparing">Preparing Order</option>
                          <option value="Assigned">Assigned</option>
                          <option value="Picked Up">Picked Up</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">
                          Optional Status Note
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Packed from farm cold store"
                          value={statusComment}
                          onChange={(e) => setStatusComment(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={updatingStatus}
                        className="px-4 py-2 rounded-xl bg-[#31653a] text-white text-xs font-bold shadow-sm hover:bg-[#27532f]"
                      >
                        {updatingStatus ? 'Updating...' : 'Update Status'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 4. Action 2: Assign Delivery Rider & Payment Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Delivery Partner */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FiTruck className="w-4 h-4 text-[#31653a]" />
                      <span>Delivery Assignment</span>
                    </h4>
                    <form onSubmit={handleAssignDelivery} className="space-y-3">
                      <select
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50"
                      >
                        <option value="">Select Delivery Partner</option>
                        {deliveryPartners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.name} ({p.vehicle_type || 'Bike'} - {p.phone})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Instructions for rider (e.g. Call before arrival)"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50"
                      />

                      <button
                        type="submit"
                        disabled={assigning}
                        className="w-full py-2 rounded-xl bg-[#17301c] text-white text-xs font-bold hover:bg-[#25462c]"
                      >
                        {assigning ? 'Assigning...' : 'Assign Partner'}
                      </button>
                    </form>
                  </div>

                  {/* Payment Status Toggle */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FiDollarSign className="w-4 h-4 text-[#31653a]" />
                        <span>Payment Status</span>
                      </h4>
                      <p className="text-xs text-gray-600">
                        Method: <span className="font-bold">{orderDetail.payment_method || 'COD'}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Current: <span className="font-extrabold text-[#31653a]">{orderDetail.payment_status}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTogglePayment}
                      className="mt-4 w-full py-2 rounded-xl border-2 border-[#31653a] text-[#31653a] font-bold text-xs hover:bg-[#eaf3eb] transition-colors"
                    >
                      Toggle to {orderDetail.payment_status === 'Paid' ? 'Pending' : 'Paid'}
                    </button>
                  </div>
                </div>

                {/* 5. Status History Timeline */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs mt-4">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">
                    Status History Timeline
                  </h4>
                  {orderDetail?.status_history?.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                      {orderDetail.status_history.map((hist, i) => (
                        <div key={hist.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full border border-white bg-slate-300 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" style={{ zIndex: 1, backgroundColor: '#31653a' }}></div>
                          <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-bold text-slate-900 text-[11px]">{hist.status}</div>
                              <time className="font-caveat font-medium text-indigo-500 text-[10px]">{new Date(hist.updated_at).toLocaleString()}</time>
                            </div>
                            <div className="text-slate-500 text-[10px]">{hist.notes || 'Status updated'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No status history available.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrderId && (
        <AdminInvoiceModal
          orderId={invoiceOrderId}
          onClose={() => setInvoiceOrderId(null)}
        />
      )}
    </div>
  )
}
