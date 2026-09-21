import { useState, useEffect } from 'react'
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiBox,
  FiStar,
  FiX,
  FiAlertTriangle,
} from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import { adminApi, extractErrorMessage } from '../../api/adminApi'
import AdminImageUpload from '../../components/admin/AdminImageUpload'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import toast from 'react-hot-toast'

const FALLBACK_PRODUCT_IMAGE = '/images/products/cow-milk.jpg'

function getProductImageSrc(imagePath) {
  if (!imagePath) return FALLBACK_PRODUCT_IMAGE
  if (/^(https?:|data:|blob:)/i.test(imagePath)) return imagePath
  if (imagePath.startsWith('/static/')) {
    return `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')}${imagePath}`
  }
  return imagePath.startsWith('/') ? imagePath : `/${imagePath}`
}

export default function AdminProducts() {
  const [searchParams] = useSearchParams()
  const initialLowStock = searchParams.get('low_stock') === 'true'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [lowStockFilter, setLowStockFilter] = useState(initialLowStock)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([])

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    product_name: '',
    category_id: '',
    price: '',
    discount_price: '',
    weight: '0.5 Kg',
    stock: 20,
    images: [],
    description: '',
    freshness_info: 'Harvested fresh this morning from local village farms.',
    is_popular: false,
    status: 'active',
  })
  const [saving, setSaving] = useState(false)

  // Quick Stock Modal State
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [stockTargetProduct, setStockTargetProduct] = useState(null)
  const [quickStockVal, setQuickStockVal] = useState(0)

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch Categories for dropdown
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await adminApi.getCategories({ page_size: 100 })
        setCategories(res.data.items || [])
      } catch (e) {
        // silent
      }
    }
    loadCategories()
  }, [])

  // Fetch Products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getProducts({
        search: search || undefined,
        category_id: categoryFilter || undefined,
        status: statusFilter || undefined,
        low_stock: lowStockFilter || undefined,
        page,
        page_size: 15,
      })
      setProducts(res.data.items || [])
      setTotalPages(res.data.total_pages || 1)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load products'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [search, categoryFilter, statusFilter, lowStockFilter, page])

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({
      product_name: '',
      category_id: categories[0]?.id || '',
      price: '',
      discount_price: '',
      weight: '0.5 Kg',
      stock: 25,
      images: [],
      description: '',
      freshness_info: 'Freshly harvested daily.',
      is_popular: false,
      status: 'active',
    })
    setModalOpen(true)
  }

  const openEditModal = (p) => {
    setEditingProduct(p)
    setFormData({
      product_name: p.product_name,
      category_id: p.category_id,
      price: p.price,
      discount_price: p.discount_price || '',
      weight: p.unit || p.weight || '0.5 Kg',
      stock: p.stock,
      images: [...new Set([p.product_image, ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean))].slice(0, 3),
      description: p.description || '',
      freshness_info: p.freshness_info || '',
      is_popular: !!p.is_popular,
      status: p.status,
    })
    setModalOpen(true)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!formData.product_name.trim()) return toast.error('Product name is required')
    if (!formData.category_id) return toast.error('Select a category')
    if (!formData.price || parseFloat(formData.price) <= 0) return toast.error('Valid price is required')
    if (!formData.images.length) return toast.error('Add at least one product image')

    try {
      setSaving(true)
      const payload = {
        product_name: formData.product_name.trim(),
        category_id: parseInt(formData.category_id),
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        weight: formData.weight,
        unit: formData.weight,
        stock: parseInt(formData.stock) || 0,
        product_image: formData.images[0],
        images: formData.images,
        description: formData.description,
        freshness_info: formData.freshness_info,
        is_popular: formData.is_popular,
        status: formData.status,
      }

      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, payload)
        toast.success('Product updated successfully')
      } else {
        await adminApi.createProduct(payload)
        toast.success('Product created successfully')
      }
      setModalOpen(false)
      fetchProducts()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save product'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (product) => {
    try {
      await adminApi.toggleProductStatus(product.id)
      toast.success(`Product is now ${product.status === 'active' ? 'Inactive' : 'Active'}`)
      fetchProducts()
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to change status'))
    }
  }

  const handleSaveQuickStock = async (e) => {
    e.preventDefault()
    if (!stockTargetProduct) return
    try {
      await adminApi.updateStock(stockTargetProduct.id, quickStockVal)
      toast.success('Inventory updated')
      setStockModalOpen(false)
      fetchProducts()
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to update stock'))
    }
  }

  const handleDelete = async () => {
    if (!productToDelete) return
    try {
      setDeleting(true)
      await adminApi.deleteProduct(productToDelete.id)
      toast.success('Product deleted')
      setDeleteModalOpen(false)
      setProductToDelete(null)
      fetchProducts()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete product'))
    } finally {
      setDeleting(false)
    }
  }

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map((p) => p.id))
    }
  }

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return
    try {
      await adminApi.bulkUpdateStatus(selectedIds, status)
      toast.success(`Updated ${selectedIds.length} products to ${status}`)
      setSelectedIds([])
      fetchProducts()
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Bulk update failed'))
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Top Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
            Product Catalog & Inventory
          </h2>
          <p className="text-xs text-[#556957] font-medium mt-0.5">
            Manage fresh farm produce, pricing, stock levels, and flags.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#31653a] hover:bg-[#27532f] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#31653a]/25 transition-all"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="admin-glass-panel rounded-3xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search produce name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs sm:text-sm admin-glass-input"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Category Selector */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 rounded-2xl text-xs font-bold admin-glass-input"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category_name}
              </option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 rounded-2xl text-xs font-bold admin-glass-input"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => {
              setLowStockFilter(!lowStockFilter)
              setPage(1)
            }}
            className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              lowStockFilter
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200'
            }`}
          >
            <FiAlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-[#31653a] text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <span className="text-xs font-bold ml-2">
            {selectedIds.length} Products Selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatus('active')}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold"
            >
              Set Active
            </button>
            <button
              onClick={() => handleBulkStatus('inactive')}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold"
            >
              Set Inactive
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-white text-[#31653a] text-xs font-extrabold"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Products Table & Mobile-First List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading product inventory...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center admin-glass-panel rounded-3xl p-8">
          <FiBox className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="font-bold text-gray-700 text-sm">No Products Found</h3>
          <p className="text-xs text-gray-400 mt-1">Try resetting your filters or add new produce.</p>
        </div>
      ) : (
        <div className="admin-glass-panel rounded-3xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="overflow-x-auto admin-custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-white/40 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-[#31653a] focus:ring-0"
                    />
                  </th>
                  <th className="py-3.5 px-3">Produce Item</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Unit Price</th>
                  <th className="py-3.5 px-3 text-center">Stock</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {products.map((p) => {
                  const isLow = p.stock <= 5
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-white/60 transition-colors ${
                        selectedIds.includes(p.id) ? 'bg-green-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelectOne(p.id)}
                          className="rounded text-[#31653a] focus:ring-0"
                        />
                      </td>

                      {/* Product Thumbnail & Details */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getProductImageSrc(p.product_image)}
                            alt={p.product_name}
                            className="w-12 h-12 rounded-2xl object-cover bg-[#eaf3eb] border border-white shadow-xs shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_PRODUCT_IMAGE
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-sm text-[#17301c] truncate">{p.product_name}</p>
                              {p.is_popular && (
                                <span className="p-0.5 text-amber-500" title="Best Seller">
                                  <FiStar className="w-3.5 h-3.5 fill-current" />
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 font-semibold">{p.weight}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="text-xs text-gray-600 font-semibold">
                          {p.category?.category_name || 'General'}
                        </span>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[#17301c] text-sm">
                            ₹{parseFloat(p.price).toFixed(2)}
                          </span>
                          {p.discount_price && (
                            <span className="line-through text-[10px] text-gray-400 font-semibold">
                              ₹{parseFloat(p.discount_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Level with Quick Editor */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setStockTargetProduct(p)
                            setQuickStockVal(p.stock)
                            setStockModalOpen(true)
                          }}
                          className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl border transition-all ${
                            isLow
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : 'bg-[#eaf3eb] text-[#31653a] border-[#31653a]/20 hover:bg-[#d8ebd9]'
                          }`}
                          title="Click to edit stock"
                        >
                          {p.stock} units
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            p.status === 'active'
                              ? 'bg-[#eaf3eb] text-[#31653a] border-[#31653a]/20'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {p.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-xl text-gray-600 hover:bg-white hover:text-[#31653a] transition-colors"
                          title="Edit Product"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setProductToDelete(p)
                            setDeleteModalOpen(true)
                          }}
                          className="p-1.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete Product"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs font-bold text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Quick Stock Editor Modal */}
      {stockModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-xs admin-glass-modal rounded-3xl p-5 shadow-2xl">
            <h3 className="font-extrabold text-sm text-[#17301c]">Update Stock</h3>
            <p className="text-xs text-gray-500 mt-0.5">{stockTargetProduct?.product_name}</p>

            <form onSubmit={handleSaveQuickStock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Available Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quickStockVal}
                  onChange={(e) => setQuickStockVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-base font-bold text-center admin-glass-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#31653a] hover:bg-[#27532f] shadow-sm"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto admin-custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-black text-lg text-[#17301c]">
                {editingProduct ? 'Edit Product Item' : 'Add New Farm Produce'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 mt-5 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Product Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Country Tomatoes"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Selling Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="45.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Original Price (₹) <span className="text-gray-400 text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="55.00"
                    value={formData.discount_price}
                    onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Pack Size
                  </label>
                  <input
                    type="text"
                    placeholder="0.5 Kg / 500 ml / 1 Bunch"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Stock and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm"
                  >
                    <option value="active">Active (Visible in App)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Image Uploader */}
              <AdminImageUpload
                label="Product Photographs"
                values={formData.images}
                onChange={(images) => setFormData({ ...formData, images })}
                maxImages={3}
              />

              {/* Freshness and Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Freshness Guarantee Info
                </label>
                <input
                  type="text"
                  placeholder="Harvested at 5:00 AM from Pollachi farm."
                  value={formData.freshness_info}
                  onChange={(e) => setFormData({ ...formData, freshness_info: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Product Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Describe farm origin, taste, and culinary use..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl admin-glass-input text-xs sm:text-sm"
                ></textarea>
              </div>

              {/* Badges Checkboxes */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_popular}
                    onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                    className="w-4 h-4 rounded text-[#31653a] focus:ring-0"
                  />
                  <span className="text-xs font-bold text-gray-700">Mark as Best Seller / Popular</span>
                </label>
              </div>

              {/* Actions */}
              <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#31653a] hover:bg-[#27532f] shadow-md shadow-[#31653a]/25"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Produce"
        message={`Are you sure you want to delete '${productToDelete?.product_name}'?`}
        confirmText="Delete"
        isDanger={true}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false)
          setProductToDelete(null)
        }}
      />
    </div>
  )
}
