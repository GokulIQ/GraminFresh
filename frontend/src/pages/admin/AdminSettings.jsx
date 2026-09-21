import { useState, useEffect } from 'react'
import {
  FiSettings,
  FiUser,
  FiLock,
  FiActivity,
  FiSave,
} from 'react-icons/fi'
import { adminApi, extractErrorMessage } from '../../api/adminApi'
import { useAdminAuth } from '../../context/AdminAuthContext'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const { admin, updateAdminState } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('store')

  // Store & Logistics Settings State
  const [settings, setSettings] = useState({
    store_name: 'GraminFresh',
    store_phone: '+91 98765 43210',
    store_email: 'support@graminfresh.com',
    store_address: 'GraminFresh Freshness Depot, Farm Road, Pollachi, TN - 642001',
    delivery_fee: '30.00',
    free_delivery_threshold: '500.00',
    low_stock_threshold: '5',
  })
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Profile Form State
  const [profileName, setProfileName] = useState(admin?.full_name || '')
  const [profilePhone, setProfilePhone] = useState(admin?.phone || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Audit Logs State
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true)
        const res = await adminApi.getSettings()
        if (res.data && Object.keys(res.data).length > 0) {
          setSettings((prev) => ({ ...prev, ...res.data }))
        }
      } catch (err) {
        // use defaults
      } finally {
        setLoadingSettings(false)
      }
    }
    loadSettings()
  }, [])

  // Load Audit Logs when tab is opened
  useEffect(() => {
    if (activeTab === 'logs') {
      const loadLogs = async () => {
        try {
          setLoadingLogs(true)
          const res = await adminApi.getSystemLogs({ limit: 30 })
          setLogs(res.data.items || [])
        } catch (e) {
          toast.error(extractErrorMessage(e, 'Failed to load activity logs'))
        } finally {
          setLoadingLogs(false)
        }
      }
      loadLogs()
    }
  }, [activeTab])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    try {
      setSavingSettings(true)
      await adminApi.updateSettings(settings)
      toast.success('Store & Delivery parameters updated successfully')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save settings'))
    } finally {
      setSavingSettings(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      setSavingProfile(true)
      const res = await adminApi.updateProfile({
        full_name: profileName.trim(),
        phone: profilePhone.trim(),
      })
      updateAdminState(res.data)
      toast.success('Profile details updated')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update profile'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setChangingPassword(true)
      await adminApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      })
      toast.success('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update password'))
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
          System Administration & Settings
        </h2>
        <p className="text-xs text-[#556957] font-medium mt-0.5">
          Configure business rules, fee structures, security credentials, and audit trails.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="admin-glass-panel rounded-3xl p-2 flex items-center gap-1.5 overflow-x-auto admin-custom-scrollbar shadow-xs">
        {[
          { id: 'store', label: 'Store & Logistics', icon: FiSettings },
          { id: 'profile', label: 'Admin Account & Security', icon: FiUser },
          { id: 'logs', label: 'Audit Activity Logs', icon: FiActivity },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#31653a] text-white shadow-md shadow-[#31653a]/25'
                  : 'text-gray-600 hover:bg-white/80 hover:text-[#17301c]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Store & Delivery Settings */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* General Store Details */}
          <div className="admin-glass-panel rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-[#17301c] pb-3 border-b border-gray-100 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#eaf3eb] text-[#31653a] flex items-center justify-center font-bold">
                1
              </span>
              <span>Storefront Branding & Support</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Customer Care Helpline
                </label>
                <input
                  type="text"
                  required
                  value={settings.store_phone}
                  onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  required
                  value={settings.store_email}
                  onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Farm Fulfillment Warehouse / Hub Address
                </label>
                <textarea
                  rows="2"
                  required
                  value={settings.store_address}
                  onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Delivery & Inventory Pricing Rules */}
          <div className="admin-glass-panel rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-[#17301c] pb-3 border-b border-gray-100 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#eaf3eb] text-[#31653a] flex items-center justify-center font-bold">
                2
              </span>
              <span>Delivery Charges & Inventory Thresholds</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Standard Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settings.delivery_fee}
                  onChange={(e) => setSettings({ ...settings, delivery_fee: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Free Delivery Threshold (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settings.free_delivery_threshold}
                  onChange={(e) => setSettings({ ...settings, free_delivery_threshold: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Low Stock Alert Level (units)
                </label>
                <input
                  type="number"
                  required
                  value={settings.low_stock_threshold}
                  onChange={(e) => setSettings({ ...settings, low_stock_threshold: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#31653a] hover:bg-[#27532f] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#31653a]/25"
            >
              <FiSave className="w-4 h-4" />
              <span>{savingSettings ? 'Saving Settings...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Admin Profile & Password */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <div className="admin-glass-panel rounded-3xl p-6 shadow-xs">
            <h3 className="font-extrabold text-base text-[#17301c] pb-3 border-b border-gray-100">
              Personal Information
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Registered Email
                </label>
                <input
                  type="email"
                  disabled
                  value={admin?.email || ''}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 rounded-2xl bg-[#31653a] hover:bg-[#27532f] text-white font-bold text-xs shadow-md shadow-[#31653a]/25"
                >
                  {savingProfile ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="admin-glass-panel rounded-3xl p-6 shadow-xs">
            <h3 className="font-extrabold text-base text-[#17301c] pb-3 border-b border-gray-100 flex items-center gap-2">
              <FiLock className="w-4 h-4 text-[#31653a]" />
              <span>Change Password</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-2.5 rounded-2xl bg-[#17301c] text-white font-bold text-xs shadow-md"
                >
                  {changingPassword ? 'Changing...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: System Audit Logs */}
      {activeTab === 'logs' && (
        <div className="admin-glass-panel rounded-3xl p-6 shadow-xs">
          <h3 className="font-extrabold text-base text-[#17301c] mb-4 pb-3 border-b border-gray-100">
            Administrative Audit Trail (Last 30 Events)
          </h3>

          {loadingLogs ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2 font-medium">Retrieving audit events...</p>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No audit log entries recorded yet.</p>
          ) : (
            <div className="overflow-x-auto admin-custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Admin</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity / Details</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/60">
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#17301c]">{log.admin_name || 'Super Admin'}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaf3eb] text-[#31653a] border border-[#31653a]/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-700">{log.entity_type} #{log.entity_id || ''}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
