import React from 'react'

export function AdminContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-2 sm:p-4" aria-busy="true" aria-label="Loading admin content">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-[#31653a]/15 rounded-xl"></div>
          <div className="h-4 w-72 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
      </div>

      {/* KPI Cards / Filter Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white/70 rounded-3xl border border-gray-100 p-4 flex flex-col justify-between shadow-xs">
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-7 w-28 bg-[#31653a]/20 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Table / Main Card Skeleton */}
      <div className="h-96 bg-white/80 rounded-3xl border border-gray-100 p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div className="h-8 w-64 bg-gray-200 rounded-2xl"></div>
          <div className="h-8 w-32 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full bg-gray-50 rounded-xl flex items-center px-4 justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-4 w-16 bg-[#31653a]/15 rounded"></div>
              <div className="h-6 w-20 bg-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminPageSkeleton() {
  return (
    <div
      className="min-h-screen bg-[#f3f7f2] flex flex-col items-center justify-center p-4"
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        {/* Animated Brand Pulse */}
        <div className="w-16 h-16 rounded-3xl bg-[#31653a] flex items-center justify-center shadow-lg shadow-[#31653a]/25 animate-bounce">
          <div className="w-8 h-8 rounded-full border-3 border-white border-t-transparent animate-spin"></div>
        </div>
        
        <div>
          <h2 className="text-base font-extrabold text-[#17301c] tracking-tight">
            GraminFresh <span className="text-[#31653a] text-xs font-semibold px-2 py-0.5 rounded-full bg-[#31653a]/10">ADMIN</span>
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Loading portal workspace...</p>
        </div>
      </div>
    </div>
  )
}
