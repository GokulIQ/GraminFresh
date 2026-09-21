import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute.jsx'
import DeliveryProtectedRoute from './components/delivery/DeliveryProtectedRoute.jsx'
import PageSkeleton from './components/common/PageSkeleton.jsx'
import AdminPageSkeleton from './components/admin/AdminPageSkeleton.jsx'

// Lazy-loaded Customer Pages
const Register = lazy(() => import('./pages/Register.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const CategoryProducts = lazy(() => import('./pages/CategoryProducts.jsx'))
const SearchResults = lazy(() => import('./pages/SearchResults.jsx'))
const ProductDetails = lazy(() => import('./pages/ProductDetails.jsx'))
const Cart = lazy(() => import('./pages/Cart.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation.jsx'))
const Orders = lazy(() => import('./pages/Orders.jsx'))
const OrderDetails = lazy(() => import('./pages/OrderDetails.jsx'))

// Lazy-loaded Admin Pages & Layout
const AdminLayout = lazy(() => import('./components/admin/AdminLayout.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories.jsx'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'))
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers.jsx'))
const AdminDelivery = lazy(() => import('./pages/admin/AdminDelivery.jsx'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))

// Lazy-loaded Delivery Pages & Layout
const DeliveryLayout = lazy(() => import('./components/delivery/DeliveryLayout.jsx'))
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard.jsx'))
const AssignedOrders = lazy(() => import('./pages/delivery/AssignedOrders.jsx'))
const DeliveryHistory = lazy(() => import('./pages/delivery/DeliveryHistory.jsx'))
const DeliveryProfile = lazy(() => import('./pages/delivery/DeliveryProfile.jsx'))

function DynamicSuspenseFallback() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  return isAdmin ? <AdminPageSkeleton /> : <PageSkeleton />
}

export default function App() {
  return (
    <Suspense fallback={<DynamicSuspenseFallback />}>
      <Routes>
        {/* =========================================
            ADMIN PORTAL ROUTES
            ========================================= */}
        <Route
          path="/admin/login"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            </Suspense>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="delivery" element={<AdminDelivery />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* =========================================
            DELIVERY PORTAL ROUTES
            ========================================= */}
        <Route
          path="/delivery/login"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/delivery"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <DeliveryProtectedRoute>
                <DeliveryLayout />
              </DeliveryProtectedRoute>
            </Suspense>
          }
        >
          <Route index element={<Navigate to="/delivery/dashboard" replace />} />
          <Route path="dashboard" element={<DeliveryDashboard />} />
          <Route path="orders" element={<AssignedOrders />} />
          <Route path="history" element={<DeliveryHistory />} />
          <Route path="profile" element={<DeliveryProfile />} />
        </Route>

        {/* =========================================
            CUSTOMER PORTAL ROUTES (PRESERVED)
            ========================================= */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Customer Routes */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/category/:id"
          element={
            <ProtectedRoute>
              <CategoryProducts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/product/:id"
          element={
            <ProtectedRoute>
              <ProductDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout/confirm"
          element={
            <ProtectedRoute>
              <OrderConfirmation />
            </ProtectedRoute>
          }
        />

        {/* Customer Order Management Routes */}
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-orders/:orderId"
          element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          }
        />

        {/* Legacy / Alias Orders Route */}
        <Route
          path="/orders"
          element={<Navigate to="/my-orders" replace />}
        />

        <Route
          path="/orders/:orderId"
          element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          }
        />

        {/* Fallback Route */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </Suspense>
  )
}
