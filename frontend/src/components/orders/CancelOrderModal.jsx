import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { FiAlertTriangle, FiX } from 'react-icons/fi'

const CANCEL_REASONS = [
  'Ordered items by mistake',
  'Need to change delivery address or contact',
  'Found a better alternative / Changed mind',
  'Delivery time is taking too long',
  'Need to modify items or quantities',
  'Other reason'
]

export default function CancelOrderModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderId, 
  isLoading 
}) {
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0])
  const [customNotes, setCustomNotes] = useState('')

  if (!isOpen) return null

  const handleFormSubmit = (e) => {
    e.preventDefault()
    const finalReason = selectedReason === 'Other reason' && customNotes.trim()
      ? `Other: ${customNotes.trim()}`
      : selectedReason
    onConfirm(finalReason)
  }

  return createPortal(
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div 
        className="modal-content-card glass-panel" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button" 
          className="modal-close-btn" 
          onClick={onClose} 
          disabled={isLoading}
        >
          <FiX />
        </button>

        <div className="cancel-modal-header">
          <div className="cancel-warning-icon">
            <FiAlertTriangle />
          </div>
          <h3>Cancel Order</h3>
          <p className="cancel-modal-subtitle">
            Are you sure you want to cancel order <strong>#{orderId}</strong>?
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="cancel-modal-form">
          <label className="cancel-reason-label">
            Please choose a reason for cancellation:
          </label>

          <div className="cancel-reasons-list">
            {CANCEL_REASONS.map((reason) => (
              <label 
                key={reason} 
                className={`reason-option-card ${selectedReason === reason ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="cancel_reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  disabled={isLoading}
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === 'Other reason' && (
            <div className="custom-reason-box">
              <textarea
                placeholder="Please tell us the reason..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={3}
                disabled={isLoading}
                required
              />
            </div>
          )}

          <div className="cancel-modal-actions">
            <button
              type="button"
              className="secondary-outline-btn"
              onClick={onClose}
              disabled={isLoading}
            >
              Keep Order
            </button>
            <button
              type="submit"
              className="danger-confirm-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
