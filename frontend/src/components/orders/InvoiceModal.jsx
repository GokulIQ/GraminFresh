import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiPrinter, FiDownload, FiX, FiCheckCircle, FiFileText } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function InvoiceModal({ isOpen, onClose, order }) {
  const scrollBodyRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      if (scrollBodyRef.current) {
        scrollBodyRef.current.scrollTop = 0
      }
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !order) return null

  const subtotal = order.items?.reduce((acc, item) => {
    const unitPrice = Number(item.price) || 0
    return acc + unitPrice * (item.quantity || 1)
  }, 0) || Number(order.total_amount || 0)

  const deliveryCharge = Number(order.delivery_charge || 0)
  const grandTotal = Number(order.total_amount || 0)
  const isCod = (order.payment_method || '').toUpperCase().includes('COD') || (order.payment_method || '').toLowerCase().includes('cash')

  const formattedDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const generateInvoiceHtml = () => {
    const itemsRows = (order.items || []).map((item, idx) => {
      const p = item.product || {}
      const itemTotal = Number(item.price) * item.quantity
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2ece3; text-align: center; color: #555;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2ece3;">
            <strong style="color: #1a3320; font-size: 14px;">${p.product_name || 'Fresh Farm Item'}</strong>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2ece3; text-align: center;">${p.unit || 'Pack'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2ece3; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2ece3; text-align: right;">₹${Number(item.price).toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2ece3; text-align: right; font-weight: bold;">₹${itemTotal.toFixed(2)}</td>
        </tr>
      `
    }).join('')

    const addr = order.delivery_address || {}
    const addressHtml = addr.full_name ? `
      <div style="font-size: 13px; color: #333; line-height: 1.6;">
        <strong style="font-size: 15px; color: #173820; display: block;">${addr.full_name}</strong>
        <div>${addr.address || ''}</div>
        <div>${addr.village ? `${addr.village}, ` : ''}${addr.district || ''}</div>
        <div>${addr.state ? `${addr.state} - ` : ''}${addr.pincode || ''}</div>
        <div style="margin-top: 4px; font-weight: bold;">Mobile: +91 ${addr.mobile_number || ''}</div>
      </div>
    ` : '<p style="font-size: 13px; color: #555;">Standard Customer Delivery</p>'

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: sans-serif; color: #222; margin: 0; padding: 20px; font-size: 13px; }
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-bottom: 2px solid #215e31; padding-bottom: 16px; }
    .brand-title { font-size: 26px; font-weight: 900; color: #1b4d27; margin: 0; }
    .brand-sub { font-size: 12px; color: #555; margin: 2px 0 0; }
    .invoice-badge { display: inline-block; background: #eef7ee; color: #1e5a2c; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; }
    .grid-2 { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .grid-2 td { width: 50%; vertical-align: top; padding: 12px; background: #fbfdfa; border: 1px solid #e2ece3; }
    .sec-title { font-size: 11px; font-weight: bold; color: #4a6753; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #eef5ee; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #f0f7ee; color: #1b4d27; padding: 10px; text-align: left; font-size: 12px; }
    .totals-box { float: right; width: 280px; background: #fbfdfa; padding: 14px; border: 1px solid #e2ece3; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .grand-total { display: flex; justify-content: space-between; border-top: 2px solid #215e31; padding-top: 8px; margin-top: 8px; font-weight: 900; }
    .footer-note { clear: both; text-align: center; padding-top: 18px; border-top: 1px dashed #d0dfd3; font-size: 11px; color: #777; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="40" height="40" style="vertical-align: middle; border-radius: 10px; flex-shrink: 0;">
              <circle cx="32" cy="32" r="32" fill="#2F5233"/>
              <path d="M19 38c0-12 8-21 24-23-1 15-9 24-21 24-2 0-3-1-3-1Z" fill="#F4C430"/>
              <path d="M21 40c6-7 12-14 22-23" fill="none" stroke="#FBF9F4" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <div>
              <h1 class="brand-title" style="margin: 0; font-size: 20px; font-weight: 800; color: #173820;">GraminFresh</h1>
              <p class="brand-sub" style="margin: 2px 0 0; font-size: 11px; color: #556c5c;">Village Farm Delivery Platform</p>
            </div>
          </div>
          <div style="font-size: 12px; color: #555; margin-top: 6px;">
            108, Green Meadows Farm Rd, Rural Hub<br>
            support@graminfresh.com | +91 98765 43210
          </div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <span class="invoice-badge">TAX INVOICE</span>
          <h2 style="font-size: 20px; color: #173820; margin: 4px 0 6px;">#${order.order_id}</h2>
          <table class="meta-table" style="margin-left: auto; text-align: right;">
            <tr><td style="color: #666;">Date:</td><td style="font-weight: bold; padding-left: 8px;">${formattedDate}</td></tr>
            <tr><td style="color: #666;">Payment:</td><td style="font-weight: bold; padding-left: 8px;">${isCod ? 'Cash on Delivery' : 'Online Paid'}</td></tr>
            <tr><td style="color: #666;">Status:</td><td style="font-weight: bold; color: #1e5a2c; padding-left: 8px;">${order.order_status || 'Confirmed'}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <table class="grid-2">
      <tr>
        <td>
          <div class="sec-title">Delivery Destination</div>
          ${addressHtml}
        </td>
        <td>
          <div class="sec-title">Payment & Fulfillment Summary</div>
          <div style="font-size: 13px; color: #333; line-height: 1.6;">
            <div><strong>Method:</strong> ${order.payment_method === 'ONLINE' ? 'Online / UPI Payment' : 'Cash on Delivery (COD)'}</div>
            <div><strong>Payment Status:</strong> <span style="font-weight: bold; color: ${order.payment_status === 'PAID' ? '#15803d' : '#b45309'};">${order.payment_status || 'PENDING'}</span></div>
            <div><strong>Order Status:</strong> <span style="font-weight: bold; color: #15803d;">${order.order_status || 'CONFIRMED'}</span></div>
            <div><strong>Total Items:</strong> ${order.items?.length || 0} Products</div>
          </div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="text-align: center;">Unit</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals-table">
      <div class="totals-box">
        <div class="totals-row">
          <span>Items Subtotal:</span>
          <span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
          <span>Delivery Charge:</span>
          <span>${deliveryCharge > 0 ? `₹${deliveryCharge.toFixed(2)}` : '<strong style="color: #15803d;">FREE</strong>'}</span>
        </div>
        <div class="grand-total">
          <span>Grand Total:</span>
          <span style="color: #1b4d27;">₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="footer-note">
      <p style="margin: 0; font-weight: bold; color: #173820;">Thank you for supporting local village farmers with GraminFresh!</p>
      <p style="margin: 4px 0 0;">This is a computer-generated tax invoice and requires no physical signature.</p>
    </div>
  </div>
</body>
</html>`
  }

  const handlePrintOrDownload = (actionType) => {
    toast.loading(`Preparing invoice for ${actionType === 'download' ? 'PDF download' : 'print'}...`, { id: 'invoice-print-toast', duration: 1500 })

    try {
      const invoiceHtml = generateInvoiceHtml()
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.style.visibility = 'hidden'
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow.document
      doc.open()
      doc.write(invoiceHtml)
      doc.close()

      setTimeout(() => {
        try {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
          toast.success(actionType === 'download' ? 'Choose "Save as PDF" to download!' : 'Invoice sent to printer!', { id: 'invoice-print-toast' })
        } catch (printErr) {
          console.error('Iframe print error:', printErr)
          window.print()
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 2000)
        }
      }, 400)
    } catch (err) {
      console.error('Invoice generation failed:', err)
      toast.error('Failed to trigger print dialog', { id: 'invoice-print-toast' })
    }
  }

  return createPortal(
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div 
        className="invoice-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="invoice-dialog-header no-print">
          <div className="invoice-dialog-title-row">
            <div className="invoice-modal-title">
              <FiFileText className="invoice-title-icon" />
              <span>Tax Invoice / Receipt</span>
            </div>
            <button 
              type="button" 
              className="invoice-dialog-close-btn" 
              onClick={onClose}
              aria-label="Close invoice modal"
              title="Close modal"
            >
              <FiX />
            </button>
          </div>

          <div className="invoice-dialog-actions-row">
            <button 
              type="button" 
              className="invoice-action-btn print-btn" 
              onClick={() => handlePrintOrDownload('print')}
              title="Print Invoice"
            >
              <FiPrinter /> <span>Print Invoice</span>
            </button>
            <button 
              type="button" 
              className="invoice-action-btn download-btn" 
              onClick={() => handlePrintOrDownload('download')}
              title="Download Invoice as PDF"
            >
              <FiDownload /> <span>Download (PDF)</span>
            </button>
          </div>
        </div>

        <div className="invoice-dialog-body" ref={scrollBodyRef}>
          <div className="printable-invoice-content" id="printable-invoice-area">
            <div className="invoice-header-grid">
              <div className="invoice-brand-col">
                <div className="brand-logo-title">
                  <div className="invoice-logo-container">
                    <img 
                      src="/graminfresh-logo.svg" 
                      alt="GraminFresh Logo" 
                      className="invoice-brand-logo-img" 
                    />
                  </div>
                  <div>
                    <h2 className="invoice-brand-name">GraminFresh</h2>
                    <p className="invoice-brand-tagline">Village Farm Delivery Platform</p>
                  </div>
                </div>
                <p className="invoice-store-address">
                  108, Green Meadows Farm Rd, Rural Hub<br />
                  support@graminfresh.com | +91 98765 43210
                </p>
              </div>

              <div className="invoice-meta-col">
                <div className="invoice-badge">TAX INVOICE / RECEIPT</div>
                <h3 className="invoice-title">INVOICE</h3>
                <table className="invoice-meta-table">
                  <tbody>
                    <tr>
                      <td><strong>Invoice No:</strong></td>
                      <td className="meta-val-code">INV-{order.order_id}</td>
                    </tr>
                    <tr>
                      <td><strong>Order ID:</strong></td>
                      <td className="meta-val-code">{order.order_id}</td>
                    </tr>
                    <tr>
                      <td><strong>Date & Time:</strong></td>
                      <td>{formattedDate}</td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td><span className={`invoice-status ${order.order_status?.toLowerCase()}`}>{order.order_status}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <hr className="invoice-divider" />

            {/* Customer & Delivery Address Grid */}
            <div className="invoice-customer-grid">
              <div className="invoice-box">
                <h4>Billed & Delivered To:</h4>
                {order.delivery_address ? (
                  <div className="address-text">
                    <strong className="address-name">{order.delivery_address.full_name}</strong>
                    <p>{order.delivery_address.address}</p>
                    {order.delivery_address.landmark && <p className="address-landmark">Landmark: {order.delivery_address.landmark}</p>}
                    <p>{order.delivery_address.village}, {order.delivery_address.district}</p>
                    <p>{order.delivery_address.state} - {order.delivery_address.pincode}</p>
                    <p className="address-phone"><strong>Mobile:</strong> +91 {order.delivery_address.mobile_number}</p>
                  </div>
                ) : (
                  <p>Standard Customer Delivery</p>
                )}
              </div>

              <div className="invoice-box">
                <h4>Payment & Delivery Info:</h4>
                <div className="payment-text">
                  <p><strong>Payment Mode:</strong> {isCod ? 'Cash on Delivery (COD)' : 'Online Payment / UPI'}</p>
                  <p>
                    <strong>Payment Status:</strong>{' '}
                    <span className={`payment-status-badge ${order.order_status === 'Delivered' || !isCod ? 'paid' : 'pending'}`}>
                      {order.order_status === 'Delivered' || !isCod ? 'Paid / Completed' : 'Pay on Delivery'}
                    </span>
                  </p>
                  <p><strong>Delivery Mode:</strong> Standard Fresh Farm Express</p>
                  <p><strong>Fulfillment:</strong> Direct from Rural Farms</p>
                </div>
              </div>
            </div>

            {/* Itemized Table Container */}
            <div className="invoice-table-responsive">
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th className="text-center">#</th>
                    <th>Item Description</th>
                    <th className="text-center">Unit</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => {
                    const itemTotal = Number(item.price) * item.quantity
                    return (
                      <tr key={item.id || idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>
                          <strong className="item-title">{item.product?.product_name || 'Farm Item'}</strong>
                        </td>
                        <td className="text-center">
                          <span className="unit-pill">{item.product?.unit || 'Pack'}</span>
                        </td>
                        <td className="text-center font-bold">{item.quantity}</td>
                        <td className="text-right">₹{Number(item.price).toFixed(2)}</td>
                        <td className="text-right font-bold">₹{itemTotal.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation */}
            <div className="invoice-totals-section">
              <div className="invoice-notes-col">
                <div className="quality-seal">
                  <FiCheckCircle /> <span>100% Farm Fresh Quality Guaranteed</span>
                </div>
                <p className="invoice-terms-text">
                  Thank you for supporting local farmers and rural communities. 
                  For queries or feedback, contact helpdesk at support@graminfresh.com.
                </p>
              </div>

              <div className="invoice-calc-col">
                <div className="calc-row">
                  <span>Items Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="calc-row">
                  <span>Delivery Charge</span>
                  <span className={deliveryCharge === 0 ? 'free-delivery-text' : ''}>
                    {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}
                  </span>
                </div>
                <div className="calc-row">
                  <span>Taxes & GST (Included)</span>
                  <span>₹0.00</span>
                </div>
                <hr className="calc-divider" />
                <div className="calc-row grand-total-row">
                  <strong>Grand Total</strong>
                  <strong className="invoice-grand-total">₹{grandTotal.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="invoice-footer-sign">
              <p>This is a computer-generated tax invoice and requires no physical signature.</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
