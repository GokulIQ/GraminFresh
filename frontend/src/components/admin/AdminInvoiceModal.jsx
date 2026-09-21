import { useEffect, useState } from 'react'
import { FiPrinter, FiX } from 'react-icons/fi'
import { adminApi } from '../../api/adminApi'
import toast from 'react-hot-toast'

export default function AdminInvoiceModal({ orderId, onClose }) {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true)
        const res = await adminApi.getOrderInvoice(orderId)
        setInvoice(res.data)
      } catch (err) {
        toast.error('Failed to load invoice')
        onClose()
      } finally {
        setLoading(false)
      }
    }
    if (orderId) {
      fetchInvoice()
    }
  }, [orderId])

  const handlePrint = () => {
    window.print()
  }

  if (!orderId) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Actions (Excluded in Print) */}
        <div className="no-print p-4 sm:px-6 bg-[#f7faf6] border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base sm:text-lg text-[#17301c]">
              Tax Invoice #{orderId}
            </span>
            <span className="text-xs bg-[#eaf3eb] text-[#31653a] font-bold px-2 py-0.5 rounded-full border border-[#31653a]/20">
              Official Receipt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#31653a] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#27532f] transition-colors"
            >
              <FiPrinter className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-[#1b2e20] admin-custom-scrollbar" id="printable-invoice">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-xs text-gray-500 font-semibold">Generating invoice...</p>
            </div>
          ) : invoice ? (
            <div className="space-y-6 text-sm">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-200">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#31653a] p-2 flex items-center justify-center shadow-md shrink-0">
                    <img
                      src="/graminfresh-logo.svg"
                      alt="GraminFresh Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-[#17301c]">
                        Gramin<span className="text-[#31653a]">Fresh</span>
                      </span>
                      <span className="text-[10px] bg-[#eaf3eb] text-[#31653a] font-bold px-2 py-0.5 rounded border border-[#31653a]/20">
                        FARM TO DOOR
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{invoice.store_address}</p>
                    <p className="text-xs text-gray-600">Phone: {invoice.store_phone} | Email: {invoice.store_email}</p>
                  </div>
                </div>
                <div className="sm:text-right bg-green-50/60 p-3.5 rounded-2xl border border-green-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice No</p>
                  <p className="text-base font-extrabold text-[#31653a]">{invoice.invoice_number}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Date: {new Date(invoice.order_date).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Customer & Shipping Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Billed & Delivered To
                  </h4>
                  <p className="font-bold text-[#17301c]">{invoice.customer_name}</p>
                  <p className="text-xs text-gray-600">{invoice.customer_mobile}</p>
                  <p className="text-xs text-gray-600">{invoice.customer_email}</p>
                  <p className="text-xs text-gray-700 mt-1 font-medium">
                    {typeof invoice.delivery_address === 'object' && invoice.delivery_address !== null
                      ? [
                          invoice.delivery_address.address || invoice.delivery_address.address_line,
                          invoice.delivery_address.village || invoice.delivery_village,
                          invoice.delivery_address.district || invoice.delivery_district,
                        ]
                          .filter(Boolean)
                          .join(', ') +
                        (invoice.delivery_address.pincode || invoice.delivery_pincode
                          ? ` - ${invoice.delivery_address.pincode || invoice.delivery_pincode}`
                          : '')
                      : [invoice.delivery_address, invoice.delivery_village, invoice.delivery_district]
                          .filter(Boolean)
                          .join(', ') + (invoice.delivery_pincode ? ` - ${invoice.delivery_pincode}` : '')}
                  </p>
                </div>
                <div className="sm:text-right">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Payment & Delivery Info
                  </h4>
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">Payment Method:</span> {invoice.payment_method}
                  </p>
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">Payment Status:</span>{' '}
                    <span className="font-bold text-[#31653a]">{invoice.payment_status}</span>
                  </p>
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">Order Status:</span> {invoice.order_status}
                  </p>
                  {invoice.delivery_partner_name && (
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">Delivery By:</span> {invoice.delivery_partner_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-2.5 px-2">#</th>
                      <th className="py-2.5 px-2">Item Description</th>
                      <th className="py-2.5 px-2 text-center">Unit</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Price</th>
                      <th className="py-2.5 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-3 px-2 text-gray-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-2">
                          <p className="font-bold text-[#17301c]">{item.product_name}</p>
                        </td>
                        <td className="py-3 px-2 text-center text-gray-600">{item.unit}</td>
                        <td className="py-3 px-2 text-center font-bold">{item.quantity}</td>
                        <td className="py-3 px-2 text-right text-gray-600">₹{parseFloat(item.price).toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-bold text-[#17301c]">
                          ₹{parseFloat(item.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-4 border-t-2 border-gray-200">
                <div className="text-xs text-gray-500 max-w-sm">
                  <p className="font-bold text-gray-700 mb-1">Terms & Conditions</p>
                  <p>100% Guaranteed Fresh Produce. In case of any freshness concerns, please reach our customer desk within 2 hours of delivery.</p>
                </div>
                <div className="w-full sm:w-64 space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-bold">₹{parseFloat(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Charge:</span>
                    <span className="font-bold">₹{parseFloat(invoice.delivery_charge).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-[#17301c] pt-2 border-t border-gray-200">
                    <span>Grand Total:</span>
                    <span className="text-[#31653a] text-base">₹{parseFloat(invoice.grand_total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="pt-6 text-center text-[11px] text-gray-400 border-t border-gray-100">
                Thank you for choosing GraminFresh! Freshness Delivered to your Doorstep.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
