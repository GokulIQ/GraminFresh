import { useState, useEffect } from 'react'
import {
  FiTruck,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiPhone,
  FiMapPin,
  FiX,
  FiPackage,
} from 'react-icons/fi'
import { adminApi, extractErrorMessage } from '../../api/adminApi'
import toast from 'react-hot-toast'

function RiderAssignmentsModal({ partner, onClose }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true)
        const res = await adminApi.getDeliveryPartnerOrders(partner.id)
        setTrips(res.data || [])
      } catch (err) {
        toast.error('Failed to load rider assignments')
      } finally {
        setLoading(false)
      }
    }
    fetchTrips()
  }, [partner.id])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl admin-glass-modal rounded-3xl p-6 shadow-2xl mt-8 sm:mt-12 mb-10">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-base text-[#17301c]">
              Assigned Trips: {partner.full_name || partner.name}
            </h3>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              {partner.partner_id} • {partner.vehicle_type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 max-h-96 overflow-y-auto admin-custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[11px] text-gray-500 mt-2">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <p className="text-xs text-gray-400 py-12 text-center">No assignments found for this rider.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Assigned At</th>
                  <th className="py-2.5 px-3">Delivery Notes</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#17301c]">{t.order_id}</td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {new Date(t.assigned_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate">{t.notes || '—'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'Delivered'
                          ? 'bg-[#eaf3eb] text-[#31653a]'
                          : 'bg-blue-50 text-blue-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminDelivery() {
  const [partners, setPartners] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)
  const [selectedPartnerForTrips, setSelectedPartnerForTrips] = useState(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    vehicle_type: 'Motorcycle',
    vehicle_number: '',
    current_location: 'Pollachi Main Hub',
    status: 'active',
  })
  const [saving, setSaving] = useState(false)

  const fetchDeliveryData = async () => {
    try {
      setLoading(true)
      const [partnersRes, assignmentsRes] = await Promise.all([
        adminApi.getDeliveryPartners({
          search: search || undefined,
          status: statusFilter || undefined,
          page_size: 50,
        }),
        adminApi.getDeliveryAssignments(20),
      ])
      
      const partnerData = Array.isArray(partnersRes.data)
        ? partnersRes.data
        : (partnersRes.data?.items || [])
      const assignmentData = Array.isArray(assignmentsRes.data)
        ? assignmentsRes.data
        : (assignmentsRes.data?.items || [])

      setPartners(partnerData)
      setAssignments(assignmentData)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load delivery data'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeliveryData()
  }, [search, statusFilter])

  const openAddModal = () => {
    setEditingPartner(null)
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      password: '',
      vehicle_type: 'Motorcycle',
      vehicle_number: '',
      current_location: 'Pollachi Main Hub',
      status: 'active',
      availability_status: 'Available',
    })
    setModalOpen(true)
  }

  const openEditModal = (p) => {
    setEditingPartner(p)
    setFormData({
      full_name: p.full_name || p.name || '',
      phone: p.phone || '',
      email: p.email || '',
      password: '',
      vehicle_type: p.vehicle_type || 'Motorcycle',
      vehicle_number: p.vehicle_number || '',
      current_location: p.current_location || '',
      status: p.status || 'active',
      availability_status: p.availability_status || 'Available',
    })
    setModalOpen(true)
  }

  const handleSavePartner = async (e) => {
    e.preventDefault()
    if (!formData.full_name?.trim()) return toast.error('Partner full name is required')
    if (!formData.phone?.trim()) return toast.error('Phone number is required')
    if (!formData.email?.trim()) return toast.error('Email is required')
    if (!editingPartner && !formData.password) return toast.error('Password is required')

    const cleanPhone = formData.phone.trim()
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return toast.error('Please enter a valid 10-digit mobile number starting with 6-9')
    }

    const payload = {
      full_name: formData.full_name.trim(),
      phone: cleanPhone,
      email: formData.email.trim(),
      vehicle_type: formData.vehicle_type || 'Bike',
      vehicle_number: formData.vehicle_number?.trim() || null,
      current_location: formData.current_location?.trim() || 'Main Hub',
      status: formData.status || 'active',
      availability_status: formData.availability_status || 'Available',
    }

    if (formData.password) {
      payload.password = formData.password
    }

    try {
      setSaving(true)
      if (editingPartner) {
        await adminApi.updateDeliveryPartner(editingPartner.id, payload)
        toast.success('Delivery partner updated')
      } else {
        await adminApi.createDeliveryPartner(payload)
        toast.success('New delivery partner registered')
      }
      setModalOpen(false)
      fetchDeliveryData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save delivery partner'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (partner) => {
    try {
      await adminApi.toggleDeliveryPartnerStatus(partner.id)
      toast.success(`Partner status updated`)
      fetchDeliveryData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update status'))
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
            Delivery Fleet & Logistics
          </h2>
          <p className="text-xs text-[#556957] font-medium mt-0.5">
            Manage field drivers, vehicle assignments, and real-time delivery orders.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#31653a] hover:bg-[#27532f] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#31653a]/25 transition-all"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Delivery Partner</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="admin-glass-panel rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search rider name, phone, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs sm:text-sm admin-glass-input"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-2xl">
          {[
            { label: 'All', value: '' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.value
                  ? 'bg-white text-[#31653a] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading delivery fleet...</p>
        </div>
      ) : partners.length === 0 ? (
        <div className="admin-glass-panel rounded-3xl p-12 text-center">
          <FiTruck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-base text-[#17301c]">No delivery partners registered</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Click "Add Delivery Partner" to onboard your first dispatch rider or delivery associate.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p) => {
            const partnerName = p.full_name || p.name || 'Unnamed Partner'
            return (
              <div
                key={p.id}
                className="admin-glass-card rounded-3xl p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#31653a] to-[#438a4f] text-white flex items-center justify-center text-xl shadow-md shadow-[#31653a]/25">
                        <FiTruck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#17301c]">{partnerName}</h3>
                        <p className="text-xs text-gray-500 font-medium">{p.vehicle_type || 'Motorcycle'}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          p.status === 'active'
                            ? 'bg-[#eaf3eb] text-[#31653a] border-[#31653a]/20'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {p.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                        p.availability_status === 'Available'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.availability_status || 'Available'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-gray-600 bg-white/50 p-3 rounded-2xl border border-white">
                    <div className="flex items-center gap-2">
                      <FiPhone className="w-3.5 h-3.5 text-[#31653a]" />
                      <span className="font-semibold">{p.phone}</span>
                    </div>
                    {p.email && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-400">Email:</span>
                        <span className="font-semibold truncate">{p.email}</span>
                      </div>
                    )}
                    {p.vehicle_number && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-400">Reg:</span>
                        <span className="font-mono font-bold text-gray-800">{p.vehicle_number}</span>
                      </div>
                    )}
                    {p.current_location && (
                      <div className="flex items-center gap-2">
                        <FiMapPin className="w-3.5 h-3.5 text-[#31653a]" />
                        <span className="truncate">{p.current_location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedPartnerForTrips(p)}
                    className="flex items-center gap-1.5 hover:text-[#31653a] text-left transition-colors"
                    title="View assigned orders for this rider"
                  >
                    <FiPackage className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-gray-700 hover:underline">
                      {p.active_orders_count || 0} active trips
                    </span>
                  </button>
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2 rounded-xl text-gray-600 hover:bg-white hover:text-[#31653a] transition-colors"
                    title="Edit partner"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Active Assignments Section */}
      <div className="admin-glass-panel rounded-3xl p-5 sm:p-6 shadow-xs">
        <h3 className="font-extrabold text-sm sm:text-base text-[#17301c] mb-3 pb-3 border-b border-gray-100">
          Recent Delivery Assignments
        </h3>

        {assignments.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No active delivery assignments.</p>
        ) : (
          <div className="overflow-x-auto admin-custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Driver Name</th>
                  <th className="py-2.5 px-3">Assigned Time</th>
                  <th className="py-2.5 px-3">Delivery Notes</th>
                  <th className="py-2.5 px-3 text-center">Trip Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {assignments.map((asg) => (
                  <tr key={asg.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#17301c]">{asg.order_id}</td>
                    <td className="py-2.5 px-3 font-bold text-[#17301c]">{asg.partner_name}</td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {new Date(asg.assigned_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate">{asg.notes || asg.delivery_notes || '—'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                        {asg.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Partner Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-md admin-glass-modal rounded-3xl p-6 shadow-2xl mt-8 sm:mt-12 mb-10">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-[#17301c]">
                {editingPartner ? 'Edit Delivery Partner' : 'Register New Partner'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senthil Kumar"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
                <p className="text-[10px] text-gray-400 mt-1">10-digit number starting with 6, 7, 8, or 9</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="partner@villagefarm.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Password {!editingPartner && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  required={!editingPartner}
                  placeholder={editingPartner ? "Leave blank to keep current" : "Min 6 characters"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Mini Van">Mini Van</option>
                    <option value="Electric Bike">Electric Bike</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Vehicle Reg Number
                  </label>
                  <input
                    type="text"
                    placeholder="TN 38 AB 1234"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Assigned Hub / Location
                </label>
                <input
                  type="text"
                  placeholder="Pollachi South Hub"
                  value={formData.current_location}
                  onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Account Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Availability Status
                </label>
                <select
                  value={formData.availability_status}
                  onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#31653a] hover:bg-[#27532f] shadow-md shadow-[#31653a]/25"
                >
                  {saving ? 'Saving...' : editingPartner ? 'Save Changes' : 'Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rider Assignments Modal */}
      {selectedPartnerForTrips && (
        <RiderAssignmentsModal
          partner={selectedPartnerForTrips}
          onClose={() => setSelectedPartnerForTrips(null)}
        />
      )}
    </div>
  )
}
