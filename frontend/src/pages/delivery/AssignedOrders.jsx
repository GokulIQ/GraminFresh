import { useState, useEffect } from 'react'
import {
  FiMapPin,
  FiPhone,
  FiDollarSign,
  FiLayers,
  FiCalendar,
  FiEdit,
  FiNavigation,
  FiCheckCircle,
  FiTruck,
  FiSmile
} from 'react-icons/fi'
import { deliveryApi, extractErrorMessage } from '../../api/deliveryApi'
import toast from 'react-hot-toast'

export default function AssignedOrders() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState(null)
  
  // Note/Status Comment state
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedAsg, setSelectedAsg] = useState(null)
  const [nextTargetStatus, setNextTargetStatus] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  const fetchAssignedTrips = async () => {
    try {
      setLoading(true)
      const res = await deliveryApi.getAssignedOrders()
      setAssignments(res.data || [])
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to fetch assigned orders'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignedTrips()
  }, [])

  const handleOpenCommentModal = (asg, targetStatus) => {
    setSelectedAsg(asg)
    setNextTargetStatus(targetStatus)
    setDeliveryNotes(asg.notes || '')
    setCommentModalOpen(true)
  }

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault()
    if (!selectedAsg) return

    setCommentModalOpen(false)
    const asgId = selectedAsg.id
    try {
      setSubmittingId(asgId)
      await deliveryApi.updateDeliveryStatus(asgId, nextTargetStatus, deliveryNotes.trim())
      toast.success(`Trip status set to ${nextTargetStatus}`)
      
      // Update local state without full reload
      setAssignments((prev) => 
        prev.map((item) => 
          item.id === asgId 
            ? { ...item, status: nextTargetStatus, notes: deliveryNotes.trim() } 
            : item
        ).filter((item) => nextTargetStatus !== 'Delivered' || item.id !== asgId) // Filter out Delivered items from active list
      )
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update delivery status'))
    } finally {
      setSubmittingId(null)
      setSelectedAsg(null)
    }
  }

  // Quick Direct Transition (e.g. Accept)
  const handleTransitionDirect = async (asgId, targetStatus) => {
    try {
      setSubmittingId(asgId)
      await deliveryApi.updateDeliveryStatus(asgId, targetStatus, '')
      toast.success(`Trip status set to ${targetStatus}`)
      
      setAssignments((prev) => 
        prev.map((item) => 
          item.id === asgId 
            ? { ...item, status: targetStatus } 
            : item
        )
      )
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to transition status'))
    } finally {
      setSubmittingId(null)
    }
  }

  const getWorkflowButton = (asg) => {
    const isProcessing = submittingId === asg.id

    switch (asg.status) {
      case 'Assigned':
        return (
          <button
            onClick={() => handleTransitionDirect(asg.id, 'Accepted')}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#31653a] hover:bg-[#27532f] text-white font-extrabold text-xs tracking-wide transition-all shadow-md shadow-[#31653a]/25 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Accept Delivery'}
          </button>
        )
      case 'Accepted':
        return (
          <button
            onClick={() => handleOpenCommentModal(asg, 'Picked Up')}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wide transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50"
          >
            <FiLayers className="w-4 h-4" />
            <span>Mark Picked Up</span>
          </button>
        )
      case 'Picked Up':
        return (
          <button
            onClick={() => handleOpenCommentModal(asg, 'Out for Delivery')}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs tracking-wide transition-all shadow-md shadow-purple-600/25 disabled:opacity-50"
          >
            <FiNavigation className="w-4 h-4" />
            <span>Mark Out for Delivery</span>
          </button>
        )
      case 'Out for Delivery':
        return (
          <button
            onClick={() => handleOpenCommentModal(asg, 'Delivered')}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wide transition-all shadow-md shadow-emerald-600/25 disabled:opacity-50"
          >
            <FiCheckCircle className="w-4 h-4" />
            <span>Mark Delivered</span>
          </button>
        )
      default:
        return (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 font-extrabold text-xs tracking-wide border border-gray-200"
          >
            <FiSmile className="w-4 h-4" />
            <span>Completed</span>
          </button>
        )
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'Accepted':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200'
      case 'Picked Up':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'Out for Delivery':
        return 'bg-purple-50 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
          Active Assigned Trips
        </h2>
        <p className="text-xs text-[#556957] font-medium mt-0.5">
          Accept requests, update logs and mark orders as delivered at customer locations.
        </p>
      </div>

      {/* Main List */}
      {loading && assignments.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="admin-glass-panel rounded-3xl p-12 text-center border border-white">
          <FiTruck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-base text-[#17301c]">No active trips assigned</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            You have completed all deliveries or are waiting for the admin to assign a new order.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((asg) => (
            <div
              key={asg.id}
              className="admin-glass-card rounded-3xl p-5 border border-white/80 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* ID & Status */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order ID</span>
                    <h4 className="font-mono font-black text-sm text-[#17301c]">{asg.order_id}</h4>
                    {asg.expected_delivery_date && (
                      <span className="text-[10px] text-[#31653a] font-bold bg-[#eaf3eb] px-1.5 py-0.5 rounded mt-1 inline-block">
                        Expected: {new Date(asg.expected_delivery_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(asg.status)}`}>
                    {asg.status}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <FiMapPin className="text-[#31653a] w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Deliver Address</p>
                      <p className="font-semibold text-gray-700 mt-0.5">{asg.delivery_address || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <FiPhone className="text-[#31653a] w-3.5 h-3.5 shrink-0" />
                      <div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Customer</p>
                        <p className="font-bold text-gray-800">{asg.customer_name || '—'}</p>
                        {asg.customer_phone && (
                          <a href={`tel:${asg.customer_phone}`} className="mt-1 flex items-center justify-center gap-1 bg-[#31653a] text-white text-[10px] font-bold py-1 px-2 rounded w-full active:bg-[#27532f]">
                            <FiPhone className="w-3 h-3" />
                            Call Customer
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FiDollarSign className="text-[#31653a] w-3.5 h-3.5 shrink-0" />
                      <div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Payment</p>
                        <p className="font-bold text-gray-800">₹{asg.total_amount || '—'}</p>
                        <span className="text-[9px] uppercase font-extrabold bg-[#eaf3eb] text-[#31653a] px-1 rounded">
                          {asg.payment_method || 'COD'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional notes / dates */}
                <div className="bg-white/50 p-3 rounded-2xl border border-white text-[11px] text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Assigned At:</span>
                    <span className="font-bold text-gray-700">
                      {new Date(asg.assigned_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {asg.notes && (
                    <div className="pt-1.5 border-t border-gray-100 mt-1">
                      <span className="font-bold text-gray-400">Notes:</span>
                      <p className="italic text-gray-600 mt-0.5">{asg.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-gray-100">
                {getWorkflowButton(asg)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note / Comments Modal Popup */}
      {commentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-md admin-glass-modal rounded-3xl p-6 shadow-2xl">
            <h3 className="font-extrabold text-base text-[#17301c] pb-3 border-b border-gray-100">
              Update Status Notes
            </h3>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Confirm Transition Status
                </label>
                <input
                  type="text"
                  disabled
                  value={`Transitioning to: ${nextTargetStatus}`}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 text-gray-600 font-bold border border-gray-200 text-xs text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Delivery Notes / Remark (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Order picked up from dispatch counter / Left package at security gate."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCommentModalOpen(false)
                    setSelectedAsg(null)
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#31653a] hover:bg-[#27532f] shadow-md shadow-[#31653a]/25"
                >
                  Confirm Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
