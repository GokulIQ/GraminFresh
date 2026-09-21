import { useRef, useState } from 'react'
import { FiLink, FiUploadCloud, FiX } from 'react-icons/fi'
import { adminApi } from '../../api/adminApi'
import toast from 'react-hot-toast'

const FALLBACK_PRODUCT_IMAGE = '/images/products/cow-milk.jpg'

function getImagePreviewSrc(imagePath) {
  if (!imagePath) return FALLBACK_PRODUCT_IMAGE
  if (/^(https?:|data:|blob:)/i.test(imagePath)) return imagePath
  if (imagePath.startsWith('/static/')) {
    return `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')}${imagePath}`
  }
  return imagePath.startsWith('/') ? imagePath : `/${imagePath}`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export default function AdminImageUpload({
  label = 'Product Photographs',
  values = [],
  onChange,
  maxImages = 3,
}) {
  const [isUrlMode, setIsUrlMode] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const images = Array.isArray(values) ? values.filter(Boolean).slice(0, maxImages) : []
  const hasSpace = images.length < maxImages

  const addImages = (newImages) => {
    const combined = [...images, ...newImages.filter(Boolean)]
    const uniqueImages = [...new Set(combined)].slice(0, maxImages)
    onChange(uniqueImages)
  }

  const handleFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (!selectedFiles.length) return

    const availableSlots = maxImages - images.length
    const validFiles = selectedFiles.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`)
        return false
      }
      return true
    }).slice(0, availableSlots)

    if (!validFiles.length) {
      event.target.value = ''
      return
    }

    if (selectedFiles.length > availableSlots) {
      toast(`Only ${availableSlots} more image${availableSlots === 1 ? '' : 's'} can be added`)
    }

    try {
      setUploading(true)
      const uploadedImages = await Promise.all(validFiles.map(async (file) => {
        const imageData = await readFileAsDataUrl(file)
        try {
          const response = await adminApi.uploadImage(imageData, file.name)
          return response.data.url
        } catch {
          return imageData
        }
      }))
      addImages(uploadedImages)
      toast.success(`${uploadedImages.length} image${uploadedImages.length === 1 ? '' : 's'} added`)
    } catch (error) {
      toast.error(error.message || 'Unable to add images')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleUrlApply = () => {
    const imageUrl = urlInput.trim()
    if (!imageUrl) return
    if (!hasSpace) {
      toast.error(`A product can have up to ${maxImages} images`)
      return
    }
    addImages([imageUrl])
    setUrlInput('')
    toast.success('Image URL added')
  }

  const removeImage = (imageToRemove) => {
    onChange(images.filter((image) => image !== imageToRemove))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-xs font-bold text-gray-700">
          {label} <span className="text-gray-400 font-medium">({images.length}/{maxImages})</span>
        </label>
        {hasSpace && (
          <button
            type="button"
            onClick={() => setIsUrlMode(!isUrlMode)}
            className="text-[11px] font-semibold text-[#31653a] hover:underline flex items-center gap-1"
          >
            {isUrlMode ? <FiUploadCloud className="w-3.5 h-3.5" /> : <FiLink className="w-3.5 h-3.5" />}
            <span>{isUrlMode ? 'Switch to Upload' : 'Enter URL instead'}</span>
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-500">The first image is the main product photo. Add up to {maxImages} images.</p>

      {isUrlMode && hasSpace && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/product.jpg"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-xs admin-glass-input"
          />
          <button
            type="button"
            onClick={handleUrlApply}
            className="px-3 py-2 rounded-xl bg-[#31653a] text-white text-xs font-bold shadow-sm hover:bg-[#27532f]"
          >
            Add
          </button>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image, index) => (
            <div key={image} className="relative group rounded-xl overflow-hidden border border-[#31653a]/25 bg-green-50/40 aspect-square">
              <img
                src={getImagePreviewSrc(image)}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(event) => { event.currentTarget.src = FALLBACK_PRODUCT_IMAGE }}
              />
              {index === 0 && (
                <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded bg-[#17301c]/85 text-white text-[9px] font-bold">Main</span>
              )}
              <button
                type="button"
                onClick={() => removeImage(image)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white text-red-600 shadow-sm hover:bg-red-50"
                aria-label={`Remove product image ${index + 1}`}
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {hasSpace && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-300 hover:border-[#31653a] rounded-2xl p-4 text-center cursor-pointer bg-white/50 hover:bg-[#eaf3eb]/40 transition-colors disabled:cursor-wait"
        >
          {uploading ? (
            <div className="py-1 flex flex-col items-center">
              <div className="w-6 h-6 border-2 border-[#31653a] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500 font-medium mt-1">Uploading images...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-[#eaf3eb] text-[#31653a] flex items-center justify-center">
                <FiUploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-gray-700">Click to upload up to {maxImages - images.length} more image{maxImages - images.length === 1 ? '' : 's'}</p>
              <p className="text-[10px] text-gray-400">PNG, JPG, WEBP up to 5MB each</p>
            </div>
          )}
        </button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  )
}
