import { useState, useEffect } from 'react'
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiBox,
  FiX,
  FiGrid,
} from 'react-icons/fi'
import { adminApi, extractErrorMessage } from '../../api/adminApi'
import AdminImageUpload from '../../components/admin/AdminImageUpload'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import toast from 'react-hot-toast'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formName, setFormName] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formStatus, setFormStatus] = useState('active')
  const [saving, setSaving] = useState(false)

  // Delete Confirm State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getCategories({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        page_size: 12,
      })
      setCategories(res.data.items || [])
      setTotalPages(res.data.total_pages || 1)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load categories'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [search, statusFilter, page])

  const openAddModal = () => {
    setEditingCategory(null)
    setFormName('')
    setFormImage('')
    setFormStatus('active')
    setModalOpen(true)
  }

  const openEditModal = (cat) => {
    setEditingCategory(cat)
    setFormName(cat.category_name)
    setFormImage(cat.category_image)
    setFormStatus(cat.status)
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error('Please enter a category name')
      return
    }
    if (!formImage.trim()) {
      toast.error('Please provide or upload a category image')
      return
    }

    try {
      setSaving(true)
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, {
          category_name: formName.trim(),
          category_image: formImage.trim(),
          status: formStatus,
        })
        toast.success('Category updated successfully')
      } else {
        await adminApi.createCategory({
          category_name: formName.trim(),
          category_image: formImage.trim(),
          status: formStatus,
        })
        toast.success('Category created successfully')
      }
      setModalOpen(false)
      fetchCategories()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save category'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (cat) => {
    try {
      await adminApi.toggleCategoryStatus(cat.id)
      toast.success(`Category set to ${cat.status === 'active' ? 'Inactive' : 'Active'}`)
      fetchCategories()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update status'))
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    try {
      setDeleting(true)
      await adminApi.deleteCategory(categoryToDelete.id)
      toast.success('Category deleted successfully')
      setDeleteModalOpen(false)
      setCategoryToDelete(null)
      fetchCategories()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Cannot delete category'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17301c] tracking-tight">
            Category Management
          </h2>
          <p className="text-xs text-[#556957] font-medium mt-0.5">
            Organize farm catalog hierarchy, icons, and status.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#31653a] hover:bg-[#27532f] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#31653a]/25 transition-all"
        >
          <FiPlus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="admin-glass-panel rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs sm:text-sm admin-glass-input"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto p-1 bg-gray-100/80 rounded-2xl">
          {[
            { label: 'All', value: '' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value)
                setPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-white text-[#31653a] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Grid (Mobile-First Cards) */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#31653a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center admin-glass-panel rounded-3xl p-8">
          <FiGrid className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="font-bold text-gray-700 text-sm">No Categories Found</h3>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or add a new category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="admin-glass-card rounded-3xl p-4 flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#eaf3eb] border border-white shadow-xs shrink-0">
                  <img
                    src={cat.category_image}
                    alt={cat.category_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200'
                    }}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(cat)}
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border transition-all ${
                      cat.status === 'active'
                        ? 'bg-[#eaf3eb] text-[#31653a] border-[#31653a]/20 hover:bg-[#d8ebd9]'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {cat.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <h3 className="font-extrabold text-base text-[#17301c] truncate">
                  {cat.category_name}
                </h3>
                <p className="text-xs text-gray-500 font-semibold flex items-center gap-1 mt-0.5">
                  <FiBox className="w-3.5 h-3.5 text-[#31653a]" />
                  <span>{cat.product_count || 0} Products</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(cat)}
                  className="p-2 rounded-xl text-gray-600 hover:bg-white hover:text-[#31653a] transition-colors"
                  title="Edit category"
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCategoryToDelete(cat)
                    setDeleteModalOpen(true)
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete category"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
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

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-md admin-glass-modal rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-[#17301c]">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Vegetables, Dairy & Milk"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm admin-glass-input"
                />
              </div>

              {/* Image Upload Component */}
              <AdminImageUpload
                label="Category Thumbnail"
                value={formImage}
                onChange={(val) => setFormImage(val)}
              />

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Publication Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm admin-glass-input"
                >
                  <option value="active">Active (Visible to customers)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
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
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#31653a] hover:bg-[#27532f] shadow-md shadow-[#31653a]/25"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Category"
        message={`Are you sure you want to delete category '${categoryToDelete?.category_name}'? If it contains products, deletion will be blocked.`}
        confirmText="Delete"
        isDanger={true}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false)
          setCategoryToDelete(null)
        }}
      />
    </div>
  )
}
