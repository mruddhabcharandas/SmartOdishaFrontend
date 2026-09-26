import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ImageUpload from '../../components/ImageUpload'
import ConfirmModal from '../../components/ConfirmModal'

export default function AdminHeroSlides() {
  const { notify } = useToast()
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', link: '', url: '', publicId: '' })
  const [creating, setCreating] = useState(false)
  const [slideToDelete, setSlideToDelete] = useState(null)

  const loadSlides = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/hero-slides')
      setSlides(res.data)
    } catch (err) {
      console.error(err)
      notify('Failed to load hero slides', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSlides()
  }, [])

  const handleCreateSlide = async (e) => {
    e.preventDefault()
    if (!form.url || !form.publicId) {
      notify('Please upload an image first', 'error')
      return
    }

    setCreating(true)
    try {
      await api.post('/api/admin/hero-slides', {
        title: form.title,
        link: form.link,
        image: {
          url: form.url,
          publicId: form.publicId
        }
      })
      notify('Hero slide created successfully', 'success')
      setForm({ title: '', link: '', url: '', publicId: '' })
      loadSlides()
    } catch (err) {
      console.error(err)
      notify('Failed to create hero slide', 'error')
    } finally {
      setCreating(false)
    }
  }

  const confirmDeleteSlide = async (password) => {
    if (!slideToDelete) return
    try {
      await api.delete(`/api/admin/hero-slides/${slideToDelete._id}`, {
        headers: { 'X-Action-Password': password },
        data: { password }
      })
      notify('Hero slide deleted successfully', 'success')
      setSlideToDelete(null)
      loadSlides()
    } catch (err) {
      console.error(err)
      notify(err?.response?.data?.error || 'Failed to delete hero slide', 'error')
      throw err
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border rounded-3xl p-6 h-96 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Manage Hero Slides</h2>
        <p className="text-sm text-gray-500 font-medium">Add, list, and delete custom hero slides displayed on the main homepage banner carousel.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-blue-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Add New Slide</h3>
            <form onSubmit={handleCreateSlide} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Slide Title (Optional)</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Festival Season Sale"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Redirect Link (Optional)</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. /products?category=electronics"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Slide Image Banner</label>
                <div className="flex flex-col gap-3">
                  {form.url ? (
                    <div className="relative border rounded-2xl overflow-hidden aspect-[21/9] bg-gray-50">
                      <img src={form.url} alt="Slide Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, url: '', publicId: '' })}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow hover:bg-red-600 transition-all text-xs"
                      >
                        &times; Remove
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-300 rounded-2xl p-6 text-center text-sm text-gray-400 bg-gray-50">
                      Upload banner image (recommended: 1200x500 px)
                    </div>
                  )}
                  <div className="flex justify-end">
                    <ImageUpload onUploaded={(url, key) => setForm({ ...form, url, publicId: key })} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !form.url}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50"
              >
                {creating ? 'Saving...' : 'Upload & Create Slide'}
              </button>
            </form>
          </div>
        </div>

        {/* Slides Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Current Active Slides</h3>
          <div className="grid grid-cols-1 gap-6">
            {slides.length > 0 ? (
              slides.map((slide) => (
                <div key={slide._id} className="bg-white border border-blue-50 rounded-3xl p-5 flex flex-col md:flex-row gap-5 shadow-sm hover:shadow-md transition-all">
                  <div className="w-full md:w-56 aspect-[21/9] rounded-2xl overflow-hidden bg-gray-100 border border-gray-50">
                    <img src={slide.image?.url} alt={slide.title || 'Slide'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-extrabold text-gray-900 text-base">{slide.title || 'Untitled Banner'}</div>
                      {slide.link && (
                        <div className="text-xs text-indigo-600 font-bold mt-1">Redirect: {slide.link}</div>
                      )}
                      <div className="text-[10px] text-gray-400 font-mono mt-1">Key: {slide.image?.publicId}</div>
                    </div>
                    <div className="flex justify-end mt-4 md:mt-0">
                      <button
                        onClick={() => setSlideToDelete(slide)}
                        className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:border-red-300 transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete Slide
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-blue-50 rounded-3xl p-12 text-center text-gray-500 italic">
                No hero slides found. Upload a banner slide to display on the user homepage carousel.
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!slideToDelete}
        title="Delete Hero Slide"
        message={`Are you sure you want to delete the hero slide "${slideToDelete?.title || 'Untitled'}"? It will also be removed from Cloudinary.`}
        confirmText="Delete Slide"
        onConfirm={confirmDeleteSlide}
        onClose={() => setSlideToDelete(null)}
      />
    </div>
  )
}
