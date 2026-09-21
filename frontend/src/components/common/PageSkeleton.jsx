import React from 'react'

export default function PageSkeleton() {
  return (
    <div className="mobile-shopping-shell animate-pulse" aria-busy="true" aria-label="Loading page">
      {/* Header skeleton */}
      <header className="customer-header" style={{ opacity: 0.7, pointerEvents: 'none' }}>
        <div className="brand">
          <div className="logo" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px' }} />
          <div className="brand-content">
            <div style={{ height: '16px', width: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '4px' }} />
            <div style={{ height: '10px', width: '120px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
          </div>
        </div>
      </header>

      {/* Main body skeleton */}
      <div className="home-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ height: '48px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />
        <div style={{ height: '140px', width: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: '16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: '180px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
