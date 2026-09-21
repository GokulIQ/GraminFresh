import React from 'react'
import { 
  FiCheckCircle, 
  FiClock, 
  FiPackage, 
  FiTruck, 
  FiCheck, 
  FiXCircle, 
  FiShoppingBag,
  FiFileText
} from 'react-icons/fi'

const STAGE_ICONS = {
  'Order Placed': FiShoppingBag,
  'Confirmed': FiFileText,
  'Preparing': FiPackage,
  'Out for Delivery': FiTruck,
  'Delivered': FiCheckCircle,
  'Cancelled': FiXCircle,
}

export default function OrderTrackingTimeline({ 
  timeline = [], 
  orderStatus = 'Pending',
  createdAt = null,
  expectedDeliveryDate = null
}) {
  const isCancelled = (orderStatus || '').toLowerCase() === 'cancelled'

  const formatTime = (ts) => {
    if (!ts) return null
    try {
      const d = new Date(ts)
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  if (isCancelled) {
    return (
      <div className="order-tracking-container cancelled-state">
        <div className="cancelled-alert-banner">
          <div className="cancelled-icon-wrapper">
            <FiXCircle />
          </div>
          <div>
            <h4>This Order Has Been Cancelled</h4>
            <p>
              {timeline.find(t => t.status === 'Cancelled')?.notes || 
               'This order was cancelled and items have been returned to inventory.'}
            </p>
            {timeline.find(t => t.status === 'Cancelled')?.timestamp && (
              <span className="cancelled-timestamp">
                Cancelled on: {formatTime(timeline.find(t => t.status === 'Cancelled')?.timestamp)}
              </span>
            )}
          </div>
        </div>

        <div className="tracking-timeline-steps">
          {timeline.map((step, idx) => {
            const IconComponent = STAGE_ICONS[step.status] || FiClock
            return (
              <div key={idx} className={`timeline-step-row ${step.status === 'Cancelled' ? 'cancelled-step' : 'completed-step'}`}>
                <div className="step-marker-col">
                  <div className="step-circle">
                    <IconComponent />
                  </div>
                  {idx < timeline.length - 1 && <div className="step-line active-line" />}
                </div>
                <div className="step-content-col">
                  <div className="step-header">
                    <strong className="step-title">{step.label}</strong>
                    {step.timestamp && (
                      <span className="step-time">{formatTime(step.timestamp)}</span>
                    )}
                  </div>
                  {step.notes && <p className="step-notes">{step.notes}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Calculate active progress percentage
  const totalSteps = timeline.length || 5
  const completedCount = timeline.filter(t => t.completed).length
  const progressPercent = totalSteps > 1 ? Math.min(100, Math.max(0, ((completedCount - 1) / (totalSteps - 1)) * 100)) : 0

  return (
    <div className="order-tracking-container">
      {expectedDeliveryDate && !isCancelled && (
        <div className="eta-banner" style={{ marginBottom: '20px', padding: '12px 16px', background: '#eaf3eb', border: '1px solid #cce3d0', borderRadius: '8px', color: '#17301c', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiClock style={{ color: '#31653a', width: '20px', height: '20px' }} />
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: '#556957', letterSpacing: '0.05em' }}>Estimated Delivery Time</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#31653a' }}>{formatTime(expectedDeliveryDate)}</div>
          </div>
        </div>
      )}
      {/* Visual Stepper Header for Desktop/Tablet */}
      <div className="tracking-stepper-horizontal">
        <div className="stepper-track-bar">
          <div 
            className="stepper-track-progress" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>

        <div className="stepper-nodes-row">
          {timeline.map((step, index) => {
            const Icon = STAGE_ICONS[step.status] || FiCheck
            const stateClass = step.current 
              ? 'current-node' 
              : step.completed 
              ? 'completed-node' 
              : 'upcoming-node'

            return (
              <div key={index} className={`stepper-node-item ${stateClass}`}>
                <div className="node-icon-circle">
                  {step.completed && !step.current ? (
                    <FiCheck className="check-icon" />
                  ) : (
                    <Icon />
                  )}
                  {step.current && <span className="pulsing-ring" />}
                </div>
                <span className="node-label">{step.label}</span>
                {step.timestamp && (
                  <span className="node-timestamp">{formatTime(step.timestamp)}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed Vertical Timeline for Mobile & History Breakdown */}
      <div className="tracking-timeline-vertical">
        {timeline.map((step, idx) => {
          const Icon = STAGE_ICONS[step.status] || FiClock
          const isDone = step.completed
          const isCurrent = step.current

          return (
            <div 
              key={idx} 
              className={`timeline-step-row ${isCurrent ? 'current-step' : isDone ? 'completed-step' : 'upcoming-step'}`}
            >
              <div className="step-marker-col">
                <div className="step-circle">
                  {isDone && !isCurrent ? <FiCheck /> : <Icon />}
                  {isCurrent && <span className="mobile-pulse-ring" />}
                </div>
                {idx < timeline.length - 1 && (
                  <div className={`step-line ${isDone ? 'active-line' : 'inactive-line'}`} />
                )}
              </div>

              <div className="step-content-col">
                <div className="step-header">
                  <div className="step-title-wrap">
                    <strong className="step-title">{step.label}</strong>
                    {isCurrent && <span className="status-live-tag">In Progress</span>}
                  </div>
                  {step.timestamp && (
                    <span className="step-time">{formatTime(step.timestamp)}</span>
                  )}
                </div>
                {step.notes && <p className="step-notes">{step.notes}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
