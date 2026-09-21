import { useState } from 'react'
import {
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiTruck,
  FiInfo,
  FiKey
} from 'react-icons/fi'
import { useDeliveryAuth } from '../../context/DeliveryAuthContext'
import { deliveryApi, extractErrorMessage } from '../../api/deliveryApi'
import toast from 'react-hot-toast'

export default function DeliveryProfile() {
  const { partner, updatePartnerState } = useDeliveryAuth()
  
  // Profile Fields Form
  const [formData, setFormData] = useState({
    full_name: partner?.full_name || '',
    phone: partner?.phone || '',
    email: partner?.email || '',
    vehicle_type: partner?.vehicle_type || 'Bike',
    vehicle_number: partner?.vehicle_number || '',
    current_location: partner?.current_location || ''
  })

  // Password Fields Form
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirm_password: ''
  })

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!formData.full_name.trim()) return toast.error('Full name is required')
    if (!formData.phone.trim()) return toast.error('Phone number is required')
    if (!formData.email.trim()) return toast.error('Email is required')

    const cleanPhone = formData.phone.trim()
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return toast.error('Please enter a valid 10-digit mobile number')
    }

    try {
      setSavingProfile(true)
      const res = await deliveryApi.updateProfile({
        full_name: formData.full_name.trim(),
        phone: cleanPhone,
        email: formData.email.trim(),
        vehicle_type: formData.vehicle_type,
        vehicle_number: formData.vehicle_number.trim() || null,
        current_location: formData.current_location.trim() || null
      })
      updatePartnerState(res.data)
      toast.success('Profile details updated successfully')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update profile details'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!passwordData.password) return toast.error('New password is required')
    if (passwordData.password.length < 6) return toast.error('Password must be at least 6 characters long')
    if (passwordData.password !== passwordData.confirm_password) return toast.error('Passwords do not match')

    try {
      setSavingPassword(true)
      const res = await deliveryApi.updateProfile({
        password: passwordData.password
      })
      updatePartnerState(res.data)
      toast.success('Password updated successfully')
      setPasswordData({ password: '', confirm_password: '' })
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update password'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
          Delivery Partner Profile
        </h2>
        <p className="text-xs text-[#556957] font-medium mt-0.5">
          View your logistic credentials and update contact details and secure passwords.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Details (Column 1 - Info display) */}
        <div className="md:col-span-1 space-y-6">
          <div className="admin-glass-panel rounded-3xl p-6 border border-white text-center">
            <div className="w-20 h-20 rounded-full bg-[#31653a] text-white flex items-center justify-center text-3xl font-bold mx-auto border-4 border-white shadow-md">
              {partner?.full_name?.charAt(0) || 'D'}
            </div>
            <h3 className="font-extrabold text-base text-[#17301c] mt-3">{partner?.full_name}</h3>
            <p className="text-xs text-gray-500 font-semibold">{partner?.partner_id}</p>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5 text-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold">Account Status</span>
                <span className="font-extrabold text-[#31653a] bg-[#eaf3eb] px-2 py-0.5 rounded border border-[#31653a]/25 text-[10px] capitalize">
                  {partner?.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold">Duty Availability</span>
                <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                  {partner?.availability_status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold">Active Deliveries</span>
                <span className="font-extrabold text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-[10px]">
                  {partner?.active_orders_count || 0} active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Inputs (Column 2 - Updates) */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit details form */}
          <div className="admin-glass-panel rounded-3xl p-6 border border-white">
            <h4 className="font-black text-sm text-[#17301c] flex items-center gap-2 pb-3 border-b border-gray-100">
              <FiInfo className="text-[#31653a] w-4.5 h-4.5" />
              <span>Contact & Logistics Information</span>
            </h4>

            <form onSubmit={handleUpdateProfile} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-3 text-gray-400 w-4.5 h-4.5" />
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-2xl admin-glass-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Mobile Number</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-3 text-gray-400 w-4.5 h-4.5" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-2xl admin-glass-input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-3 text-gray-400 w-4.5 h-4.5" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl admin-glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Vehicle Type</label>
                  <div className="relative">
                    <FiTruck className="absolute left-3 top-3 text-gray-400 w-4.5 h-4.5" />
                    <select
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-2xl admin-glass-input"
                    >
                      <option value="Bike">Motorcycle</option>
                      <option value="Scooter">Scooter</option>
                      <option value="Mini Van">Mini Van</option>
                      <option value="Electric Bike">Electric Bike</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Vehicle Plate Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TN-38-CD-5678"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Current Hub / Location</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-3 text-gray-400 w-4.5 h-4.5" />
                  <input
                    type="text"
                    value={formData.current_location}
                    onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl admin-glass-input"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#31653a] hover:bg-[#27532f] shadow-md shadow-[#31653a]/25 disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Change password form */}
          <div className="admin-glass-panel rounded-3xl p-6 border border-white">
            <h4 className="font-black text-sm text-[#17301c] flex items-center gap-2 pb-3 border-b border-gray-100">
              <FiKey className="text-[#31653a] w-4.5 h-4.5" />
              <span>Change Security Password</span>
            </h4>

            <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#31653a] hover:bg-[#27532f] shadow-md shadow-[#31653a]/25 disabled:opacity-60"
                >
                  {savingPassword ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
