import { FiAlertTriangle, FiX } from 'react-icons/fi'

export default function AdminConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-md admin-glass-modal rounded-3xl p-6 shadow-2xl border border-white/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
              isDanger
                ? 'bg-red-100 text-red-600 border border-red-200'
                : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}
          >
            <FiAlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-[#17301c]">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20'
                : 'bg-[#31653a] hover:bg-[#27532f] shadow-[#31653a]/20'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
