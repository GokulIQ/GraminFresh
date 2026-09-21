import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AdminAuthProvider } from './context/AdminAuthContext.jsx'
import { DeliveryAuthProvider } from './context/DeliveryAuthContext.jsx'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <DeliveryAuthProvider>
          <AuthProvider>
            <CartProvider>
              <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
              <App />
            </CartProvider>
          </AuthProvider>
        </DeliveryAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)